"""
Chatbot for the dashboard — answers plain-English questions about the same
metrics shown on screen, in basic numerical terms (no jargon-only answers).

Two tiers, tried in order:
  1. Rule-based: keyword-matched against the current DashboardData. Instant,
     deterministic, free — covers the common questions.
  2. Conversational: falls back to DeepSeek (same client as
     ai/deepseek_client.py) for anything the rules don't cover, grounded
     strictly in the same dashboard data so it can't invent numbers.
"""
import json
import logging
import re
from typing import Optional

from models.schemas import DashboardData
from ai.deepseek_client import get_client

logger = logging.getLogger(__name__)


def _inr(value: float) -> str:
    if abs(value) >= 1_000_000:
        return f"₹{value / 1_000_000:.1f}M"
    if abs(value) >= 1_000:
        return f"₹{value / 1_000:.1f}K"
    return f"₹{value:.2f}"


def _best_campaign(dashboard: DashboardData):
    if not dashboard.campaigns:
        return None
    return max(dashboard.campaigns, key=lambda c: c.metrics.roas)


def _worst_campaign(dashboard: DashboardData):
    if not dashboard.campaigns:
        return None
    return min(dashboard.campaigns, key=lambda c: c.health.score)


def answer_rule_based(question: str, dashboard: DashboardData) -> Optional[str]:
    q = question.lower()
    kpis = dashboard.kpis

    if re.search(r"\broas\b|return on ad spend", q):
        return (
            f"Your blended ROAS is {kpis.blended_roas:.2f}x — for every ₹1 you spend "
            f"across all campaigns, you're getting back ₹{kpis.blended_roas:.2f}."
        )

    if "profit" in q:
        return f"Total profit this window is {_inr(kpis.total_profit)}."

    if "revenue" in q:
        return f"Total revenue this window is {_inr(kpis.total_revenue)}."

    if "spend" in q or "budget" in q:
        return f"Total ad spend this window is {_inr(kpis.total_spend)}."

    if re.search(r"\bcpa\b|cost per acquisition|cost per conversion", q):
        return f"Your average cost per acquisition (CPA) is {_inr(kpis.average_cpa)} per conversion."

    if re.search(r"\bctr\b|click.?through", q):
        return f"Your average click-through rate (CTR) is {kpis.average_ctr:.2f}% — that's the share of people who click after seeing an ad."

    if "conversion" in q:
        return f"You've had {kpis.total_conversions:,} conversions this window."

    if "health" in q and ("ai" in q or "score" in q or "platform" in q):
        return f"Your AI health score is {kpis.ai_health_score:.0f} out of 100, based on how well your campaigns are performing overall."

    if re.search(r"best|top performing|winning", q) and "campaign" in q:
        c = _best_campaign(dashboard)
        if c:
            return f"Your best-performing campaign is \"{c.campaign.name}\" with a {c.metrics.roas:.2f}x ROAS and {_inr(c.metrics.revenue)} in revenue."

    if re.search(r"worst|underperform|struggling|poor", q) and "campaign" in q:
        c = _worst_campaign(dashboard)
        if c:
            return f"\"{c.campaign.name}\" needs the most attention right now — its health score is {c.health.score:.0f}/100 ({c.health.category.value})."

    if "alert" in q or "critical" in q:
        critical = [a for a in dashboard.alerts if a.severity.value == "critical"]
        if not critical:
            return "No critical alerts right now — all campaigns are healthy."
        names = ", ".join(a.campaign_name for a in critical[:3])
        return f"You have {len(critical)} critical alert{'s' if len(critical) != 1 else ''} — affecting {names}."

    if "recommend" in q or "suggestion" in q or "should i" in q:
        if dashboard.recommendations:
            r = dashboard.recommendations[0]
            return f"Top recommendation: {r.title} — {r.description}"
        return "No active recommendations right now — everything looks on track."

    if "forecast" in q or "predict" in q or "next month" in q or "next 30" in q:
        rev_forecast = next((f for f in dashboard.forecasts if f.metric == "revenue"), None)
        if rev_forecast:
            direction = "up" if rev_forecast.trend.value == "up" else "down" if rev_forecast.trend.value == "down" else "flat"
            return (
                f"Revenue is forecast to go {direction} from {_inr(rev_forecast.current)} to "
                f"{_inr(rev_forecast.forecast_30d)} over the next 30 days ({rev_forecast.confidence:.0f}% confidence)."
            )

    return None


def answer_conversational(question: str, dashboard: DashboardData) -> str:
    client = get_client()
    if client is None:
        return (
            "I can only answer preset questions right now (try asking about ROAS, spend, "
            "revenue, CPA, CTR, conversions, alerts, or your best/worst campaign) — "
            "the AI assistant isn't configured for open-ended questions yet."
        )

    context = {
        "kpis": dashboard.kpis.model_dump(),
        "top_campaigns": [
            {"name": c.campaign.name, "platform": c.campaign.platform.value, "roas": c.metrics.roas,
             "spend": c.metrics.spend, "revenue": c.metrics.revenue, "health": c.health.score}
            for c in sorted(dashboard.campaigns, key=lambda c: c.metrics.revenue, reverse=True)[:8]
        ],
        "alerts": [{"severity": a.severity.value, "campaign": a.campaign_name, "message": a.message} for a in dashboard.alerts[:5]],
        "top_recommendations": [{"title": r.title, "description": r.description} for r in dashboard.recommendations[:3]],
    }

    system_prompt = (
        "You are a marketing analytics assistant embedded in a dashboard. Answer the user's "
        "question in plain English, using basic numerical terms a non-technical person would "
        "understand (e.g. 'you're getting back ₹3 for every ₹1 spent' instead of just 'ROAS 3.0x'). "
        "All currency is in Indian Rupees (₹). "
        "Only use numbers that appear in the JSON context below — never invent or estimate a figure "
        "that isn't there. If the context doesn't contain what's needed to answer, say so plainly. "
        "Keep answers to 2-4 sentences."
    )

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Dashboard data:\n{json.dumps(context, indent=2)}\n\nQuestion: {question}"},
            ],
            max_tokens=300,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("Chat conversational answer failed: %s", e)
        return "Sorry, I couldn't reach the AI assistant just now — please try again in a moment."


def answer(question: str, dashboard: DashboardData) -> dict:
    rule_answer = answer_rule_based(question, dashboard)
    if rule_answer is not None:
        return {"reply": rule_answer, "source": "rule"}
    return {"reply": answer_conversational(question, dashboard), "source": "ai"}
