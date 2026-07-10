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
from database.clickhouse_schema import (
    write_ingested_campaigns, write_ingested_ads, write_ingested_breakdowns, write_targeted_interests,
)

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v19.0"
STALE_AFTER = timedelta(hours=6)


def _extract_conversions(r: dict) -> tuple[int, float]:
    """Sum 'purchase' actions/action_values out of a raw insights row."""
    purchases = [a for a in (r.get("actions") or []) if a.get("action_type") == "purchase"]
    purchase_values = [a for a in (r.get("action_values") or []) if a.get("action_type") == "purchase"]
    conversions = sum(int(a.get("value") or 0) for a in purchases)
    revenue = sum(float(a.get("value") or 0) for a in purchase_values)
    return conversions, revenue


def _normalize_meta_campaigns(raw_rows: list[dict]) -> list[dict]:
    campaigns = []
    for r in raw_rows:
        conversions, revenue = _extract_conversions(r)
        campaigns.append({
            "campaign_id":   str(r.get("campaign_id") or ""),
            "campaign_name": str(r.get("campaign_name") or ""),
            "impressions":   int(r.get("impressions") or 0),
            "clicks":        int(r.get("clicks") or 0),
            "spend":         float(r.get("spend") or 0),
            "conversions":   conversions,
            "revenue":       revenue,
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


def _normalize_meta_ads(raw_rows: list[dict]) -> list[dict]:
    ads = []
    for r in raw_rows:
        conversions, revenue = _extract_conversions(r)
        ads.append({
            "ad_id":         str(r.get("ad_id") or ""),
            "ad_name":       str(r.get("ad_name") or ""),
            "campaign_id":   str(r.get("campaign_id") or ""),
            "campaign_name": str(r.get("campaign_name") or ""),
            "impressions":   int(r.get("impressions") or 0),
            "clicks":        int(r.get("clicks") or 0),
            "spend":         float(r.get("spend") or 0),
            "conversions":   conversions,
            "revenue":       revenue,
        })
    return ads


def fetch_meta_ads(access_token: str, account_id: str) -> list[dict]:
    """Fetch today's ad-level insights (by ad name) for one Meta ad account."""
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "ad_id,ad_name,campaign_id,campaign_name,impressions,clicks,spend,actions,action_values",
        "date_preset": "today",
        "level": "ad",
        "access_token": access_token,
    }
    resp = httpx.get(url, params=params, timeout=20.0)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    return _normalize_meta_ads(data)


# Account-wide breakdown dimensions that power Audience Analytics.
# Meta's Insights `breakdowns` param returns one extra field per row named
# after the breakdown itself (e.g. "age", "device_platform", "country").
BREAKDOWN_FIELDS = {"age": "age", "device_platform": "device_platform", "country": "country", "region": "region"}


def fetch_meta_breakdown(access_token: str, account_id: str, breakdown: str, campaign_id: Optional[str] = None) -> list[dict]:
    """
    Fetch today's insights split by one breakdown dimension ("age",
    "device_platform", or "country"). Account-wide by default; pass
    campaign_id to scope it to one campaign instead (campaign drill-down).
    """
    field = BREAKDOWN_FIELDS[breakdown]
    level = "campaign" if campaign_id else "account"
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "campaign_id,impressions,clicks,spend,reach,actions,action_values",
        "breakdowns": field,
        "date_preset": "today",
        "level": level,
        "access_token": access_token,
    }
    if campaign_id:
        params["filtering"] = f'[{{"field":"campaign.id","operator":"EQUAL","value":"{campaign_id}"}}]'
    resp = httpx.get(url, params=params, timeout=20.0)
    resp.raise_for_status()
    data = resp.json().get("data", [])

    rows = []
    for r in data:
        conversions, revenue = _extract_conversions(r)
        rows.append({
            "breakdown_type":  breakdown,
            "breakdown_value": str(r.get(field) or "unknown"),
            "campaign_id":     str(r.get("campaign_id") or ""),
            "impressions":     int(r.get("impressions") or 0),
            "clicks":          int(r.get("clicks") or 0),
            "spend":           float(r.get("spend") or 0),
            "reach":           int(r.get("reach") or 0),
            "conversions":     conversions,
            "revenue":         revenue,
        })
    return rows


def fetch_ad_creatives(access_token: str, ad_ids: list[str]) -> dict[str, dict]:
    """Batch-fetch creative metadata (title, thumbnail, type) for a list of ad ids."""
    if not ad_ids:
        return {}
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/"
    params = {
        "ids": ",".join(ad_ids),
        "fields": "creative{title,body,thumbnail_url,object_type}",
        "access_token": access_token,
    }
    resp = httpx.get(url, params=params, timeout=20.0)
    resp.raise_for_status()
    data = resp.json()

    creatives = {}
    for ad_id, obj in data.items():
        c = obj.get("creative") or {}
        creatives[ad_id] = {
            "title":         str(c.get("title") or c.get("body") or ""),
            "thumbnail_url": str(c.get("thumbnail_url") or ""),
            "object_type":   str(c.get("object_type") or "image").lower(),
        }
    return creatives


def fetch_ad_set_targeting(access_token: str, account_id: str) -> list[dict]:
    """Real targeted interests per ad set — replaces guessed audience affinity."""
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/act_{account_id}/adsets"
    params = {
        "fields": "id,name,targeting{flexible_spec,interests}",
        "limit": 100,
        "access_token": access_token,
    }
    resp = httpx.get(url, params=params, timeout=20.0)
    resp.raise_for_status()
    data = resp.json().get("data", [])

    targeting = []
    for adset in data:
        t = adset.get("targeting") or {}
        interests = list(t.get("interests") or [])
        for spec in (t.get("flexible_spec") or []):
            interests.extend(spec.get("interests") or [])
        for interest in interests:
            name = interest.get("name")
            if name:
                targeting.append({"adset_id": adset.get("id", ""), "interest": name})
    return targeting


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

        # Best-effort extras — a failure here should not fail the whole sync,
        # since campaign data (above) is what the dashboard actually depends on.
        try:
            ads = fetch_meta_ads(token, ad_account_id)
            ad_ids = [a["ad_id"] for a in ads if a["ad_id"]]
            creatives = fetch_ad_creatives(token, ad_ids)
            write_ingested_ads(account_id, "meta_ads", ads, creatives)
        except Exception as e:
            logger.warning("Meta ad-level sync skipped for account %s: %s", account_id, e)

        try:
            breakdown_rows = []
            for dim in BREAKDOWN_FIELDS:
                try:
                    breakdown_rows.extend(fetch_meta_breakdown(token, ad_account_id, dim))
                except Exception as e:
                    logger.warning("Meta '%s' breakdown skipped for account %s: %s", dim, account_id, e)
            # Per-campaign device split too — powers the Campaign Analytics drill-down.
            for c in campaigns:
                cid = c.get("campaign_id")
                if not cid:
                    continue
                try:
                    breakdown_rows.extend(fetch_meta_breakdown(token, ad_account_id, "device_platform", campaign_id=cid))
                except Exception as e:
                    logger.warning("Meta per-campaign device breakdown skipped for campaign %s: %s", cid, e)
            write_ingested_breakdowns(account_id, "meta_ads", breakdown_rows)
        except Exception as e:
            logger.warning("Meta breakdown sync skipped for account %s: %s", account_id, e)

        try:
            targeting = fetch_ad_set_targeting(token, ad_account_id)
            write_targeted_interests(account_id, targeting)
        except Exception as e:
            logger.warning("Meta targeting sync skipped for account %s: %s", account_id, e)
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


def sync_if_stale(account_id: str) -> None:
    """
    Best-effort auto-refresh for one specific account, called from the
    dashboard read path once we know which account the requesting user owns.
    Never raises — a failed background sync should not break the dashboard,
    it should just leave existing data in place for this request.
    """
    try:
        rows = pg_query(
            """SELECT last_synced_at FROM public.accounts
               WHERE id = %(id)s AND subscription_status = 'active'
                 AND meta_ads->>'access_token' IS NOT NULL""",
            {"id": account_id},
        )
        if not rows:
            return

        last_synced_at = rows[0]["last_synced_at"]
        if last_synced_at is not None:
            age = datetime.now(timezone.utc) - last_synced_at
            if age < STALE_AFTER:
                return

        sync_account(account_id)
    except Exception as e:
        logger.warning("Background Meta sync skipped for account %s: %s", account_id, e)
