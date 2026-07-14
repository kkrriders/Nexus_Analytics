"""
ClickHouse schema creation and pipeline write helpers.
All tables live in the `nexus` database.
"""
import logging
from datetime import datetime, timezone
from database.clickhouse_client import get_client, insert, query as ch_query

logger = logging.getLogger(__name__)


# ─── DDL ─────────────────────────────────────────────────────────────────────

# account_id is always a real accounts.id UUID — every table and query below
# is scoped by it so one user's connected ad account is never visible to
# another user's requests. There is no shared/demo account id.

_TABLES = {
    "nexus.campaigns": """
        CREATE TABLE IF NOT EXISTS nexus.campaigns (
            account_id String,
            id         String,
            name       String,
            platform   LowCardinality(String),
            status     LowCardinality(String),
            budget     Float64,
            start_date String,
            audience   String
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, id)
    """,

    "nexus.campaign_metrics_daily": """
        CREATE TABLE IF NOT EXISTS nexus.campaign_metrics_daily (
            account_id   String,
            campaign_id  String,
            date         Date,
            impressions  UInt64,
            clicks       UInt64,
            spend        Float64,
            revenue      Float64,
            conversions  UInt64
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, campaign_id, date)
    """,

    # Derived / processed metrics per campaign per 5-minute pipeline window
    "nexus.processed_metrics": """
        CREATE TABLE IF NOT EXISTS nexus.processed_metrics (
            account_id         String,
            window_seed        UInt64,
            campaign_id        String,
            computed_at        DateTime,
            impressions        UInt64,
            clicks             UInt64,
            spend              Float64,
            revenue            Float64,
            conversions        UInt64,
            ctr                Float64,
            cpc                Float64,
            cpm                Float64,
            cpa                Float64,
            roas               Float64,
            conversion_rate    Float64,
            profit             Float64,
            budget_utilization Float64,
            health_score       Float64,
            health_category    LowCardinality(String),
            trend_direction    LowCardinality(String)
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, campaign_id, window_seed)
    """,

    # Aggregate KPI snapshot per pipeline window
    "nexus.kpi_snapshots": """
        CREATE TABLE IF NOT EXISTS nexus.kpi_snapshots (
            account_id        String,
            window_seed       UInt64,
            computed_at       DateTime,
            total_spend       Float64,
            total_revenue     Float64,
            total_conversions UInt64,
            blended_roas      Float64,
            average_cpa       Float64,
            average_ctr       Float64,
            total_profit      Float64,
            ai_health_score   Float64
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, window_seed)
    """,

    # Anomaly alerts written by the pipeline
    "nexus.alerts": """
        CREATE TABLE IF NOT EXISTS nexus.alerts (
            account_id    String,
            id            String,
            window_seed   UInt64,
            severity      LowCardinality(String),
            campaign_id   String,
            campaign_name String,
            message       String,
            detail        String,
            timestamp     String,
            created_at    DateTime
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, id, window_seed)
    """,

    # Ad-level metadata ("fetch by ad name") + creative info
    "nexus.ads": """
        CREATE TABLE IF NOT EXISTS nexus.ads (
            account_id     String,
            id             String,
            name           String,
            campaign       String,
            platform       LowCardinality(String),
            creative_type  LowCardinality(String),
            thumbnail_url  String
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, id)
    """,

    "nexus.ad_metrics_daily": """
        CREATE TABLE IF NOT EXISTS nexus.ad_metrics_daily (
            account_id   String,
            ad_id        String,
            date         Date,
            impressions  UInt64,
            clicks       UInt64,
            spend        Float64,
            revenue      Float64,
            conversions  UInt64
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, ad_id, date)
    """,

    # Account-wide (campaign = '') or per-campaign audience breakdowns —
    # powers Audience Analytics and the Campaign Analytics drill-down.
    "nexus.audience_breakdowns_daily": """
        CREATE TABLE IF NOT EXISTS nexus.audience_breakdowns_daily (
            account_id      String,
            campaign_id     String,
            date            Date,
            breakdown_type  LowCardinality(String),
            breakdown_value String,
            impressions     UInt64,
            clicks          UInt64,
            spend           Float64,
            reach           UInt64,
            revenue         Float64,
            conversions     UInt64
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, campaign_id, breakdown_type, breakdown_value, date)
    """,

    # Real ad-set targeting (interests actually targeted) — replaces guessed
    # audience affinity scores, which Meta's API does not expose.
    "nexus.targeted_interests": """
        CREATE TABLE IF NOT EXISTS nexus.targeted_interests (
            account_id  String,
            adset_id    String,
            interest    String,
            synced_at   DateTime
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, adset_id, interest)
    """,

    # AI recommendations generated by DeepSeek after reading ClickHouse data
    "nexus.ai_recommendations": """
        CREATE TABLE IF NOT EXISTS nexus.ai_recommendations (
            account_id     String,
            id             String,
            window_seed    UInt64,
            campaign_id    String,
            campaign_name  String,
            type           LowCardinality(String),
            title          String,
            description    String,
            roas_impact    Float64,
            revenue_impact Float64,
            cpa_impact     Float64,
            revenue_impact_dollars Float64,
            cpa_impact_dollars     Float64,
            confidence     Float64,
            priority       LowCardinality(String),
            generated_at   DateTime
        ) ENGINE = ReplacingMergeTree()
        ORDER BY (account_id, id, window_seed)
    """,
}

# Columns added to _TABLES after a table already existed in deployed
# ClickHouse instances — CREATE TABLE IF NOT EXISTS never retrofits those, so
# they're added explicitly here. ADD COLUMN IF NOT EXISTS is a no-op once applied.
_COLUMN_MIGRATIONS = {
    "nexus.ai_recommendations": [
        "ADD COLUMN IF NOT EXISTS revenue_impact_dollars Float64 DEFAULT 0",
        "ADD COLUMN IF NOT EXISTS cpa_impact_dollars Float64 DEFAULT 0",
    ],
}


def _apply_column_migrations(client) -> None:
    for table, alters in _COLUMN_MIGRATIONS.items():
        for alter in alters:
            try:
                client.command(f"ALTER TABLE {table} {alter}")
            except Exception as e:
                logger.warning("Column migration failed for %s (%s): %s", table, alter, e)


def _existing_tables() -> set[str]:
    """Return the set of tables that already exist in the nexus database."""
    try:
        rows = ch_query("SHOW TABLES FROM nexus")
        return {r.get("name", "") for r in rows}
    except Exception:
        return set()


def create_tables() -> bool:
    """Create any missing nexus tables. Skips DDL entirely if schema is already complete."""
    client = get_client()
    if client is None:
        return False
    try:
        expected = {t.split(".", 1)[1] for t in _TABLES}   # bare table names
        existing = _existing_tables()

        if expected.issubset(existing):
            _apply_column_migrations(client)
            logger.info("ClickHouse schema already exists — skipping DDL (%d tables)", len(expected))
            return True

        # First boot or partial schema — create database + any missing tables
        client.command("CREATE DATABASE IF NOT EXISTS nexus")
        missing = {k: v for k, v in _TABLES.items() if k.split(".", 1)[1] not in existing}
        for table, ddl in missing.items():
            client.command(ddl)
            logger.info("ClickHouse table created: %s", table)
        _apply_column_migrations(client)
        logger.info("ClickHouse schema ready (%d new, %d existing)", len(missing), len(existing))
        return True
    except Exception as e:
        logger.error("Failed to initialise ClickHouse schema: %s", e)
        return False


# ─── Pipeline write helpers ───────────────────────────────────────────────────

def write_processed_metrics(processed_campaigns, window_seed: int, account_id: str) -> None:
    """Persist derived metrics + health + trend for every campaign."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rows = []
    for pc in processed_campaigns:
        m = pc.metrics
        rows.append({
            "account_id":         account_id,
            "window_seed":        window_seed,
            "campaign_id":        pc.campaign.id,
            "computed_at":        now,
            "impressions":        int(m.impressions),
            "clicks":             int(m.clicks),
            "spend":              float(m.spend),
            "revenue":            float(m.revenue),
            "conversions":        int(m.conversions),
            "ctr":                float(m.ctr),
            "cpc":                float(m.cpc),
            "cpm":                float(m.cpm),
            "cpa":                float(m.cpa),
            "roas":               float(m.roas),
            "conversion_rate":    float(m.conversion_rate),
            "profit":             float(m.profit),
            "budget_utilization": float(m.budget_utilization),
            "health_score":       float(pc.health.score),
            "health_category":    pc.health.category.value,
            "trend_direction":    pc.trend_direction.value,
        })
    if insert("nexus.processed_metrics", rows):
        logger.info("Wrote %d processed_metrics rows (window=%s)", len(rows), window_seed)


def write_kpi_snapshot(kpis, window_seed: int, account_id: str) -> None:
    """Persist aggregate KPIs for this pipeline window."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    insert("nexus.kpi_snapshots", [{
        "account_id":        account_id,
        "window_seed":       window_seed,
        "computed_at":       now,
        "total_spend":       float(kpis.total_spend),
        "total_revenue":     float(kpis.total_revenue),
        "total_conversions": int(kpis.total_conversions),
        "blended_roas":      float(kpis.blended_roas),
        "average_cpa":       float(kpis.average_cpa),
        "average_ctr":       float(kpis.average_ctr),
        "total_profit":      float(kpis.total_profit),
        "ai_health_score":   float(kpis.ai_health_score),
    }])
    logger.info("Wrote KPI snapshot (window=%s)", window_seed)


def write_alerts(alerts, window_seed: int, account_id: str) -> None:
    """Persist anomaly alerts for this pipeline window."""
    if not alerts:
        return
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rows = [{
        "account_id":    account_id,
        "id":            a.id,
        "window_seed":   window_seed,
        "severity":      a.severity.value,
        "campaign_id":   a.campaign_id,
        "campaign_name": a.campaign_name,
        "message":       a.message,
        "detail":        a.detail,
        "timestamp":     a.timestamp,
        "created_at":    now,
    } for a in alerts]
    if insert("nexus.alerts", rows):
        logger.info("Wrote %d alerts (window=%s)", len(rows), window_seed)


def write_ai_recommendations(recommendations, window_seed: int, account_id: str) -> None:
    """Persist AI-generated recommendations for this pipeline window."""
    if not recommendations:
        return
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rows = [{
        "account_id":     account_id,
        "id":             r.id,
        "window_seed":    window_seed,
        "campaign_id":    r.campaign_id,
        "campaign_name":  r.campaign_name,
        "type":           r.type,
        "title":          r.title,
        "description":    r.description,
        "roas_impact":    float(r.roas_impact),
        "revenue_impact": float(r.revenue_impact),
        "cpa_impact":     float(r.cpa_impact),
        "revenue_impact_dollars": float(r.revenue_impact_dollars),
        "cpa_impact_dollars":     float(r.cpa_impact_dollars),
        "confidence":     float(r.confidence),
        "priority":       r.priority,
        "generated_at":   now,
    } for r in recommendations]
    if insert("nexus.ai_recommendations", rows):
        logger.info("Wrote %d AI recommendations (window=%s)", len(rows), window_seed)


def read_latest_recommendations(window_seed: int, account_id: str) -> list[dict]:
    """Read AI recommendations for the current window from ClickHouse."""
    rows = ch_query(
        "SELECT * FROM nexus.ai_recommendations WHERE window_seed = {ws:UInt64} AND account_id = {aid:String} ORDER BY confidence DESC",
        {"ws": window_seed, "aid": account_id},
    )
    return rows


# ─── Real ad-account ingestion (n8n / integrations.meta_ads → /api/ingest) ────

def _has_rows(table: str, account_id: str) -> bool:
    rows = ch_query(
        f"SELECT count() AS cnt FROM {table} WHERE account_id = {{aid:String}}",
        {"aid": account_id},
    )
    return bool(rows) and int(rows[0].get("cnt", 0)) > 0


def has_real_campaigns(account_id: str) -> bool:
    """True once at least one real campaign has been ingested for this specific account."""
    return _has_rows("nexus.campaigns", account_id)


def write_ingested_campaigns(account_id: str, platform: str, campaigns: list[dict]) -> int:
    """
    Upsert campaign metadata + today's daily metrics row from a real ad-platform fetch.
    `campaigns` items are shaped {campaign_id, campaign_name, impressions, clicks, spend, conversions, revenue}
    (matches the Normalize Ad Data node output in nexus_n8n_workflow.json).
    """
    if not campaigns:
        return 0

    today_date = datetime.now(timezone.utc).date()
    today_str  = today_date.isoformat()
    camp_rows, metric_rows = [], []

    for c in campaigns:
        raw_id = str(c.get("campaign_id") or "")
        if not raw_id:
            continue
        cid = f"{platform}_{raw_id}"
        spend = float(c.get("spend", 0) or 0)

        camp_rows.append({
            "account_id": account_id,
            "id": cid,
            "name": str(c.get("campaign_name") or cid),
            "platform": platform,
            "status": "active",
            "budget": round(max(spend * 3, 100.0), 2),
            "start_date": today_str,
            "audience": "Live ad account",
        })
        metric_rows.append({
            "account_id": account_id,
            "campaign_id": cid,
            "date": today_date,
            "impressions": int(c.get("impressions", 0) or 0),
            "clicks":      int(c.get("clicks", 0) or 0),
            "spend":       spend,
            "revenue":     float(c.get("revenue", 0) or 0),
            "conversions": int(c.get("conversions", 0) or 0),
        })

    if camp_rows:
        insert("nexus.campaigns", camp_rows)
    if metric_rows:
        insert("nexus.campaign_metrics_daily", metric_rows)

    logger.info("Ingested %d real campaigns (platform=%s, account=%s)", len(camp_rows), platform, account_id)
    return len(camp_rows)


def read_real_campaigns(account_id: str) -> list[dict]:
    """Metadata for every real ingested campaign for this account (deduped via FINAL)."""
    return ch_query(
        "SELECT * FROM nexus.campaigns FINAL WHERE account_id = {aid:String} ORDER BY id",
        {"aid": account_id},
    )


def read_real_campaign_history(account_id: str, campaign_id: str) -> list[dict]:
    """Full daily metric history for one real campaign, oldest first."""
    rows = ch_query(
        "SELECT * FROM nexus.campaign_metrics_daily FINAL WHERE account_id = {aid:String} AND campaign_id = {cid:String} ORDER BY date",
        {"aid": account_id, "cid": campaign_id},
    )
    return rows


# ─── Real ad-level ingestion (Creative Analytics by ad name) ─────────────────

def write_ingested_ads(account_id: str, platform: str, ads: list[dict], creatives: dict[str, dict] | None = None) -> int:
    """
    Upsert ad metadata + today's daily metrics row from a real ad-platform fetch.
    `ads` items are shaped like fetch_meta_ads() output; `creatives` maps
    raw ad_id -> {title, thumbnail_url, object_type} from fetch_ad_creatives().
    """
    if not ads:
        return 0
    creatives = creatives or {}

    today_date = datetime.now(timezone.utc).date()
    ad_rows, metric_rows = [], []

    for a in ads:
        raw_id = str(a.get("ad_id") or "")
        if not raw_id:
            continue
        aid = f"{platform}_{raw_id}"
        creative = creatives.get(raw_id, {})

        ad_rows.append({
            "account_id":    account_id,
            "id":            aid,
            "name":          str(a.get("ad_name") or creative.get("title") or aid),
            "campaign":      str(a.get("campaign_name") or ""),
            "platform":      platform,
            "creative_type": creative.get("object_type", "image"),
            "thumbnail_url": creative.get("thumbnail_url", ""),
        })
        metric_rows.append({
            "account_id": account_id,
            "ad_id":      aid,
            "date":       today_date,
            "impressions": int(a.get("impressions", 0) or 0),
            "clicks":      int(a.get("clicks", 0) or 0),
            "spend":       float(a.get("spend", 0) or 0),
            "revenue":     float(a.get("revenue", 0) or 0),
            "conversions": int(a.get("conversions", 0) or 0),
        })

    if ad_rows:
        insert("nexus.ads", ad_rows)
    if metric_rows:
        insert("nexus.ad_metrics_daily", metric_rows)

    logger.info("Ingested %d real ads (platform=%s, account=%s)", len(ad_rows), platform, account_id)
    return len(ad_rows)


def read_real_ads(account_id: str) -> list[dict]:
    """Metadata for every real ingested ad for this account (deduped via FINAL)."""
    return ch_query(
        "SELECT * FROM nexus.ads FINAL WHERE account_id = {aid:String} ORDER BY id",
        {"aid": account_id},
    )


def read_real_ad_history(account_id: str, ad_id: str) -> list[dict]:
    """Full daily metric history for one real ad, oldest first."""
    return ch_query(
        "SELECT * FROM nexus.ad_metrics_daily FINAL WHERE account_id = {aid:String} AND ad_id = {adid:String} ORDER BY date",
        {"aid": account_id, "adid": ad_id},
    )


# ─── Real audience breakdowns (Audience + Campaign Analytics drill-down) ─────

def write_ingested_breakdowns(account_id: str, platform: str, rows: list[dict]) -> int:
    """`rows` items are shaped like fetch_meta_breakdown() output."""
    if not rows:
        return 0
    today_date = datetime.now(timezone.utc).date()
    out = []
    for r in rows:
        raw_cid = str(r.get("campaign_id") or "")
        out.append({
            "account_id":      account_id,
            "campaign_id":     f"{platform}_{raw_cid}" if raw_cid else "",
            "date":            today_date,
            "breakdown_type":  str(r.get("breakdown_type") or ""),
            "breakdown_value": str(r.get("breakdown_value") or "unknown"),
            "impressions":     int(r.get("impressions", 0) or 0),
            "clicks":          int(r.get("clicks", 0) or 0),
            "spend":           float(r.get("spend", 0) or 0),
            "reach":           int(r.get("reach", 0) or 0),
            "revenue":         float(r.get("revenue", 0) or 0),
            "conversions":     int(r.get("conversions", 0) or 0),
        })
    insert("nexus.audience_breakdowns_daily", out)
    logger.info("Ingested %d breakdown rows (platform=%s, account=%s)", len(out), platform, account_id)
    return len(out)


def read_real_breakdown(account_id: str, breakdown_type: str, campaign_id: str = "") -> list[dict]:
    """Latest day's rows for one breakdown dimension — account-wide by default."""
    rows = ch_query(
        """SELECT * FROM nexus.audience_breakdowns_daily FINAL
           WHERE account_id = {aid:String} AND breakdown_type = {bt:String} AND campaign_id = {cid:String}
           ORDER BY date DESC""",
        {"aid": account_id, "bt": breakdown_type, "cid": campaign_id},
    )
    if not rows:
        return []
    latest_date = rows[0]["date"]
    return [r for r in rows if r["date"] == latest_date]


def read_breakdown_daily_totals(account_id: str, breakdown_type: str = "age", campaign_id: str = "") -> list[dict]:
    """One row per day with total reach/impressions summed across all breakdown values — for trend/change-pct."""
    return ch_query(
        """SELECT date, sum(reach) AS reach, sum(impressions) AS impressions
           FROM nexus.audience_breakdowns_daily FINAL
           WHERE account_id = {aid:String} AND breakdown_type = {bt:String} AND campaign_id = {cid:String}
           GROUP BY date ORDER BY date""",
        {"aid": account_id, "bt": breakdown_type, "cid": campaign_id},
    )


def has_real_ads(account_id: str) -> bool:
    return _has_rows("nexus.ads", account_id)


def has_real_breakdowns(account_id: str) -> bool:
    return _has_rows("nexus.audience_breakdowns_daily", account_id)


# ─── Real targeted interests (replaces guessed audience affinity) ───────────

def write_targeted_interests(account_id: str, rows: list[dict]) -> int:
    """`rows` items are shaped like fetch_ad_set_targeting() output."""
    if not rows:
        return 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    out = [{
        "account_id": account_id,
        "adset_id":   str(r.get("adset_id") or ""),
        "interest":   str(r.get("interest") or ""),
        "synced_at":  now,
    } for r in rows]
    insert("nexus.targeted_interests", out)
    return len(out)


def read_targeted_interests(account_id: str) -> list[dict]:
    """Distinct real interests targeted across this account's ad sets."""
    return ch_query(
        """SELECT DISTINCT interest FROM nexus.targeted_interests FINAL
           WHERE account_id = {aid:String} ORDER BY interest""",
        {"aid": account_id},
    )
