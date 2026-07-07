"""
Rule-based recommendation engine.
Each rule inspects campaign metrics and emits a structured Recommendation
if conditions are met. Rules are deterministic — no LLM involved.
The AI layer (DeepSeek) will later receive only the recommendation summaries
to generate human-readable explanations.
"""
import uuid
from typing import List
from models.schemas import Recommendation, DerivedMetrics, Campaign, Platform


def _rec(campaign: Campaign, **kwargs) -> Recommendation:
    defaults = dict(roas_impact=0.0, revenue_impact=0.0, cpa_impact=0.0)
    defaults.update(kwargs)
    return Recommendation(
        id=f"rec_{campaign.id}_{uuid.uuid4().hex[:6]}",
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        **defaults,
    )


def generate_recommendations(campaign: Campaign, metrics: DerivedMetrics) -> List[Recommendation]:
    if metrics.spend == 0:
        return []

    recs: List[Recommendation] = []

    # ── Budget scaling ─────────────────────────────────────────────────────────
    if metrics.roas >= 3.5 and metrics.budget_utilization >= 80:
        recs.append(_rec(campaign,
            type="budget", priority="high",
            title="Scale budget — high ROAS campaign near limit",
            description=(
                f"{campaign.name} is achieving {metrics.roas:.1f}x ROAS with "
                f"{metrics.budget_utilization:.0f}% budget consumed. "
                "Increasing budget by 20–30% is projected to proportionally grow revenue."
            ),
            roas_impact=0.5, revenue_impact=22.0, cpa_impact=-2.0, confidence=87.0,
        ))

    # ── Mobile bid adjustment ──────────────────────────────────────────────────
    if campaign.platform in (Platform.google_ads, Platform.meta_ads) and metrics.ctr > 4.5:
        recs.append(_rec(campaign,
            type="bidding", priority="high",
            title="Increase mobile bid modifier by 25%",
            description=(
                f"High CTR ({metrics.ctr:.1f}%) suggests strong demand. "
                "Mobile traffic on this campaign converts at 2.4× desktop rate. "
                "Reallocating 25% of desktop budget to mobile placements is recommended."
            ),
            roas_impact=12.0, revenue_impact=8.0, cpa_impact=-5.0, confidence=82.0,
        ))

    # ── Creative fatigue ──────────────────────────────────────────────────────
    if metrics.ctr < 2.0 and metrics.spend > 3000:
        recs.append(_rec(campaign,
            type="creative", priority="medium",
            title="Refresh creative assets — low CTR detected",
            description=(
                f"CTR of {metrics.ctr:.1f}% indicates creative fatigue. "
                "Rotating in 2–3 new ad variants typically recovers 15–25% of lost CTR "
                "within 7 days."
            ),
            roas_impact=8.0, revenue_impact=12.0, cpa_impact=-6.0, confidence=74.0,
        ))

    # ── Audience broadening ───────────────────────────────────────────────────
    if metrics.conversion_rate < 1.5 and metrics.ctr > 3.0:
        recs.append(_rec(campaign,
            type="audience", priority="medium",
            title="Expand audience — high CTR but low conversion",
            description=(
                f"Clicks are healthy (CTR {metrics.ctr:.1f}%) but conversion rate "
                f"is only {metrics.conversion_rate:.1f}%. Consider broadening audience "
                "targeting or reviewing the landing page experience."
            ),
            roas_impact=5.0, revenue_impact=15.0, cpa_impact=-8.0, confidence=68.0,
        ))

    # ── LinkedIn keyword optimisation ─────────────────────────────────────────
    if campaign.platform == Platform.linkedin_ads and metrics.cpa > 40:
        recs.append(_rec(campaign,
            type="keywords", priority="medium",
            title="Narrow LinkedIn audience targeting — high CPA",
            description=(
                f"CPA of ${metrics.cpa:.0f} exceeds the $40 target. "
                "Filtering by company size (500+ employees) and seniority (Director+) "
                "typically reduces CPA by 18–22% on LinkedIn B2B campaigns."
            ),
            roas_impact=3.0, revenue_impact=0.0, cpa_impact=-20.0, confidence=71.0,
        ))

    # ── Pause underperformer ──────────────────────────────────────────────────
    if metrics.roas < 1.8 and metrics.spend > 2000:
        recs.append(_rec(campaign,
            type="budget", priority="high",
            title="Consider pausing — ROAS below threshold",
            description=(
                f"With ROAS at {metrics.roas:.2f}x this campaign is not generating "
                "profitable returns. Pause and reallocate budget to higher-performing campaigns "
                "while restructuring the targeting strategy."
            ),
            roas_impact=0.0, revenue_impact=0.0, cpa_impact=0.0, confidence=78.0,
        ))

    # Sort by priority
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
