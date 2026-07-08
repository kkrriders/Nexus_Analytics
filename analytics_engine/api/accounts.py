"""
Account connection endpoints.

Two audiences:
  - The logged-in user (via Supabase bearer token) — connects/reads their own
    ad platform credentials from the /setup flow and Settings page.
  - n8n (via shared secret header) — polls for active accounts, posts fetched
    campaign data back, and refreshes OAuth tokens. Matches the HTTP Request
    nodes in nexus_n8n_workflow.json and nexus_n8n_token_refresh.json.
"""
import os
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database.postgres_client import query as pg_query, execute as pg_execute
from database.clickhouse_schema import write_ingested_campaigns
from integrations.meta_ads import sync_account
from notifications import create_notification

logger = logging.getLogger(__name__)
router = APIRouter()

N8N_SHARED_SECRET = os.getenv("N8N_SHARED_SECRET", "")


def require_n8n_secret(x_n8n_secret: str = Header(default="")) -> None:
    if not N8N_SHARED_SECRET or x_n8n_secret != N8N_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing n8n secret")


# ── User-facing ───────────────────────────────────────────────────────────

class ConnectAccountBody(BaseModel):
    plan: str
    google_ads_developer_token: Optional[str] = None
    meta_ads_access_token: Optional[str] = None
    # Meta long-lived tokens don't carry an implicit account scope like Google's
    # developer token does — the ad account id must be collected separately so
    # the n8n ingestion workflow's Graph API node (meta_ads.account_id) has it.
    meta_ads_account_id: Optional[str] = None


@router.post("/accounts/connect")
async def connect_account(body: ConnectAccountBody, user: dict = Depends(get_current_user)):
    """Called from /setup once 'payment' completes — persists the pasted ad credentials."""
    if body.plan not in ("google", "meta", "both"):
        raise HTTPException(status_code=400, detail="plan must be 'google', 'meta', or 'both'")

    google_ads = {"connected": True, "developer_token": body.google_ads_developer_token} \
        if body.google_ads_developer_token else {}
    meta_ads = {"connected": True, "access_token": body.meta_ads_access_token,
                "account_id": body.meta_ads_account_id} \
        if body.meta_ads_access_token else {}

    existing = pg_query("SELECT id FROM public.accounts WHERE user_id = %(uid)s", {"uid": user["id"]})
    params = {
        "uid": user["id"],
        "plan": body.plan,
        "google_ads": json.dumps(google_ads),
        "meta_ads": json.dumps(meta_ads),
    }
    if existing:
        ok = pg_execute(
            """UPDATE public.accounts
               SET plan = %(plan)s, google_ads = %(google_ads)s, meta_ads = %(meta_ads)s,
                   subscription_status = 'active', updated_at = now()
               WHERE user_id = %(uid)s""",
            params,
        )
    else:
        ok = pg_execute(
            """INSERT INTO public.accounts (user_id, plan, google_ads, meta_ads, subscription_status)
               VALUES (%(uid)s, %(plan)s, %(google_ads)s, %(meta_ads)s, 'active')""",
            params,
        )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save account — is Postgres reachable?")
    return {"status": "connected"}


@router.get("/accounts/me")
async def get_my_account(user: dict = Depends(get_current_user)):
    rows = pg_query(
        """SELECT id, plan, google_ads, meta_ads, subscription_status,
                  last_synced_at, last_sync_error, created_at
           FROM public.accounts WHERE user_id = %(uid)s""",
        {"uid": user["id"]},
    )
    return rows[0] if rows else None


@router.post("/accounts/sync")
async def sync_my_account(user: dict = Depends(get_current_user)):
    """
    Manual 'Sync Now' — fetches fresh Meta ad data directly (no n8n involved)
    so the dashboard doesn't depend on any external service being up.
    """
    rows = pg_query("SELECT id FROM public.accounts WHERE user_id = %(uid)s", {"uid": user["id"]})
    if not rows:
        raise HTTPException(status_code=404, detail="No connected account for this user")
    try:
        return sync_account(rows[0]["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        create_notification(
            user_id=user["id"], level="critical", title="Ad account sync failed",
            body=str(e), link="/settings", dedup_key=f"sync_fail_{rows[0]['id']}",
        )
        create_notification(
            user_id=None, audience="admin", level="warning", title=f"Sync failed for {user.get('email', 'a user')}",
            body=str(e), link="/integrations", dedup_key=f"admin_sync_fail_{rows[0]['id']}",
        )
        raise HTTPException(status_code=502, detail=f"Meta sync failed: {e}")


# ── n8n-facing ────────────────────────────────────────────────────────────

@router.get("/accounts/active", dependencies=[Depends(require_n8n_secret)])
async def list_active_accounts():
    """Accounts for n8n to loop over — data ingestion and token refresh workflows."""
    return pg_query(
        """SELECT id AS account_id, plan AS name, google_ads, meta_ads
           FROM public.accounts WHERE subscription_status = 'active'"""
    )


class IngestBody(BaseModel):
    account_id: str
    account_name: Optional[str] = None
    fetched_at: Optional[str] = None
    platforms: dict


@router.post("/ingest/{account_id}", dependencies=[Depends(require_n8n_secret)])
async def ingest_account_data(account_id: str, body: IngestBody):
    """
    n8n posts normalized Google/Meta campaign data here after each fetch.
    Persists the real campaign rows into ClickHouse so the dashboard pipeline
    can read live data instead of the mock demo pipeline.
    """
    account_rows = pg_query("SELECT user_id FROM public.accounts WHERE id = %(id)s", {"id": account_id})
    if not account_rows:
        raise HTTPException(status_code=404, detail="Account not found")

    google_ads = body.platforms.get("google_ads", {}) or {}
    meta_ads = body.platforms.get("meta_ads", {}) or {}
    g_err = google_ads.get("error")
    m_err = meta_ads.get("error")
    error = g_err or m_err

    if google_ads.get("campaigns"):
        write_ingested_campaigns(account_id, "google_ads", google_ads["campaigns"])
    if meta_ads.get("campaigns"):
        write_ingested_campaigns(account_id, "meta_ads", meta_ads["campaigns"])

    ok = pg_execute(
        """UPDATE public.accounts
           SET last_synced_at = now(), last_sync_error = %(error)s, updated_at = now()
           WHERE id = %(id)s""",
        {"id": account_id, "error": error},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to record sync")

    if error:
        create_notification(
            user_id=account_rows[0]["user_id"], level="warning", title="Ad account sync failed",
            body=error, link="/settings", dedup_key=f"ingest_fail_{account_id}",
        )
        create_notification(
            user_id=None, audience="admin", level="warning", title="Ingestion sync failed",
            body=error, link="/integrations", dedup_key=f"admin_ingest_fail_{account_id}",
        )
    return {"status": "ok", "account_id": account_id}


class TokenUpdateBody(BaseModel):
    google_ads_access_token: Optional[str] = None
    google_ads_token_expires_at: Optional[str] = None


@router.patch("/accounts/{account_id}/tokens", dependencies=[Depends(require_n8n_secret)])
async def update_account_tokens(account_id: str, body: TokenUpdateBody):
    rows = pg_query("SELECT google_ads FROM public.accounts WHERE id = %(id)s", {"id": account_id})
    if not rows:
        raise HTTPException(status_code=404, detail="Account not found")

    google_ads = rows[0]["google_ads"] or {}
    if body.google_ads_access_token:
        google_ads["access_token"] = body.google_ads_access_token
    if body.google_ads_token_expires_at:
        google_ads["token_expires_at"] = body.google_ads_token_expires_at

    ok = pg_execute(
        "UPDATE public.accounts SET google_ads = %(g)s, updated_at = now() WHERE id = %(id)s",
        {"g": json.dumps(google_ads), "id": account_id},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update tokens")
    return {"status": "ok"}
