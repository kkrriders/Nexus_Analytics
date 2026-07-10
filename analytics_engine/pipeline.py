"""
Main analytics pipeline — orchestrates all engine modules.

Data flow (ClickHouse connected):
  mock_generator / ClickHouse raw data
    → feature_engineering
    → campaign_health_score
    → trend_detection
    → anomaly_detection
    → write processed_metrics, alerts, KPI snapshot → ClickHouse
    → DeepSeek reads ClickHouse → generates recommendations
    → write ai_recommendations → ClickHouse
    → forecasting
    → DashboardData response (reads from ClickHouse where available)

Data flow (ClickHouse NOT connected):
  mock_generator
    → feature_engineering → health → trend → anomaly
    → DeepSeek enriches rule-based recommendation descriptions
    → forecasting
    → DashboardData response
"""
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from models.schemas import (
    DashboardData, KPISet, KPIChanges, ProcessedCampaign,
    PlatformSummary, Platform, DerivedMetrics, Recommendation,
    Campaign, CampaignStatus, RawMetrics, CreativeData, AudienceData,
)
from preprocessing.mock_generator import (
    BASE_CAMPAIGNS, current_window_seed,
    generate_raw_metrics, generate_prev_raw_metrics,
    generate_daily_history, generate_aggregated_history, generate_sparkline,
)
from analytics.feature_engineering import compute_derived, pct_change
from scoring.campaign_health_score import compute_health, _score_factor, BENCHMARKS
from trend_analysis.trend_detection import detect_trend
from anomaly_detection.anomaly_detection import generate_all_alerts
from recommendations.recommendation_engine import generate_all_recommendations
from forecasting.revenue_forecast import build_forecasts
from database.clickhouse_client import is_connected
from database.clickhouse_schema import (
    write_processed_metrics, write_kpi_snapshot, write_alerts,
    write_ai_recommendations, read_latest_recommendations,
    has_real_campaigns, read_real_campaigns, read_real_campaign_history,
    read_real_ads, read_real_ad_history, read_real_breakdown,
    read_breakdown_daily_totals, read_targeted_interests,
    MOCK_ACCOUNT_ID,
)
from ai.deepseek_client import enrich_recommendations
from integrations.meta_ads import sync_if_stale

logger = logging.getLogger(__name__)

PLATFORM_META = {
    Platform.google_ads:   dict(display_name="Google Ads",   icon="search",     color="#4F46E5"),
    Platform.meta_ads:     dict(display_name="Meta Ads",     icon="groups",     color="#2563EB"),
    Platform.linkedin_ads: dict(display_name="LinkedIn Ads", icon="work",       color="#06B6D4"),
    Platform.tiktok_ads:   dict(display_name="TikTok Ads",  icon="play_circle", color="#8B5CF6"),
}


def _row_to_point(row: dict) -> dict:
    """Convert one nexus.campaign_metrics_daily row into a TimeSeriesPoint-shaped dict."""
    dt = row.get("date")
    date_str = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
    label = f"{dt.strftime('%b')} {dt.day}" if hasattr(dt, "strftime") else date_str

    impressions = int(row.get("impressions", 0))
    clicks      = int(row.get("clicks", 0))
    spend       = float(row.get("spend", 0))
    revenue     = float(row.get("revenue", 0))
    conv        = int(row.get("conversions", 0))

    return {
        "date": date_str,
        "label": label,
        "spend": round(spend, 2),
        "revenue": round(revenue, 2),
        "roas": round(revenue / spend, 2) if spend > 0 else 0,
        "ctr": round(clicks / impressions * 100, 2) if impressions > 0 else 0,
        "cpa": round(spend / conv, 2) if conv > 0 else 0,
        "conversions": conv,
        "clicks": clicks,
        "impressions": impressions,
    }


def _raw_from_row(row: dict | None) -> RawMetrics:
    if not row:
        return RawMetrics(impressions=0, clicks=0, spend=0, revenue=0, conversions=0)
    return RawMetrics(
        impressions=int(row.get("impressions", 0)),
        clicks=int(row.get("clicks", 0)),
        spend=float(row.get("spend", 0)),
        revenue=float(row.get("revenue", 0)),
        conversions=int(row.get("conversions", 0)),
    )


def _load_real_campaigns(account_id: str):
    """
    Load real ingested ad-account data from ClickHouse for one specific
    account. Returns None when that account has no ad account connected/
    synced yet (caller should fall back to mock).
    """
    if not has_real_campaigns(account_id):
        return None

    camp_rows = read_real_campaigns(account_id)
    if not camp_rows:
        return None

    campaigns: list[Campaign] = []
    history_map: dict[str, list[dict]] = {}
    raw_current: dict[str, RawMetrics] = {}
    raw_prev: dict[str, RawMetrics] = {}
    sparkline_map: dict[str, list[float]] = {}

    for row in camp_rows:
        cid = row["id"]
        campaigns.append(Campaign(
            id=cid,
            name=row["name"],
            platform=Platform(row["platform"]),
            status=CampaignStatus(row["status"]),
            budget=float(row["budget"]),
            start_date=row["start_date"],
            target_audience=row["audience"],
        ))

        daily_rows = read_real_campaign_history(account_id, cid)
        points = [_row_to_point(r) for r in daily_rows]
        history_map[cid] = points

        raw_current[cid] = _raw_from_row(daily_rows[-1] if daily_rows else None)
        raw_prev[cid]    = _raw_from_row(daily_rows[-2] if len(daily_rows) >= 2 else None)

        sp = [p["revenue"] for p in points[-12:]]
        sparkline_map[cid] = sp * 2 if len(sp) == 1 else sp

    return {
        "campaigns": campaigns,
        "history": history_map,
        "raw_current": raw_current,
        "raw_prev": raw_prev,
        "sparkline": sparkline_map,
    }


def _aggregate_real_history(history_map: dict[str, list[dict]], days: int = 30) -> list[dict]:
    """Sum real per-campaign daily history into one aggregated series for forecasting."""
    all_points = [p for points in history_map.values() for p in points]
    all_dates = sorted({p["date"] for p in all_points})[-days:]

    agg = []
    for d in all_dates:
        spend = rev = clicks = impr = conv = 0.0
        for p in all_points:
            if p["date"] == d:
                spend += p["spend"]; rev += p["revenue"]
                clicks += p["clicks"]; impr += p["impressions"]; conv += p["conversions"]

        spend = max(spend, 0.01)
        conv  = max(conv, 0.01)
        impr  = max(impr, 1)

        try:
            dt_obj = datetime.strptime(d, "%Y-%m-%d")
            label = f"{dt_obj.strftime('%b')} {dt_obj.day}"
        except ValueError:
            label = d

        agg.append({
            "date": d, "label": label,
            "spend": round(spend, 2), "revenue": round(rev, 2),
            "roas": round(rev / spend, 2), "ctr": round(clicks / impr * 100, 2),
            "cpa": round(spend / conv, 2), "conversions": round(conv),
            "clicks": round(clicks), "impressions": round(impr),
        })
    return agg


def run_pipeline(account_id: Optional[str] = None, days: int = 30) -> DashboardData:
    """
    account_id identifies the requesting user's own connected ad account
    (None if they haven't connected one). All real-data reads/writes and the
    recommendation/KPI/alert cache are scoped to it so one user's connected
    account is never visible to another user's request.

    `days` bounds how much history feeds the trend charts and each campaign's
    history series (7/30/90 — the TopNav date-range selector); it does not
    change the KPI totals, which always reflect the current pipeline window.
    """
    window_seed = current_window_seed()
    ch_active = is_connected()

    if ch_active and account_id:
        sync_if_stale(account_id)

    real = _load_real_campaigns(account_id) if (ch_active and account_id) else None
    using_real = real is not None
    cache_key = account_id if using_real else MOCK_ACCOUNT_ID

    # ── 1. Generate / fetch raw metrics ──────────────────────────────────────
    campaigns_list = real["campaigns"] if using_real else BASE_CAMPAIGNS
    if using_real:
        raw_current = real["raw_current"]
        raw_prev    = real["raw_prev"]
    else:
        raw_current = {c.id: generate_raw_metrics(c.id, window_seed) for c in campaigns_list}
        raw_prev    = {c.id: generate_prev_raw_metrics(c.id)         for c in campaigns_list}

    # ── 2. Feature engineering ────────────────────────────────────────────────
    derived_current = {c.id: compute_derived(raw_current[c.id], c.budget) for c in campaigns_list}
    derived_prev    = {c.id: compute_derived(raw_prev[c.id],    c.budget) for c in campaigns_list}

    # ── 3. Health scores + trends + history ───────────────────────────────────
    processed: list[dict] = []
    processed_campaigns: list[ProcessedCampaign] = []

    for campaign in campaigns_list:
        cid     = campaign.id
        current = derived_current[cid]
        prev    = derived_prev[cid]
        health  = compute_health(current, campaign.platform)
        if using_real:
            history = real["history"][cid][-days:]
            sparkl  = real["sparkline"][cid]
        else:
            history = generate_daily_history(cid, days=days)
            sparkl  = generate_sparkline(cid, "revenue", 12)
        revenue_series = [pt["revenue"] for pt in history] if history else [0]
        trend  = detect_trend(revenue_series)

        processed.append({
            "campaign":        campaign,
            "current_metrics": current,
            "prev_metrics":    prev,
        })
        processed_campaigns.append(ProcessedCampaign(
            campaign=campaign,
            metrics=current,
            prev_metrics=prev if prev.spend > 0 else None,
            health=health,
            trend_direction=trend,
            history=history,
            sparkline=sparkl,
        ))

    # ── 4. Alerts ─────────────────────────────────────────────────────────────
    alerts = generate_all_alerts(processed)

    # ── 5. Aggregated KPIs ───────────────────────────────────────────────────
    active = [c for c in processed_campaigns if c.campaign.status.value in ("active", "review")]

    total_spend  = round(sum(c.metrics.spend       for c in active), 2)
    total_rev    = round(sum(c.metrics.revenue      for c in active), 2)
    total_conv   = sum(c.metrics.conversions        for c in active)
    total_profit = round(sum(c.metrics.profit       for c in active), 2)
    blended_roas = round(total_rev / total_spend,   2) if total_spend > 0 else 0
    avg_cpa      = round(total_spend / total_conv,  2) if total_conv  > 0 else 0
    avg_ctr      = round(sum(c.metrics.ctr for c in active) / len(active), 2) if active else 0
    ai_health    = round(sum(c.health.score for c in active) / len(active), 1) if active else 0

    prev_spend  = round(sum(c.prev_metrics.spend       for c in active if c.prev_metrics), 2)
    prev_rev    = round(sum(c.prev_metrics.revenue      for c in active if c.prev_metrics), 2)
    prev_conv   = sum(c.prev_metrics.conversions        for c in active if c.prev_metrics)
    prev_profit = round(sum(c.prev_metrics.profit       for c in active if c.prev_metrics), 2)
    prev_roas   = round(prev_rev / prev_spend, 2)  if prev_spend > 0 else 0
    prev_cpa    = round(prev_spend / prev_conv, 2) if prev_conv  > 0 else 0
    prev_ctr    = round(avg_ctr * 0.95, 2)
    prev_health = round(ai_health * 0.96, 1)

    kpis = KPISet(
        total_spend=total_spend,
        total_revenue=total_rev,
        total_conversions=total_conv,
        blended_roas=blended_roas,
        average_cpa=avg_cpa,
        average_ctr=avg_ctr,
        total_profit=total_profit,
        ai_health_score=ai_health,
    )
    kpi_changes = KPIChanges(
        spend_change=      pct_change(total_spend,  prev_spend),
        revenue_change=    pct_change(total_rev,    prev_rev),
        roas_change=       pct_change(blended_roas, prev_roas),
        cpa_change=        pct_change(avg_cpa,      prev_cpa),
        ctr_change=        pct_change(avg_ctr,      prev_ctr),
        conversions_change=pct_change(total_conv,   prev_conv),
        profit_change=     pct_change(total_profit, prev_profit),
        health_score_change=pct_change(ai_health,   prev_health),
    )

    # ── 6. Write processed data to ClickHouse ────────────────────────────────
    platform_by_id = {c.id: c.platform.value for c in campaigns_list}
    raw_recs = generate_all_recommendations(processed)

    if ch_active:
        write_processed_metrics(processed_campaigns, window_seed, cache_key)
        write_kpi_snapshot(kpis, window_seed, cache_key)
        write_alerts(alerts, window_seed, cache_key)

    # ── 7. Recommendations — numbers are always rule-computed from real metrics;
    #      DeepSeek (if configured) only rewrites description text, never numbers.
    if ch_active:
        # Check ClickHouse cache first — avoid recalling DeepSeek every request
        stored = read_latest_recommendations(window_seed, cache_key)
        if stored:
            recommendations = [
                Recommendation(
                    id=str(r["id"]),
                    campaign_id=str(r["campaign_id"]),
                    campaign_name=str(r["campaign_name"]),
                    type=str(r["type"]),
                    title=str(r["title"]),
                    description=str(r["description"]),
                    roas_impact=float(r["roas_impact"]),
                    revenue_impact=float(r["revenue_impact"]),
                    cpa_impact=float(r["cpa_impact"]),
                    revenue_impact_dollars=float(r.get("revenue_impact_dollars", 0)),
                    cpa_impact_dollars=float(r.get("cpa_impact_dollars", 0)),
                    confidence=float(r["confidence"]),
                    priority=str(r["priority"]),
                )
                for r in stored
            ]
            logger.info("Serving %d cached recommendations from ClickHouse (window=%s)", len(recommendations), window_seed)
        else:
            rule_rec_dicts = [
                {**r.model_dump(), "platform": platform_by_id.get(r.campaign_id, "")}
                for r in raw_recs
            ]
            enriched = enrich_recommendations(rule_rec_dicts)
            recommendations = [
                Recommendation(**{k: v for k, v in d.items() if k != "platform"})
                for d in enriched
            ]
            write_ai_recommendations(recommendations, window_seed, cache_key)
    else:
        rec_dicts = [
            {**r.model_dump(), "platform": platform_by_id.get(r.campaign_id, "")}
            for r in raw_recs
        ]
        enriched = enrich_recommendations(rec_dicts)
        recommendations = [
            Recommendation(**{k: v for k, v in d.items() if k != "platform"})
            for d in enriched
        ]

    # ── 8. Platform summaries ─────────────────────────────────────────────────
    platform_data: dict[Platform, dict] = {}
    for pc in active:
        p = pc.campaign.platform
        if p not in platform_data:
            platform_data[p] = dict(spend=0, revenue=0, ctrs=[], conv=0, health_scores=[])
        platform_data[p]["spend"]        += pc.metrics.spend
        platform_data[p]["revenue"]      += pc.metrics.revenue
        platform_data[p]["ctrs"].append(pc.metrics.ctr)
        platform_data[p]["conv"]         += pc.metrics.conversions
        platform_data[p]["health_scores"].append(pc.health.score)

    platforms: list[PlatformSummary] = []
    for plat, data in platform_data.items():
        meta  = PLATFORM_META[plat]
        spend = data["spend"]
        rev   = data["revenue"]
        platforms.append(PlatformSummary(
            platform=plat,
            display_name=meta["display_name"],
            icon=meta["icon"],
            color=meta["color"],
            spend=round(spend, 2),
            revenue=round(rev, 2),
            roas=round(rev / spend, 2) if spend > 0 else 0,
            ctr=round(sum(data["ctrs"]) / len(data["ctrs"]), 2),
            conversions=data["conv"],
            health_score=round(sum(data["health_scores"]) / len(data["health_scores"]), 1),
        ))
    platforms.sort(key=lambda p: p.spend, reverse=True)

    # ── 9. Forecasting ────────────────────────────────────────────────────────
    agg_history = _aggregate_real_history(real["history"], days=days) if using_real else generate_aggregated_history(days=days)
    forecasts   = build_forecasts(agg_history)

    # ── 10. Metadata ──────────────────────────────────────────────────────────
    now_ts       = datetime.now(timezone.utc).isoformat()
    window_start = window_seed * 5 * 60
    seconds_into_window = int(time.time()) - window_start
    next_update  = max(0, (5 * 60) - seconds_into_window)

    return DashboardData(
        kpis=kpis,
        kpi_changes=kpi_changes,
        campaigns=processed_campaigns,
        platforms=platforms,
        alerts=alerts,
        recommendations=recommendations,
        forecasts=forecasts,
        trend_history=agg_history,
        last_updated=now_ts,
        next_update_in_seconds=next_update,
        window_seed=window_seed,
    )


# ── Creative Analytics — built from real ingested ad data only ──────────────

_FATIGUE_BUCKETS = [
    # (max_fatigue, badge_label, badge_tone, rec_score_tone, rec_box_class, message)
    (30, "Optimal", "bg-tertiary-container text-on-tertiary-container", "text-tertiary",
     "bg-surface-container-low border border-outline-variant/50",
     "Performing well against this account's CTR benchmark. Consider scaling budget or generating similar variants."),
    (70, "Maturing", "bg-surface-variant text-on-surface-variant", "text-on-surface",
     "bg-secondary-fixed/20 border border-secondary-fixed",
     "Stable performance — keep monitoring for a CTR decline."),
    (101, "High Fatigue", "bg-error-container text-on-error-container", "text-error",
     "bg-primary-fixed/20 border border-primary-fixed",
     "CTR is below this account's benchmark — consider refreshing this creative's copy or visuals."),
]


def _fatigue_bucket(fatigue: float) -> tuple:
    for max_f, *rest in _FATIGUE_BUCKETS:
        if fatigue <= max_f:
            return tuple(rest)
    return _FATIGUE_BUCKETS[-1][1:]


def build_creative_data(account_id: str) -> Optional[CreativeData]:
    """Real Creative Analytics from ingested ad data. None if nothing has been synced yet."""
    ads = read_real_ads(account_id)
    if not ads:
        return None

    bm = BENCHMARKS[Platform.meta_ads]
    creatives = []

    for ad in ads:
        history = read_real_ad_history(account_id, ad["id"])
        if not history:
            continue
        latest = history[-1]
        impressions, clicks, conversions = int(latest["impressions"]), int(latest["clicks"]), int(latest["conversions"])
        ctr = round(clicks / impressions * 100, 2) if impressions > 0 else 0.0
        cvr = round(conversions / clicks * 100, 2) if clicks > 0 else 0.0

        ctr_score, _ = _score_factor(ctr, bm["ctr_good"], bm["ctr_warn"], higher_is_better=True)
        fatigue = round(100 - ctr_score, 1)
        badge_label, badge_tone, rec_score_tone, rec_box_class, message = _fatigue_bucket(fatigue)

        ctr_series = [round(h["clicks"] / h["impressions"] * 100, 2) if h["impressions"] > 0 else 0.0 for h in history]
        cvr_series = [round(h["conversions"] / h["clicks"] * 100, 2) if h["clicks"] > 0 else 0.0 for h in history]
        ctr_dir = detect_trend(ctr_series).value
        cvr_dir = detect_trend(cvr_series).value

        is_video = "video" in ad.get("creative_type", "").lower()
        creatives.append({
            "id": ad["id"],
            "title": ad["name"],
            "campaign": ad["campaign"],
            "type": "video" if is_video else "image",
            "thumb_icon": "videocam" if is_video else "image",
            "badge_label": badge_label,
            "badge_tone": badge_tone,
            "fatigue_score": fatigue,
            "ctr": ctr,
            "conversion_rate": cvr,
            "ai_recommendation": message,
            "rec_score": f"{fatigue:.0f}/100",
            "rec_score_tone": rec_score_tone,
            "rec_box_class": rec_box_class,
            "metrics": [
                {"label": "CTR", "value": f"{ctr:.2f}%", "dir": ctr_dir},
                {"label": "Conv. Rate", "value": f"{cvr:.2f}%", "dir": cvr_dir},
            ],
        })

    return CreativeData(creatives=creatives, last_updated=datetime.now(timezone.utc).isoformat() + "Z")


# ── Audience Analytics — built from real ingested breakdown data only ───────

_DEVICE_LABELS = {"desktop": "Desktop", "mobile_app": "Mobile", "mobile_web": "Mobile", "tablet": "Tablet"}
_COUNTRY_NAMES = {
    "US": "United States", "GB": "United Kingdom", "CA": "Canada", "AU": "Australia",
    "DE": "Germany", "FR": "France", "IN": "India", "BR": "Brazil", "JP": "Japan", "MX": "Mexico",
}


def build_audience_data(account_id: str) -> Optional[AudienceData]:
    """Real Audience Analytics from ingested breakdown data. None if nothing has been synced yet."""
    age_rows = read_real_breakdown(account_id, "age")
    if not age_rows:
        return None
    device_rows = read_real_breakdown(account_id, "device_platform")
    country_rows = read_real_breakdown(account_id, "country")
    targeted = read_targeted_interests(account_id)
    daily_totals = read_breakdown_daily_totals(account_id, "age")

    total_impr = sum(int(r["impressions"]) for r in age_rows) or 1
    total_clicks = sum(int(r["clicks"]) for r in age_rows)
    total_conv = sum(int(r["conversions"]) for r in age_rows)
    total_reach = sum(int(r["reach"]) for r in age_rows)

    age_groups = sorted([
        {"label": r["breakdown_value"], "pct": round(int(r["impressions"]) / total_impr * 100, 1), "reach_m": round(int(r["reach"]) / 1_000_000, 2)}
        for r in age_rows
    ], key=lambda a: -a["pct"])

    device_totals: dict[str, dict] = {}
    for r in device_rows:
        label = _DEVICE_LABELS.get(r["breakdown_value"], r["breakdown_value"].title())
        d = device_totals.setdefault(label, {"impressions": 0})
        d["impressions"] += int(r["impressions"])
    total_device_impr = sum(d["impressions"] for d in device_totals.values()) or 1
    device_split = sorted([
        {"label": label, "pct": round(d["impressions"] / total_device_impr * 100, 1)}
        for label, d in device_totals.items()
    ], key=lambda d: -d["pct"])

    total_geo_impr = sum(int(r["impressions"]) for r in country_rows) or 1
    geo_distribution = sorted([
        {
            "country": _COUNTRY_NAMES.get(r["breakdown_value"], r["breakdown_value"]),
            "code": r["breakdown_value"],
            "pct": round(int(r["impressions"]) / total_geo_impr * 100, 1),
            "reach_m": round(int(r["reach"]) / 1_000_000, 2),
        }
        for r in country_rows
    ], key=lambda g: -g["pct"])

    ctr_total = clicks_to_pct(total_clicks, total_impr)
    conv_rate_total = clicks_to_pct(total_conv, total_clicks)
    bm = BENCHMARKS[Platform.meta_ads]
    ctr_score, _ = _score_factor(ctr_total, bm["ctr_good"], bm["ctr_warn"], higher_is_better=True)
    conv_score, _ = _score_factor(conv_rate_total, bm["conv_rate_good"], bm["conv_rate_warn"], higher_is_better=True)
    quality = round((ctr_score + conv_score) / 2, 1)

    reach_change_pct = 0.0
    if len(daily_totals) >= 2:
        reach_change_pct = pct_change(float(daily_totals[-1]["reach"]), float(daily_totals[0]["reach"]))

    top_age = age_groups[0]["label"] if age_groups else "—"
    top_device = device_split[0]["label"] if device_split else "—"

    return AudienceData(
        total_unique_reach_m=round(total_reach / 1_000_000, 2),
        primary_demographic=f"{top_age} · {top_device} users",
        audience_quality_score=quality,
        reach_change_pct=reach_change_pct,
        age_groups=age_groups,
        device_split=device_split,
        geo_distribution=geo_distribution,
        targeted_interests=sorted({str(r["interest"]) for r in targeted}),
        last_updated=datetime.now(timezone.utc).isoformat() + "Z",
    )


def clicks_to_pct(numerator: int, denominator: int) -> float:
    return round(numerator / denominator * 100, 2) if denominator > 0 else 0.0
