"""
Admin-facing view of every connected ad account — replaces what used to be a
fully static mock page in nexus-admin with real account/connection data.
Only Meta Ads supports on-demand sync today (see integrations/meta_ads.py);
Google Ads data only arrives via the n8n ingestion path.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from auth import require_admin
from database.postgres_client import query as pg_query, execute as pg_execute
from integrations.meta_ads import sync_account

logger = logging.getLogger(__name__)
router = APIRouter()


def _mask_token(token: str | None) -> str | None:
    if not token:
        return None
    if len(token) <= 4:
        return "•" * len(token)
    return f"{'•' * (len(token) - 4)}{token[-4:]}"


def _platform_view(platform: dict) -> dict:
    platform = platform or {}
    return {
        "connected": bool(platform.get("connected")),
        "token_preview": _mask_token(platform.get("access_token") or platform.get("developer_token")),
    }


@router.get("/admin/integrations")
async def list_integrations(_admin: dict = Depends(require_admin)):
    """Every connected account, with owner info and masked credentials."""
    rows = pg_query(
        """SELECT a.id, a.user_id, u.email, u.full_name, a.plan, a.subscription_status,
                  a.google_ads, a.meta_ads, a.last_synced_at, a.last_sync_error, a.created_at
           FROM public.accounts a
           JOIN public.users u ON u.id = a.user_id
           ORDER BY a.created_at DESC""",
    )
    return [
        {
            "account_id": r["id"],
            "owner_email": r["email"],
            "owner_name": r["full_name"],
            "plan": r["plan"],
            "subscription_status": r["subscription_status"],
            "last_synced_at": r["last_synced_at"],
            "last_sync_error": r["last_sync_error"],
            "google_ads": _platform_view(r["google_ads"]),
            "meta_ads": _platform_view(r["meta_ads"]),
        }
        for r in rows
    ]


@router.post("/admin/integrations/sync-all")
async def sync_all_integrations(_admin: dict = Depends(require_admin)):
    """Sync every account with a connected Meta Ads token (the only platform with direct sync)."""
    rows = pg_query(
        """SELECT id FROM public.accounts
           WHERE subscription_status = 'active' AND meta_ads->>'access_token' IS NOT NULL"""
    )
    synced, failed = [], []
    for row in rows:
        try:
            sync_account(row["id"])
            synced.append(row["id"])
        except Exception as e:
            logger.warning("Admin sync-all: account %s failed: %s", row["id"], e)
            failed.append({"account_id": row["id"], "error": str(e)})
    return {"synced": synced, "failed": failed}


@router.post("/admin/integrations/{account_id}/sync")
async def sync_one_integration(account_id: str, _admin: dict = Depends(require_admin)):
    try:
        return sync_account(account_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Sync failed: {e}")


@router.post("/admin/integrations/{account_id}/disconnect/{platform}")
async def disconnect_integration(account_id: str, platform: str, _admin: dict = Depends(require_admin)):
    if platform == "google_ads":
        sql = "UPDATE public.accounts SET google_ads = '{}'::jsonb, updated_at = now() WHERE id = %(id)s"
    elif platform == "meta_ads":
        sql = "UPDATE public.accounts SET meta_ads = '{}'::jsonb, updated_at = now() WHERE id = %(id)s"
    else:
        raise HTTPException(status_code=400, detail="platform must be 'google_ads' or 'meta_ads'")

    ok = pg_execute(sql, {"id": account_id})
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to disconnect")
    return {"status": "ok", "account_id": account_id, "platform": platform}
