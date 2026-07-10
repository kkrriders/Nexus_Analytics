"""
Mock data generator — produces realistic advertising data seeded by the current
5-minute time window. Data changes every 5 minutes to simulate live feeds.
When ClickHouse is connected, this module is bypassed entirely.
"""
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List

from models.schemas import Campaign, CampaignStatus, Platform, RawMetrics


# ─── Seeded deterministic random ─────────────────────────────────────────────

def _hash_seed(*factors) -> int:
    """Combine multiple factors into a single integer seed."""
    h = 0
    for f in factors:
        for ch in str(f):
            h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
    return h


def _seeded_rand(seed: int) -> float:
    """Deterministic float in [0, 1) from an integer seed."""
    return random.Random(seed).random()


def _vary(base: float, max_pct: float, seed: int) -> float:
    """Return base ± max_pct% using a seeded random."""
    r = _seeded_rand(seed)
    delta = (r - 0.5) * 2 * max_pct
    return base * (1 + delta)


def current_window_seed() -> int:
    """5-minute window index — increments every 5 minutes."""
    return int(time.time() // (5 * 60))


# ─── Campaign catalogue ───────────────────────────────────────────────────────

BASE_CAMPAIGNS: List[Campaign] = [
    Campaign(id="camp_001", name="Summer Sale 2024",       platform=Platform.google_ads,   status=CampaignStatus.active,  budget=20000, start_date="2024-06-01", target_audience="Shoppers 25-44"),
    Campaign(id="camp_002", name="Brand Awareness Q3",     platform=Platform.meta_ads,     status=CampaignStatus.active,  budget=15000, start_date="2024-07-01", target_audience="Broad 18-54"),
    Campaign(id="camp_003", name="Retargeting Cart Abandon",platform=Platform.google_ads,  status=CampaignStatus.paused,  budget=8000,  start_date="2024-05-15", target_audience="Cart abandoners 30d"),
    Campaign(id="camp_004", name="LinkedIn B2B Q3",        platform=Platform.linkedin_ads, status=CampaignStatus.active,  budget=12000, start_date="2024-07-10", target_audience="C-Level IT, North America"),
    Campaign(id="camp_005", name="TikTok Gen-Z",           platform=Platform.tiktok_ads,   status=CampaignStatus.review,  budget=6000,  start_date="2024-08-01", target_audience="Gen-Z 18-24"),
    Campaign(id="camp_006", name="Holiday 2024",           platform=Platform.meta_ads,     status=CampaignStatus.draft,   budget=25000, start_date="2024-11-15", target_audience="Holiday shoppers 25-54"),
]

# Mathematically consistent base metrics (monthly totals)
_BASE: Dict[str, Dict] = {
    "camp_001": dict(impressions=144481, clicks=7802, spend=14200, revenue=45440, conversions=663),
    "camp_002": dict(impressions=147528, clicks=5311, spend=12800, revenue=33280, conversions=456),
    "camp_003": dict(impressions=75902,  clicks=6224, spend=6100,  revenue=25010, conversions=363),
    "camp_004": dict(impressions=40197,  clicks=2452, spend=10300, revenue=23690, conversions=301),
    "camp_005": dict(impressions=57919,  clicks=4286, spend=4800,  revenue=11040, conversions=210),
    "camp_006": dict(impressions=0,      clicks=0,    spend=0,     revenue=0,     conversions=0),
}

# Prior-period multipliers — used to compute MoM % changes
_PREV_MULT: Dict[str, float] = {
    "camp_001": 0.878,
    "camp_002": 0.845,
    "camp_003": 0.872,
    "camp_004": 0.908,
    "camp_005": 0.821,
    "camp_006": 1.0,
}


# ─── Public generators ────────────────────────────────────────────────────────

def generate_raw_metrics(campaign_id: str, window_seed: int) -> RawMetrics:
    b = _BASE.get(campaign_id, {})
    if not b or b["spend"] == 0:
        return RawMetrics(impressions=0, clicks=0, spend=0, revenue=0, conversions=0)

    def s(field: str) -> int:
        return _hash_seed(window_seed, campaign_id, field)

    return RawMetrics(
        impressions=round(_vary(b["impressions"], 0.020, s("imp"))),
        clicks=     round(_vary(b["clicks"],      0.025, s("clk"))),
        spend=      round(_vary(b["spend"],        0.015, s("spd")) * 100) / 100,
        revenue=    round(_vary(b["revenue"],      0.025, s("rev")) * 100) / 100,
        conversions=round(_vary(b["conversions"],  0.030, s("cnv"))),
    )


def generate_prev_raw_metrics(campaign_id: str) -> RawMetrics:
    b = _BASE.get(campaign_id, {})
    if not b or b["spend"] == 0:
        return RawMetrics(impressions=0, clicks=0, spend=0, revenue=0, conversions=0)
    m = _PREV_MULT.get(campaign_id, 0.9)
    return RawMetrics(
        impressions=round(b["impressions"] * m),
        clicks=     round(b["clicks"]      * m),
        spend=      round(b["spend"]        * m * 100) / 100,
        revenue=    round(b["revenue"]      * m * 100) / 100,
        conversions=round(b["conversions"]  * m),
    )


def generate_daily_history(campaign_id: str, days: int = 30) -> list:
    """Generate `days` daily TimeSeriesPoint-compatible dicts for one campaign."""
    b = _BASE.get(campaign_id, {})
    if not b or b["spend"] == 0:
        return []

    daily = {k: v / 30 for k, v in b.items()}
    now = datetime.utcnow()
    points = []

    for d in range(days - 1, -1, -1):
        dt = now - timedelta(days=d)
        day_key = int(dt.strftime("%Y%m%d"))
        seed = _hash_seed(day_key, campaign_id)

        # Weekday vs weekend seasonality
        is_weekend = dt.weekday() >= 5
        week_mult = 0.72 if is_weekend else 1.08

        # Gradual upward trend over the 30-day window
        trend_mult = 0.85 + (days - d) / days * 0.30

        spend  = _vary(daily["spend"]       * week_mult * trend_mult, 0.12, seed + 1)
        rev    = _vary(daily["revenue"]     * week_mult * trend_mult, 0.15, seed + 2)
        clicks = _vary(daily["clicks"]      * week_mult * trend_mult, 0.10, seed + 3)
        impr   = _vary(daily["impressions"] * week_mult * trend_mult, 0.10, seed + 4)
        conv   = _vary(daily["conversions"] * week_mult * trend_mult, 0.14, seed + 5)

        spend  = max(spend,  0.01)
        conv   = max(conv,   0.01)
        impr   = max(impr,   1)
        clicks = max(clicks, 0.01)

        points.append({
            "date":        dt.strftime("%Y-%m-%d"),
            "label":       f"{dt.strftime('%b')} {dt.day}",
            "spend":       round(spend * 100)  / 100,
            "revenue":     round(rev   * 100)  / 100,
            "roas":        round(rev / spend,  2),
            "ctr":         round(clicks / impr * 100, 2),
            "cpa":         round(spend / conv,  2),
            "conversions": round(conv),
            "clicks":      round(clicks),
            "impressions": round(impr),
        })

    return points


def generate_aggregated_history(days: int = 30) -> list:
    """Sum history across all active/review campaigns for the dashboard chart."""
    active_ids = [c.id for c in BASE_CAMPAIGNS if c.status in (CampaignStatus.active, CampaignStatus.review)]
    histories = {cid: generate_daily_history(cid, days) for cid in active_ids}

    now = datetime.utcnow()
    points = []

    for d in range(days - 1, -1, -1):
        dt = now - timedelta(days=d)
        day_str = dt.strftime("%Y-%m-%d")

        spend = rev = clicks = impr = conv = 0.0
        for cid in active_ids:
            for pt in histories[cid]:
                if pt["date"] == day_str:
                    spend += pt["spend"]
                    rev   += pt["revenue"]
                    clicks += pt["clicks"]
                    impr  += pt["impressions"]
                    conv  += pt["conversions"]

        spend = max(spend, 0.01)
        conv  = max(conv,  0.01)
        impr  = max(impr,  1)

        label = f"{dt.strftime('%b')} {dt.day}"
        points.append({
            "date":        day_str,
            "label":       label,
            "spend":       round(spend * 100) / 100,
            "revenue":     round(rev   * 100) / 100,
            "roas":        round(rev / spend, 2),
            "ctr":         round(clicks / impr * 100, 2),
            "cpa":         round(spend / conv,  2),
            "conversions": round(conv),
            "clicks":      round(clicks),
            "impressions": round(impr),
        })

    return points


def generate_sparkline(campaign_id: str, metric: str = "revenue", points: int = 12) -> list:
    history = generate_daily_history(campaign_id, points)
    return [pt.get(metric, 0) for pt in history]


