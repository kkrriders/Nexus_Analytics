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

from models.schemas import (
    DashboardData, KPISet, KPIChanges, ProcessedCampaign,
    PlatformSummary, Platform, DerivedMetrics, Recommendation,
    Campaign, CampaignStatus, RawMetrics,
)
from preprocessing.mock_generator import (
    BASE_CAMPAIGNS, current_window_seed,
    generate_raw_metrics, generate_prev_raw_metrics,
    generate_daily_history, generate_aggregated_history, generate_sparkline,
)
from analytics.feature_engineering import compute_derived, pct_change
from scoring.campaign_health_score import compute_health
from trend_analysis.trend_detection import detect_trend
from anomaly_detection.anomaly_detection import generate_all_alerts
from recommendations.recommendation_engine import generate_all_recommendations
from forecasting.revenue_forecast import build_forecasts
from database.clickhouse_client import is_connected, query as ch_query
from database.clickhouse_schema import (
    write_processed_metrics, write_kpi_snapshot, write_alerts,
    write_ai_recommendations, read_latest_recommendations,
    has_real_campaigns, read_real_campaigns, read_real_campaign_history,
)
from ai.deepseek_client import enrich_recommendations, analyze_from_clickhouse

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


def _load_real_campaigns():
    """
    Load real ingested ad-account data from ClickHouse. Returns None when no
    ad account has been connected/synced yet (caller should fall back to mock).
    """
    if not has_real_campaigns():
        return None

    camp_rows = read_real_campaigns()
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

        daily_rows = read_real_campaign_history(cid)
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


def run_pipeline() -> DashboardData:
    window_seed = current_window_seed()
    ch_active = is_connected()

    real = _load_real_campaigns() if ch_active else None
    using_real = real is not None

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
            history = real["history"][cid]
            sparkl  = real["sparkline"][cid]
        else:
            history = generate_daily_history(cid, days=30)
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
        write_processed_metrics(processed_campaigns, window_seed)
        write_kpi_snapshot(kpis, window_seed)
        write_alerts(alerts, window_seed)

    # ── 7. Recommendations — ClickHouse cache → DeepSeek → fallback ─────────
    if ch_active:
        # Check ClickHouse cache first — avoid calling DeepSeek on every request
        stored = read_latest_recommendations(window_seed)
        if stored:
            # Reuse recommendations already generated for this 5-minute window
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
                    confidence=float(r["confidence"]),
                    priority=str(r["priority"]),
                )
                for r in stored
            ]
            logger.info("Serving %d cached recommendations from ClickHouse (window=%s)", len(recommendations), window_seed)
        else:
            # No cache for this window — read processed metrics from ClickHouse,
            # call DeepSeek to generate rich recommendations, then store them back.
            ch_metrics = ch_query(
                "SELECT * FROM nexus.processed_metrics WHERE window_seed = {ws:UInt64}",
                {"ws": window_seed},
            )
            kpi_dict = {
                "total_spend":     total_spend,
                "total_revenue":   total_rev,
                "blended_roas":    blended_roas,
                "average_cpa":     avg_cpa,
                "average_ctr":     avg_ctr,
                "ai_health_score": ai_health,
            }
            rule_rec_dicts = [
                {**r.model_dump(), "platform": platform_by_id.get(r.campaign_id, "")}
                for r in raw_recs
            ]

            # DeepSeek reads ClickHouse metrics → generates rich recommendations
            ai_recs_raw = analyze_from_clickhouse(ch_metrics, kpi_dict, rule_rec_dicts)

            if ai_recs_raw:
                recommendations = []
                for r in ai_recs_raw:
                    try:
                        recommendations.append(Recommendation(
                            id=str(r.get("id", "")),
                            campaign_id=str(r.get("campaign_id", "")),
                            campaign_name=str(r.get("campaign_name", "")),
                            type=str(r.get("type", "optimization")),
                            title=str(r.get("title", "")),
                            description=str(r.get("description", "")),
                            roas_impact=float(r.get("roas_impact", 0)),
                            revenue_impact=float(r.get("revenue_impact", 0)),
                            cpa_impact=float(r.get("cpa_impact", 0)),
                            confidence=float(r.get("confidence", 70)),
                            priority=str(r.get("priority", "medium")),
                        ))
                    except Exception as e:
                        logger.warning("Skipping malformed DeepSeek recommendation: %s", e)
                # Write DeepSeek results back to ClickHouse for caching
                write_ai_recommendations(recommendations, window_seed)
            else:
                # DeepSeek unavailable — enrich rule-based descriptions and cache
                enriched = enrich_recommendations(rule_rec_dicts)
                recommendations = [
                    Recommendation(**{k: v for k, v in d.items() if k != "platform"})
                    for d in enriched
                ]
                write_ai_recommendations(recommendations, window_seed)
    else:
        # No ClickHouse — rule-based recommendations with DeepSeek description enrichment
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
    agg_history = _aggregate_real_history(real["history"], days=30) if using_real else generate_aggregated_history(days=30)
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
