"""
Direct Meta Ads sync — fetches campaign insights straight from the Graph API
and writes them to ClickHouse, without going through n8n.

n8n remains available for local/manual use, but the live dashboard no longer
depends on it being up: this module lets the backend refresh real ad data on
its own, either on demand (POST /api/accounts/sync) or automatically when
data is stale (called from pipeline.run_pipeline()).

Normalization mirrors the "Normalize Ad Data" Code node in
nexus_n8n_workflow.json exactly, so real rows look identical regardless of
which path produced them.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx

from database.postgres_client import query as pg_query, execute as pg_execute
from database.clickhouse_schema import write_ingested_campaigns

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v19.0"
STALE_AFTER = timedelta(hours=6)


def _normalize_meta_campaigns(raw_rows: list[dict]) -> list[dict]:
    campaigns = []
    for r in raw_rows:
        purchases = [a for a in (r.get("actions") or []) if a.get("action_type") == "purchase"]
        purchase_values = [a for a in (r.get("action_values") or []) if a.get("action_type") == "purchase"]
        campaigns.append({
            "campaign_id":   str(r.get("campaign_id") or ""),
            "campaign_name": str(r.get("campaign_name") or ""),
            "impressions":   int(r.get("impressions") or 0),
            "clicks":        int(r.get("clicks") or 0),
            "spend":         float(r.get("spend") or 0),
            "conversions":   sum(int(a.get("value") or 0) for a in purchases),
            "revenue":       sum(float(a.get("value") or 0) for a in purchase_values),
        })
    return campaigns


def fetch_meta_campaigns(access_token: str, account_id: str) -> list[dict]:
    """Fetch today's campaign-level insights for one Meta ad account."""
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "campaign_id,campaign_name,impressions,clicks,spend,actions,action_values",
        "date_preset": "today",
        "level": "campaign",
        "access_token": access_token,
    }
    resp = httpx.get(url, params=params, timeout=20.0)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    return _normalize_meta_campaigns(data)


def sync_account(account_id: str) -> dict:
    """Fetch + persist real Meta data for one account. Raises on failure."""
    rows = pg_query("SELECT meta_ads FROM public.accounts WHERE id = %(id)s", {"id": account_id})
    if not rows:
        raise ValueError(f"Account {account_id} not found")

    meta_ads = rows[0]["meta_ads"] or {}
    token = meta_ads.get("access_token")
    ad_account_id = meta_ads.get("account_id")
    if not token or not ad_account_id:
        raise ValueError("Account has no Meta ads token/account_id connected")

    error: Optional[str] = None
    written = 0
    try:
        campaigns = fetch_meta_campaigns(token, ad_account_id)
        written = write_ingested_campaigns(account_id, "meta_ads", campaigns)
    except Exception as e:
        error = str(e)
        logger.error("Meta sync failed for account %s: %s", account_id, error)

    pg_execute(
        """UPDATE public.accounts
           SET last_synced_at = now(), last_sync_error = %(error)s, updated_at = now()
           WHERE id = %(id)s""",
        {"id": account_id, "error": error},
    )

    if error:
        raise RuntimeError(error)
    return {"status": "ok", "account_id": account_id, "campaigns_synced": written}


def sync_if_stale() -> None:
    """
    Best-effort auto-refresh, called from the dashboard read path. Never
    raises — a failed background sync should not break the dashboard, it
    should just leave existing data in place for this request.
    """
    try:
        rows = pg_query(
            """SELECT id, last_synced_at FROM public.accounts
               WHERE subscription_status = 'active' AND meta_ads->>'access_token' IS NOT NULL
               ORDER BY updated_at DESC LIMIT 1"""
        )
        if not rows:
            return

        account_id = rows[0]["id"]
        last_synced_at = rows[0]["last_synced_at"]
        if last_synced_at is not None:
            age = datetime.now(timezone.utc) - last_synced_at
            if age < STALE_AFTER:
                return

        sync_account(account_id)
    except Exception as e:
        logger.warning("Background Meta sync skipped: %s", e)
