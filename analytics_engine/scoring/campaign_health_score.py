"""
Campaign Health Score — produces a 0–100 score based on weighted KPI factors.

Score bands:
  95–100 → Excellent
  80–94  → Healthy
  60–79  → Needs Attention
  40–59  → Poor
  <40    → Critical
"""
from models.schemas import CampaignHealth, HealthCategory, HealthFactor, DerivedMetrics, Platform

# Platform-specific benchmark targets
BENCHMARKS = {
    Platform.google_ads: dict(
        ctr_good=4.0, ctr_warn=2.0,
        roas_good=3.5, roas_warn=2.0,
        cpa_good=25.0, cpa_warn=40.0,
        budget_util_good=70.0, budget_util_warn=90.0,
        conv_rate_good=3.5, conv_rate_warn=1.5,
    ),
    Platform.meta_ads: dict(
        ctr_good=3.0, ctr_warn=1.5,
        roas_good=3.0, roas_warn=1.8,
        cpa_good=30.0, cpa_warn=50.0,
        budget_util_good=70.0, budget_util_warn=92.0,
        conv_rate_good=2.5, conv_rate_warn=1.0,
    ),
    Platform.linkedin_ads: dict(
        ctr_good=5.0, ctr_warn=2.5,
        roas_good=2.5, roas_warn=1.5,
        cpa_good=35.0, cpa_warn=60.0,
        budget_util_good=65.0, budget_util_warn=88.0,
        conv_rate_good=2.0, conv_rate_warn=0.8,
    ),
    Platform.tiktok_ads: dict(
        ctr_good=6.0, ctr_warn=3.0,
        roas_good=2.5, roas_warn=1.5,
        cpa_good=25.0, cpa_warn=45.0,
        budget_util_good=70.0, budget_util_warn=92.0,
        conv_rate_good=3.0, conv_rate_warn=1.2,
    ),
}


def _score_factor(value: float, good: float, warn: float, higher_is_better: bool = True) -> tuple[float, str]:
    """Return (0–100 score, status) for a single KPI factor."""
    if higher_is_better:
        if value >= good:
            return 100.0, "good"
        elif value >= warn:
            return round(50 + (value - warn) / (good - warn) * 50, 1), "warning"
        else:
            return round(max(0, value / warn * 50), 1), "critical"
    else:
        # Lower is better (CPA, budget utilization overshoot)
        if value <= good:
            return 100.0, "good"
        elif value <= warn:
            return round(50 + (warn - value) / (warn - good) * 50, 1), "warning"
        else:
            return round(max(0, 50 - (value - warn) / warn * 50), 1), "critical"


def compute_health(metrics: DerivedMetrics, platform: Platform) -> CampaignHealth:
    if metrics.spend == 0:
        return CampaignHealth(score=0, category=HealthCategory.critical, factors=[])

    bm = BENCHMARKS.get(platform, BENCHMARKS[Platform.google_ads])

    factors_def = [
        ("CTR",              metrics.ctr,               bm["ctr_good"],          bm["ctr_warn"],          True,  0.20),
        ("ROAS",             metrics.roas,              bm["roas_good"],         bm["roas_warn"],         True,  0.30),
        ("CPA",              metrics.cpa,               bm["cpa_good"],          bm["cpa_warn"],          False, 0.25),
        ("Conversion Rate",  metrics.conversion_rate,   bm["conv_rate_good"],    bm["conv_rate_warn"],    True,  0.15),
        ("Budget Util.",     metrics.budget_utilization,bm["budget_util_good"],  bm["budget_util_warn"],  False, 0.10),
    ]

    health_factors = []
    weighted_score = 0.0

    for name, value, good, warn, higher_is_better, weight in factors_def:
        score, status = _score_factor(value, good, warn, higher_is_better)
        weighted_score += score * weight
        health_factors.append(HealthFactor(name=name, score=score, weight=weight, status=status))

    final = round(min(100, max(0, weighted_score)), 1)

    if final >= 95:
        category = HealthCategory.excellent
    elif final >= 80:
        category = HealthCategory.healthy
    elif final >= 60:
        category = HealthCategory.needs_attention
    elif final >= 40:
        category = HealthCategory.poor
    else:
        category = HealthCategory.critical

    return CampaignHealth(score=final, category=category, factors=health_factors)
