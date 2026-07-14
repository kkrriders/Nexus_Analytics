from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class Platform(str, Enum):
    google_ads = "google_ads"
    meta_ads = "meta_ads"
    linkedin_ads = "linkedin_ads"
    tiktok_ads = "tiktok_ads"


class CampaignStatus(str, Enum):
    active = "active"
    paused = "paused"
    review = "review"
    draft = "draft"


class HealthCategory(str, Enum):
    excellent = "excellent"
    healthy = "healthy"
    needs_attention = "needs_attention"
    poor = "poor"
    critical = "critical"


class AlertSeverity(str, Enum):
    critical = "critical"
    warning = "warning"
    info = "info"


class TrendDirection(str, Enum):
    up = "up"
    down = "down"
    flat = "flat"


class Campaign(BaseModel):
    id: str
    name: str
    platform: Platform
    status: CampaignStatus
    budget: float
    start_date: str
    target_audience: str


class RawMetrics(BaseModel):
    impressions: int
    clicks: int
    spend: float
    revenue: float
    conversions: int


class DerivedMetrics(BaseModel):
    impressions: int
    clicks: int
    spend: float
    revenue: float
    conversions: int
    ctr: float
    cpc: float
    cpm: float
    cpa: float
    roas: float
    conversion_rate: float
    profit: float
    budget_utilization: float


class HealthFactor(BaseModel):
    name: str
    score: float
    weight: float
    status: str  # "good" | "warning" | "critical"


class CampaignHealth(BaseModel):
    score: float
    category: HealthCategory
    factors: List[HealthFactor]


class TimeSeriesPoint(BaseModel):
    date: str
    label: str
    spend: float
    revenue: float
    roas: float
    ctr: float
    cpa: float
    conversions: int
    clicks: int
    impressions: int


class MetricForecast(BaseModel):
    metric: str
    label: str
    icon: str
    current: float
    forecast_30d: float
    confidence: float
    trend: TrendDirection
    unit: str  # "currency" | "percent" | "multiplier" | "number"


class Alert(BaseModel):
    id: str
    severity: AlertSeverity
    campaign_id: str
    campaign_name: str
    message: str
    detail: str
    timestamp: str


class Recommendation(BaseModel):
    id: str
    campaign_id: str
    campaign_name: str
    type: str
    title: str
    description: str
    roas_impact: float          # % change vs current ROAS, derived from real metrics/benchmarks
    revenue_impact: float       # % change vs current revenue
    cpa_impact: float           # % change vs current CPA (negative = improvement)
    revenue_impact_dollars: float = 0.0  # same projection, in dollars — the number a non-technical user reads first
    cpa_impact_dollars: float = 0.0      # dollars saved (negative) or added cost (positive) per period
    confidence: float
    priority: str  # "high" | "medium" | "low"
    status: Optional[str] = None  # "approved" | "rejected" | None (pending)


class ProcessedCampaign(BaseModel):
    campaign: Campaign
    metrics: DerivedMetrics
    prev_metrics: Optional[DerivedMetrics]
    health: CampaignHealth
    trend_direction: TrendDirection
    history: List[TimeSeriesPoint]
    sparkline: List[float]


class PlatformSummary(BaseModel):
    platform: Platform
    display_name: str
    icon: str
    color: str
    spend: float
    revenue: float
    roas: float
    ctr: float
    conversions: int
    health_score: float


class KPISet(BaseModel):
    total_spend: float
    total_revenue: float
    total_conversions: int
    blended_roas: float
    average_cpa: float
    average_ctr: float
    total_profit: float
    ai_health_score: float


class KPIChanges(BaseModel):
    spend_change: float
    revenue_change: float
    roas_change: float
    cpa_change: float
    ctr_change: float
    conversions_change: float
    profit_change: float
    health_score_change: float


class DashboardData(BaseModel):
    kpis: KPISet
    kpi_changes: KPIChanges
    campaigns: List[ProcessedCampaign]
    platforms: List[PlatformSummary]
    alerts: List[Alert]
    recommendations: List[Recommendation]
    forecasts: List[MetricForecast]
    trend_history: List[TimeSeriesPoint]
    last_updated: str
    next_update_in_seconds: int
    window_seed: int


# ── Audience Analytics ─────────────────────────────────────────────────────────

class AgeGroup(BaseModel):
    label: str
    pct: float
    reach_m: float


class DeviceSlice(BaseModel):
    label: str
    pct: float


class GeoRow(BaseModel):
    country: str
    code: str
    pct: float
    reach_m: float


class RegionRow(BaseModel):
    region: str
    pct: float
    reach_m: float


class AudienceData(BaseModel):
    total_unique_reach_m: float
    primary_demographic: str
    audience_quality_score: float
    reach_change_pct: float
    age_groups: List[AgeGroup]
    device_split: List[DeviceSlice]
    geo_distribution: List[GeoRow]
    region_distribution: List[RegionRow]
    targeted_interests: List[str]  # real ad-set targeting, not a guessed affinity score
    last_updated: str


# ── Keyword Analytics ──────────────────────────────────────────────────────────

class Keyword(BaseModel):
    keyword: str
    status: str  # "active" | "paused"
    volume: int
    ctr: float
    cpc: float
    quality_score: int
    trend: str  # "up" | "flat" | "down"
    campaign: str


class HeatmapCell(BaseModel):
    label: str
    pct: float


class KeywordData(BaseModel):
    total_search_volume: int
    avg_ctr: float
    avg_quality_score: float
    ctr_change_pct: float
    keywords: List[Keyword]
    heatmap: List[HeatmapCell]
    last_updated: str


# ── Budget Optimizer ───────────────────────────────────────────────────────────
# Every number here is arithmetic on this account's own real campaign metrics —
# no fitted curves, no industry-average assumptions, nothing invented.

class MisallocatedSpend(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: Platform
    spend: float
    roas: float
    best_roas: float             # this account's own best-performing active campaign
    opportunity_cost: float      # spend * (best_roas - roas) — real, derived, not a guess


class BudgetAllocation(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: Platform
    current_spend: float
    roas: float
    suggested_spend: float
    projected_revenue: float     # suggested_spend * roas


class BudgetOptimizerData(BaseModel):
    total_budget: float
    misallocated: List[MisallocatedSpend]
    total_opportunity_cost: float
    allocation: List[BudgetAllocation]
    current_revenue_at_budget: float   # what this budget earns spent as it is today
    projected_revenue: float           # what it would earn under the suggested allocation
    projected_uplift: float            # projected_revenue - current_revenue_at_budget
    last_updated: str


# ── Spend Analytics (all-time) ────────────────────────────────────────────────

class SpendDayPoint(BaseModel):
    date: str
    label: str
    spend: float
    revenue: float


class CampaignSpend(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: str
    spend: float
    revenue: float


class PlatformSpend(BaseModel):
    platform: Platform
    display_name: str
    color: str
    spend: float
    revenue: float


class SpendAnalytics(BaseModel):
    total_spend_all_time: float
    total_revenue_all_time: float
    total_conversions_all_time: int
    blended_roas_all_time: float
    tracking_since: str
    days_tracked: int
    avg_daily_spend: float
    highest_spend_day: str
    highest_spend_day_amount: float
    daily_series: List[SpendDayPoint]
    by_campaign: List[CampaignSpend]
    by_platform: List[PlatformSpend]
    last_updated: str


# ── Creative Analytics ─────────────────────────────────────────────────────────

class CreativeMetric(BaseModel):
    label: str
    value: str
    dir: str  # "up" | "down" | "flat"


class Creative(BaseModel):
    id: str
    title: str
    campaign: str
    type: str       # "image" | "video" | "carousel"
    thumb_icon: str
    thumbnail_url: str = ""
    badge_label: str
    badge_tone: str
    fatigue_score: float
    ctr: float
    conversion_rate: float
    ai_recommendation: str
    rec_score: str
    rec_score_tone: str
    rec_box_class: str
    metrics: List[CreativeMetric]


class CreativeData(BaseModel):
    creatives: List[Creative]
    last_updated: str
