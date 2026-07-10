import os
import time
import httpx
from collections import defaultdict, deque
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from pipeline import run_pipeline, build_audience_data, build_creative_data, build_spend_analytics, _DEVICE_LABELS
from models.schemas import DashboardData, AudienceData, KeywordData, CreativeData, SpendAnalytics, BudgetOptimizerData
from optimization.budget_optimizer import build_budget_optimizer
from auth import require_admin, get_current_user
from database.postgres_client import query as pg_query, execute as pg_execute
from database.clickhouse_client import is_connected
from database.clickhouse_schema import has_real_ads, has_real_breakdowns, has_real_campaigns, read_real_breakdown
from ai.chat_engine import answer as chat_answer
from notifications import create_notification

router = APIRouter()

# Simple in-memory rate limit for /chat — each call proxies to DeepSeek (real
# API cost), so cap it per user. In-memory is fine at this scale (single
# Render instance, no multi-process/worker deployment); would need a shared
# store (e.g. Redis) if that ever changes.
_CHAT_RATE_LIMIT = 15          # max requests
_CHAT_RATE_WINDOW = 60.0       # per this many seconds
_chat_call_times: dict[str, deque] = defaultdict(deque)


def _check_chat_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    calls = _chat_call_times[user_id]
    while calls and now - calls[0] > _CHAT_RATE_WINDOW:
        calls.popleft()
    if len(calls) >= _CHAT_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many chat requests — please wait a moment and try again.")
    calls.append(now)


async def _account_id_for(user: dict) -> str | None:
    """The requesting user's own connected account id, or None if they haven't connected one."""
    rows = pg_query("SELECT id FROM public.accounts WHERE user_id = %(uid)s", {"uid": user["id"]})
    return rows[0]["id"] if rows else None


NOT_CONNECTED_DETAIL = "No connected ad account yet — connect one in Settings to see your data."


async def _require_dashboard(user: dict, days: int = 30) -> DashboardData:
    """run_pipeline() result, or a 404 — there is no synthetic fallback."""
    data = run_pipeline(await _account_id_for(user), days=days)
    if data is None:
        raise HTTPException(status_code=404, detail=NOT_CONNECTED_DETAIL)
    return data


def _recommendation_actions(user_id: str) -> dict[tuple[str, str], str]:
    """Map of (campaign_id, rec_type) -> 'approved'|'rejected' for this user's past decisions."""
    rows = pg_query(
        "SELECT campaign_id, rec_type, action FROM public.recommendation_actions WHERE user_id = %(uid)s",
        {"uid": user_id},
    )
    return {(r["campaign_id"], r["rec_type"]): r["action"] for r in rows}


def _apply_recommendation_actions(recommendations: list, user_id: str) -> list:
    """Attach each user's approve/reject decision and drop rejected recommendations."""
    actions = _recommendation_actions(user_id)
    if not actions:
        return recommendations
    kept = []
    for r in recommendations:
        action = actions.get((r.campaign_id, r.type))
        if action == "rejected":
            continue
        if action == "approved":
            r = r.model_copy(update={"status": "approved"})
        kept.append(r)
    return kept


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(days: int = Query(30, ge=7, le=90), user: dict = Depends(get_current_user)):
    """Full dashboard payload — KPIs, campaigns, alerts, recommendations, forecasts."""
    data = await _require_dashboard(user, days=days)
    data.recommendations = _apply_recommendation_actions(data.recommendations, user["id"])

    for alert in data.alerts:
        if alert.severity == "critical":
            create_notification(
                user_id=user["id"], level="critical", title=alert.message, body=alert.detail,
                link="/dashboard", dedup_key=f"{alert.id.rsplit('_', 1)[0]}_{date.today().isoformat()}",
            )
    return data


@router.get("/campaigns")
async def get_campaigns(days: int = Query(30, ge=7, le=90), user: dict = Depends(get_current_user)):
    """Campaign list with metrics, health, and history for Campaign Analytics page."""
    return (await _require_dashboard(user, days=days)).campaigns


@router.get("/budget-optimizer", response_model=BudgetOptimizerData)
async def get_budget_optimizer(
    total_budget: Optional[float] = Query(default=None, gt=0),
    days: int = Query(30, ge=7, le=90),
    user: dict = Depends(get_current_user),
):
    """
    Where spend is underperforming this account's own best campaign, and how a
    (real or hypothetical) budget should be split for the best real-ROAS return.
    Uses the same campaigns/metrics as Campaign Analytics — no separate data source.
    """
    dashboard = await _require_dashboard(user, days=days)
    data = build_budget_optimizer(dashboard.campaigns, total_budget=total_budget)
    if data is None:
        raise HTTPException(status_code=404, detail="No active campaigns to optimize yet.")
    return data


@router.get("/spend", response_model=SpendAnalytics)
async def get_spend_analytics(user: dict = Depends(get_current_user)):
    """All-time spend across every day ever ingested — not bounded by the 7/30/90-day picker."""
    account_id = await _account_id_for(user)
    data = build_spend_analytics(account_id) if (is_connected() and account_id and has_real_campaigns(account_id)) else None
    if data is None:
        raise HTTPException(status_code=404, detail="No spend data yet — connect an ad account and sync it in Settings.")
    return data


@router.get("/campaigns/{campaign_id}/device-breakdown")
async def get_campaign_device_breakdown(campaign_id: str, user: dict = Depends(get_current_user)):
    """Real device-split for one campaign — empty list (not fake data) until synced."""
    account_id = await _account_id_for(user)
    if not (is_connected() and account_id):
        return {"devices": []}

    rows = read_real_breakdown(account_id, "device_platform", campaign_id=campaign_id)
    totals: dict[str, int] = {}
    for r in rows:
        label = _DEVICE_LABELS.get(r["breakdown_value"], str(r["breakdown_value"]).title())
        totals[label] = totals.get(label, 0) + int(r["impressions"])
    total = sum(totals.values()) or 1
    devices = sorted(
        [{"label": label, "pct": round(impr / total * 100, 1)} for label, impr in totals.items()],
        key=lambda d: -d["pct"],
    )
    return {"devices": devices}


@router.get("/recommendations")
async def get_recommendations(user: dict = Depends(get_current_user)):
    """AI recommendations list plus aggregate KPIs (used by AI Recommendations page)."""
    data = await _require_dashboard(user)
    recs = _apply_recommendation_actions(data.recommendations, user["id"])
    return {"recommendations": recs, "kpis": data.kpis}


class RecommendationActionBody(BaseModel):
    campaign_id: str
    type: str
    title: str
    action: str  # "approved" | "rejected"


@router.post("/recommendations/action")
async def act_on_recommendation(body: RecommendationActionBody, user: dict = Depends(get_current_user)):
    """Approve or reject a recommendation. Persists per (user, campaign, type) so the
    decision survives the next 5-minute pipeline regeneration."""
    if body.action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="action must be 'approved' or 'rejected'")

    ok = pg_execute(
        """INSERT INTO public.recommendation_actions (user_id, campaign_id, rec_type, rec_title, action)
           VALUES (%(uid)s, %(cid)s, %(rtype)s, %(title)s, %(action)s)
           ON CONFLICT (user_id, campaign_id, rec_type)
           DO UPDATE SET action = %(action)s, rec_title = %(title)s, created_at = now()""",
        {"uid": user["id"], "cid": body.campaign_id, "rtype": body.type, "title": body.title, "action": body.action},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save decision — is Postgres reachable?")
    return {"status": "ok", "action": body.action}


@router.get("/forecasts")
async def get_forecasts(days: int = Query(30, ge=7, le=90), user: dict = Depends(get_current_user)):
    """Metric forecasts + aggregated trend history (used by Trend Forecasting page)."""
    data = await _require_dashboard(user, days=days)
    return {"forecasts": data.forecasts, "trend_history": data.trend_history, "kpis": data.kpis}


@router.get("/audience", response_model=AudienceData)
async def get_audience(user: dict = Depends(get_current_user)):
    """Real audience demographics/device/geo from ingested ad-account data. No mock fallback — 404 until an account is connected and synced."""
    account_id = await _account_id_for(user)
    data = build_audience_data(account_id) if (is_connected() and account_id and has_real_breakdowns(account_id)) else None
    if data is None:
        raise HTTPException(status_code=404, detail="No audience data yet — connect an ad account and sync it in Settings.")
    return data


@router.get("/keywords", response_model=KeywordData)
async def get_keywords(user: dict = Depends(get_current_user)):
    """Keyword-level reporting is a Google Ads concept (not available for Meta). Not yet ingested — 404 until Google Ads keyword sync is connected."""
    raise HTTPException(status_code=404, detail="Keyword data isn't connected yet — Google Ads keyword sync is required.")


@router.get("/creatives", response_model=CreativeData)
async def get_creatives(user: dict = Depends(get_current_user)):
    """Real per-ad fatigue/CTR from ingested ad-account data. No mock fallback — 404 until an account is connected and synced."""
    account_id = await _account_id_for(user)
    data = build_creative_data(account_id) if (is_connected() and account_id and has_real_ads(account_id)) else None
    if data is None:
        raise HTTPException(status_code=404, detail="No creative data yet — connect an ad account and sync it in Settings.")
    return data


@router.get("/health")
async def health():
    return {"status": "ok"}


class ChatBody(BaseModel):
    message: str


@router.post("/chat")
async def chat(body: ChatBody, user: dict = Depends(get_current_user)):
    """Dashboard chatbot — rule-based against live data first, DeepSeek fallback for anything else."""
    _check_chat_rate_limit(user["id"])
    data = await _require_dashboard(user)
    return chat_answer(body.message, data)


@router.get("/admin/users")
async def get_admin_users(_admin: dict = Depends(require_admin)):
    """List all accounts (admin console). Auth users + role/full_name from public.users."""
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{supabase_url}/auth/v1/admin/users",
            headers={"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}"},
            timeout=10.0,
        )
    resp.raise_for_status()
    auth_users = resp.json().get("users", [])

    profiles = {row["id"]: row for row in pg_query("SELECT id, role, full_name, is_active, last_login_at FROM public.users")}

    return [
        {
            "id": u["id"],
            "email": u["email"],
            "full_name": profiles.get(u["id"], {}).get("full_name"),
            "role": profiles.get(u["id"], {}).get("role", "member"),
            "is_active": profiles.get(u["id"], {}).get("is_active", True),
            "last_sign_in_at": u.get("last_sign_in_at"),
            "created_at": u.get("created_at"),
        }
        for u in auth_users
    ]


class RoleUpdate(BaseModel):
    role: str


@router.patch("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, body: RoleUpdate, admin: dict = Depends(require_admin)):
    """Promote/demote a user. Admin-only; an admin cannot demote their own account."""
    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'member'")
    if user_id == admin["id"] and body.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot change your own admin role")

    ok = pg_execute("UPDATE public.users SET role = %(role)s, updated_at = now() WHERE id = %(id)s", {"role": body.role, "id": user_id})
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update role")
    return {"id": user_id, "role": body.role}
