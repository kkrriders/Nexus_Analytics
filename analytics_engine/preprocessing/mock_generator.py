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


# ─── Audience Analytics ───────────────────────────────────────────────────────

def generate_audience_data(window_seed: int = 0) -> dict:
    def vf(base, pct_var, key):
        return round(_vary(base, pct_var, _hash_seed(window_seed, "aud", key)), 1)

    reach_m    = vf(8.4,  0.04, "reach")
    quality    = vf(86.0, 0.02, "qual")
    reach_chg  = vf(8.2,  0.08, "rc")

    age_pcts = [vf(35, 0.06, "a18"), vf(58, 0.04, "a25"), vf(42, 0.05, "a35"),
                vf(28, 0.07, "a45"), vf(15, 0.08, "a55")]
    mob = vf(62, 0.04, "mob")
    des = vf(28, 0.06, "des")
    tab = round(max(1.0, 100.0 - mob - des), 1)

    geo_pcts = [vf(42, 0.05, "gus"), vf(18, 0.07, "guk"), vf(12, 0.08, "gca"),
                vf(8,  0.09, "gau"), vf(6,  0.10, "gde")]

    return {
        "total_unique_reach_m":  reach_m,
        "primary_demographic":   "25–34 Tech Professionals",
        "audience_quality_score": quality,
        "reach_change_pct":      reach_chg,
        "age_groups": [
            {"label": lbl, "pct": p, "reach_m": round(reach_m * p / 100, 2)}
            for lbl, p in zip(["18–24", "25–34", "35–44", "45–54", "55+"], age_pcts)
        ],
        "device_split": [
            {"label": "Mobile",  "pct": mob},
            {"label": "Desktop", "pct": des},
            {"label": "Tablet",  "pct": tab},
        ],
        "geo_distribution": [
            {"country": c, "code": code, "pct": p, "reach_m": round(reach_m * p / 100, 2)}
            for (c, code), p in zip(
                [("United States","US"),("United Kingdom","UK"),("Canada","CA"),
                 ("Australia","AU"),("Germany","DE")],
                geo_pcts,
            )
        ],
        "interest_segments": [
            {"label": l, "affinity": a} for l, a in [
                ("Technology","high"),("B2B Software","high"),("Finance","med"),
                ("Marketing","med"),("Analytics","high"),("Cloud Infra","med"),
                ("Data Science","high"),("Automation","med"),
            ]
        ],
        "last_updated": datetime.utcnow().isoformat() + "Z",
    }


# ─── Keyword Analytics ────────────────────────────────────────────────────────

_KW_TEMPLATES = [
    ("enterprise analytics software", "Summer Sale 2024",    14500,  8.4, 12.40, 9, "Active", "up"),
    ("data visualization tool b2b",   "Brand Awareness Q3",  8200,   6.1,  8.75, 7, "Active", "flat"),
    ("cheap reporting dashboard",      "Summer Sale 2024",   42000,  1.2,  3.10, 3, "Paused", "down"),
    ("nexus vs datadog",               "LinkedIn B2B Q3",    3100,  12.5, 15.20, 8, "Active", "up"),
    ("marketing automation platform",  "Brand Awareness Q3", 22000,  5.8,  9.40, 8, "Active", "up"),
    ("campaign analytics saas",        "LinkedIn B2B Q3",    6800,   7.2, 11.50, 9, "Active", "flat"),
    ("b2b lead generation tools",      "TikTok Gen-Z",      18400,  4.6,  6.80, 6, "Paused", "down"),
    ("ad spend optimization",          "Summer Sale 2024",   4200,   9.1, 13.60, 9, "Active", "up"),
]


def generate_keyword_data(window_seed: int = 0) -> dict:
    kws = []
    for i, (kw, camp, vol, ctr, cpc, qs, status, trend) in enumerate(_KW_TEMPLATES):
        seed = _hash_seed(window_seed, "kw", i)
        kws.append({
            "keyword":       kw,
            "status":        status,
            "volume":        round(_vary(vol,  0.04, seed + 1)),
            "ctr":           round(_vary(ctr,  0.06, seed + 2), 2),
            "cpc":           round(_vary(cpc,  0.05, seed + 3), 2),
            "quality_score": min(10, max(1, round(_vary(qs, 0.04, seed + 4)))),
            "trend":         trend,
            "campaign":      camp,
        })

    total_vol = sum(k["volume"] for k in kws)
    avg_ctr   = round(sum(k["ctr"]           for k in kws) / len(kws), 2)
    avg_qs    = round(sum(k["quality_score"] for k in kws) / len(kws), 1)
    ctr_chg   = round(_vary(8.2, 0.10, _hash_seed(window_seed, "kw_cc")), 1)

    hm_bases = [92, 78, 45, 12]
    hm_keys  = ["hm0", "hm1", "hm2", "hm3"]
    heatmap  = [
        {"label": lbl, "pct": round(_vary(b, 0.07, _hash_seed(window_seed, k)))}
        for lbl, b, k in zip(["SaaS","Enterprise","Pricing","Reviews"], hm_bases, hm_keys)
    ]

    return {
        "total_search_volume": total_vol,
        "avg_ctr":             avg_ctr,
        "avg_quality_score":   avg_qs,
        "ctr_change_pct":      ctr_chg,
        "keywords":            kws,
        "heatmap":             heatmap,
        "last_updated":        datetime.utcnow().isoformat() + "Z",
    }


# ─── Creative Analytics ───────────────────────────────────────────────────────

_CREATIVE_TEMPLATES = [
    {
        "id": "cr_001",
        "title": "Summer Sale Promo - Hero Image V2",
        "campaign": "Q3 Awareness",
        "type": "image",
        "thumb_icon": "image",
        "badge_label": "High Fatigue",
        "badge_tone": "bg-error-container text-on-error-container",
        "base_fatigue": 85.0,
        "base_ctr": 1.24,
        "base_cvr": 0.80,
        "ctr_dir": "down",
        "cvr_dir": "down",
        "ai_recommendation": "Visual elements have saturated the current audience segment. Suggest testing a new color palette or updating copy to focus on urgency.",
        "rec_score": "85/100",
        "rec_score_tone": "text-error",
        "rec_box_class": "bg-primary-fixed/20 border border-primary-fixed",
    },
    {
        "id": "cr_002",
        "title": "Platform UI Showcase - Carousel 1",
        "campaign": "Retargeting - High Intent",
        "type": "carousel",
        "thumb_icon": "dashboard",
        "badge_label": "Optimal",
        "badge_tone": "bg-tertiary-container text-on-tertiary-container",
        "base_fatigue": 22.0,
        "base_ctr": 4.82,
        "base_cvr": 3.10,
        "ctr_dir": "up",
        "cvr_dir": "up",
        "ai_recommendation": "Performing exceptionally well. Consider scaling budget by 15% and generating similar variants using the 'Analytics Dashboard' visual motif.",
        "rec_score": "22/100",
        "rec_score_tone": "text-tertiary",
        "rec_box_class": "bg-surface-container-low border border-outline-variant/50",
    },
    {
        "id": "cr_003",
        "title": "User Testimonial Video - Short",
        "campaign": "Social Prospecting",
        "type": "video",
        "thumb_icon": "videocam",
        "badge_label": "Maturing",
        "badge_tone": "bg-surface-variant text-on-surface-variant",
        "base_fatigue": 58.0,
        "base_ctr": 2.15,
        "base_cvr": 1.40,
        "ctr_dir": "flat",
        "cvr_dir": "down",
        "ai_recommendation": "Video hook retains attention but drop-off at 0:08s. Suggest moving the CTA text overlay earlier in the sequence.",
        "rec_score": "58/100",
        "rec_score_tone": "text-on-surface",
        "rec_box_class": "bg-secondary-fixed/20 border border-secondary-fixed",
    },
]


def generate_creative_data(window_seed: int = 0) -> dict:
    creatives = []
    for t in _CREATIVE_TEMPLATES:
        cid   = t["id"]
        ctr   = round(_vary(t["base_ctr"], 0.06, _hash_seed(window_seed, cid, "ctr")), 2)
        cvr   = round(_vary(t["base_cvr"], 0.08, _hash_seed(window_seed, cid, "cvr")), 2)
        fat   = round(_vary(t["base_fatigue"], 0.05, _hash_seed(window_seed, cid, "fat")), 1)
        creatives.append({
            "id":              cid,
            "title":           t["title"],
            "campaign":        t["campaign"],
            "type":            t["type"],
            "thumb_icon":      t["thumb_icon"],
            "badge_label":     t["badge_label"],
            "badge_tone":      t["badge_tone"],
            "fatigue_score":   fat,
            "ctr":             ctr,
            "conversion_rate": cvr,
            "ai_recommendation": t["ai_recommendation"],
            "rec_score":       t["rec_score"],
            "rec_score_tone":  t["rec_score_tone"],
            "rec_box_class":   t["rec_box_class"],
            "metrics": [
                {"label": "CTR",        "value": f"{ctr:.2f}%", "dir": t["ctr_dir"]},
                {"label": "Conv. Rate", "value": f"{cvr:.2f}%", "dir": t["cvr_dir"]},
            ],
        })
    return {
        "creatives":    creatives,
        "last_updated": datetime.utcnow().isoformat() + "Z",
    }
