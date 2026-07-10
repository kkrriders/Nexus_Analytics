"""
Rule-based recommendation engine.
Each rule inspects campaign metrics and emits a structured Recommendation
if conditions are met. Rules are deterministic — no LLM involved, and every
impact number below is computed from this campaign's real metrics against
its platform's benchmark targets (scoring/campaign_health_score.BENCHMARKS),
never a hardcoded guess. The AI layer (DeepSeek) only rewrites description
text afterward — it never generates the numbers.
"""
import uuid
from typing import List
from models.schemas import Recommendation, DerivedMetrics, Campaign, Platform
from scoring.campaign_health_score import BENCHMARKS, _score_factor


def _rec(campaign: Campaign, **kwargs) -> Recommendation:
    defaults = dict(roas_impact=0.0, revenue_impact=0.0, cpa_impact=0.0,
                     revenue_impact_dollars=0.0, cpa_impact_dollars=0.0)
    defaults.update(kwargs)
    return Recommendation(
        id=f"rec_{campaign.id}_{uuid.uuid4().hex[:6]}",
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        **defaults,
    )


def _confidence(score: float) -> float:
    """Map a 0-100 health-factor score onto a 50-95 confidence range — reuses
    the same scoring the Campaign Health card already shows, so a recommendation's
    confidence is never disconnected from why it fired."""
    return round(min(95.0, max(50.0, 50 + score / 100 * 45)), 1)


def generate_recommendations(campaign: Campaign, metrics: DerivedMetrics) -> List[Recommendation]:
    if metrics.spend == 0:
        return []

    bm = BENCHMARKS.get(campaign.platform, BENCHMARKS[Platform.google_ads])
    recs: List[Recommendation] = []

    # ── Budget scaling — already beating its ROAS target and near budget limit ──
    if metrics.roas >= bm["roas_good"] and metrics.budget_utilization >= 80:
        extra_spend_pct = 25.0
        extra_spend = metrics.spend * extra_spend_pct / 100
        revenue_dollars = round(extra_spend * metrics.roas, 2)
        revenue_pct = round(revenue_dollars / metrics.revenue * 100, 1) if metrics.revenue > 0 else 0.0
        roas_score, _ = _score_factor(metrics.roas, bm["roas_good"], bm["roas_warn"], higher_is_better=True)
        recs.append(_rec(campaign,
            type="budget", priority="high",
            title="Scale budget — high ROAS campaign near limit",
            description=(
                f"{campaign.name} is returning {metrics.roas:.1f}x ROAS with "
                f"{metrics.budget_utilization:.0f}% of budget spent. Increasing budget by "
                f"{extra_spend_pct:.0f}% (+${extra_spend:,.0f}) would add an estimated "
                f"${revenue_dollars:,.0f} in revenue this period if ROAS holds."
            ),
            roas_impact=0.0, revenue_impact=revenue_pct, cpa_impact=0.0,
            revenue_impact_dollars=revenue_dollars, confidence=_confidence(roas_score),
        ))

    # ── Bid modifier — CTR is well above this platform's benchmark ──────────────
    if metrics.ctr > bm["ctr_good"]:
        ctr_gap_pct = round((metrics.ctr - bm["ctr_good"]) / bm["ctr_good"] * 100, 1)
        bid_increase_pct = min(30.0, round(ctr_gap_pct / 2, 1))
        extra_spend = metrics.spend * bid_increase_pct / 100
        revenue_dollars = round(extra_spend * metrics.roas, 2)
        revenue_pct = round(revenue_dollars / metrics.revenue * 100, 1) if metrics.revenue > 0 else 0.0
        ctr_score, _ = _score_factor(metrics.ctr, bm["ctr_good"], bm["ctr_warn"], higher_is_better=True)
        recs.append(_rec(campaign,
            type="bidding", priority="high",
            title=f"Increase bid by {bid_increase_pct:.0f}% — CTR beating benchmark",
            description=(
                f"CTR is {metrics.ctr:.1f}% vs a {bm['ctr_good']:.1f}% benchmark for "
                f"{campaign.platform.value.replace('_', ' ').title()} — {ctr_gap_pct:.0f}% above target. "
                f"Testing a {bid_increase_pct:.0f}% bid increase on this campaign is projected to add "
                f"${revenue_dollars:,.0f} in revenue this period if ROAS holds."
            ),
            roas_impact=0.0, revenue_impact=revenue_pct, cpa_impact=0.0,
            revenue_impact_dollars=revenue_dollars, confidence=_confidence(ctr_score),
        ))

    # ── Creative fatigue — CTR below benchmark on meaningful spend ───────────────
    if metrics.ctr < bm["ctr_warn"] and metrics.spend > 3000:
        target_ctr = bm["ctr_good"]
        recovered_clicks = max(0.0, (target_ctr - metrics.ctr) / 100 * metrics.impressions)
        conv_rate = metrics.conversion_rate / 100
        revenue_per_conv = metrics.revenue / metrics.conversions if metrics.conversions > 0 else 0.0
        revenue_dollars = round(recovered_clicks * conv_rate * revenue_per_conv, 2)
        revenue_pct = round(revenue_dollars / metrics.revenue * 100, 1) if metrics.revenue > 0 else 0.0
        ctr_score, _ = _score_factor(metrics.ctr, bm["ctr_good"], bm["ctr_warn"], higher_is_better=True)
        recs.append(_rec(campaign,
            type="creative", priority="medium",
            title="Refresh creative assets — CTR below benchmark",
            description=(
                f"CTR of {metrics.ctr:.1f}% is below the {bm['ctr_warn']:.1f}% warning threshold for this "
                f"platform, suggesting creative fatigue. Recovering to the {target_ctr:.1f}% benchmark is "
                f"projected to add ${revenue_dollars:,.0f} in revenue this period."
            ),
            roas_impact=0.0, revenue_impact=revenue_pct, cpa_impact=0.0,
            revenue_impact_dollars=revenue_dollars, confidence=_confidence(100 - ctr_score),
        ))

    # ── Audience/landing page — clicks are healthy but conversion rate is weak ──
    if metrics.conversion_rate < bm["conv_rate_warn"] and metrics.ctr > bm["ctr_good"]:
        target_conv_rate = bm["conv_rate_good"] / 100
        revenue_per_conv = metrics.revenue / metrics.conversions if metrics.conversions > 0 else 0.0
        extra_conversions = max(0.0, metrics.clicks * target_conv_rate - metrics.conversions)
        revenue_dollars = round(extra_conversions * revenue_per_conv, 2)
        revenue_pct = round(revenue_dollars / metrics.revenue * 100, 1) if metrics.revenue > 0 else 0.0
        conv_score, _ = _score_factor(metrics.conversion_rate, bm["conv_rate_good"], bm["conv_rate_warn"], higher_is_better=True)
        recs.append(_rec(campaign,
            type="audience", priority="medium",
            title="Expand audience or review landing page — low conversion rate",
            description=(
                f"Clicks are healthy (CTR {metrics.ctr:.1f}%) but conversion rate is only "
                f"{metrics.conversion_rate:.1f}%, below the {bm['conv_rate_warn']:.1f}% warning threshold. "
                f"Reaching the {bm['conv_rate_good']:.1f}% benchmark is projected to add "
                f"${revenue_dollars:,.0f} in revenue this period."
            ),
            roas_impact=0.0, revenue_impact=revenue_pct, cpa_impact=0.0,
            revenue_impact_dollars=revenue_dollars, confidence=_confidence(100 - conv_score),
        ))

    # ── High CPA — spend is meaningfully above the platform's CPA target ────────
    if metrics.cpa > bm["cpa_warn"] and metrics.conversions > 0:
        cpa_savings_per_conv = metrics.cpa - bm["cpa_good"]
        cpa_dollars = round(-cpa_savings_per_conv * metrics.conversions, 2)  # negative = savings
        cpa_pct = round((bm["cpa_good"] - metrics.cpa) / metrics.cpa * 100, 1)
        cpa_score, _ = _score_factor(metrics.cpa, bm["cpa_good"], bm["cpa_warn"], higher_is_better=False)
        recs.append(_rec(campaign,
            type="keywords" if campaign.platform == Platform.linkedin_ads else "budget",
            priority="medium",
            title="Narrow targeting — CPA above benchmark",
            description=(
                f"CPA of ${metrics.cpa:.0f} exceeds the ${bm['cpa_warn']:.0f} warning threshold for this "
                f"platform. Tightening targeting toward the ${bm['cpa_good']:.0f} benchmark is projected to "
                f"save ${-cpa_dollars:,.0f} this period across {metrics.conversions} conversions."
            ),
            roas_impact=0.0, revenue_impact=0.0, cpa_impact=cpa_pct,
            cpa_impact_dollars=cpa_dollars, confidence=_confidence(100 - cpa_score),
        ))

    # ── Pause underperformer — ROAS is unprofitable on meaningful spend ──────────
    if metrics.roas < bm["roas_warn"] and metrics.spend > 2000:
        roas_score, _ = _score_factor(metrics.roas, bm["roas_good"], bm["roas_warn"], higher_is_better=True)
        recs.append(_rec(campaign,
            type="budget", priority="high",
            title="Consider pausing — ROAS below benchmark",
            description=(
                f"ROAS of {metrics.roas:.2f}x is below the {bm['roas_warn']:.1f}x warning threshold for this "
                f"platform — this campaign is losing ${metrics.spend - metrics.revenue:,.0f} against spend "
                f"this period. Pause and reallocate budget to higher-performing campaigns."
            ),
            roas_impact=0.0, revenue_impact=0.0, cpa_impact=0.0,
            revenue_impact_dollars=round(metrics.revenue - metrics.spend, 2),
            confidence=_confidence(100 - roas_score),
        ))

    priority_order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: priority_order.get(r.priority, 2))
    return recs


def generate_all_recommendations(processed_campaigns: list) -> List[Recommendation]:
    all_recs: List[Recommendation] = []
    for pc in processed_campaigns:
        all_recs.extend(generate_recommendations(pc["campaign"], pc["current_metrics"]))
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_recs.sort(key=lambda r: priority_order.get(r.priority, 2))
    return all_recs
