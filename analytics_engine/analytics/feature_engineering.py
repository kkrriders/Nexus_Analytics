"""
Feature engineering — computes all derived metrics from raw impressions/clicks/spend/revenue/conversions.
All functions are pure and stateless.
"""
from models.schemas import RawMetrics, DerivedMetrics


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    return round(numerator / denominator, 4) if denominator > 0 else default


def compute_derived(raw: RawMetrics, budget: float) -> DerivedMetrics:
    ctr              = _safe_div(raw.clicks,      raw.impressions) * 100   # %
    cpc              = _safe_div(raw.spend,        raw.clicks)              # $
    cpm              = _safe_div(raw.spend,        raw.impressions) * 1000  # $ per 1k impr
    cpa              = _safe_div(raw.spend,        raw.conversions)         # $
    roas             = _safe_div(raw.revenue,      raw.spend)               # multiplier
    conversion_rate  = _safe_div(raw.conversions,  raw.clicks) * 100       # %
    profit           = round(raw.revenue - raw.spend, 2)
    budget_util      = _safe_div(raw.spend,        budget) * 100           # %

    return DerivedMetrics(
        impressions=raw.impressions,
        clicks=raw.clicks,
        spend=raw.spend,
        revenue=raw.revenue,
        conversions=raw.conversions,
        ctr=round(ctr, 2),
        cpc=round(cpc, 2),
        cpm=round(cpm, 2),
        cpa=round(cpa, 2),
        roas=round(roas, 2),
        conversion_rate=round(conversion_rate, 2),
        profit=profit,
        budget_utilization=round(budget_util, 1),
    )


def pct_change(current: float, previous: float) -> float:
    """Signed percentage change from previous to current."""
    if previous == 0:
        return 0.0
    return round((current - previous) / abs(previous) * 100, 1)
