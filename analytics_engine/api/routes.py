import os
import time
import httpx
from collections import defaultdict, deque
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pipeline import run_pipeline
from models.schemas import DashboardData, AudienceData, KeywordData, CreativeData
from preprocessing.mock_generator import (
    generate_audience_data, generate_keyword_data, generate_creative_data, current_window_seed,
)
from auth import require_admin, get_current_user
from database.postgres_client import query as pg_query, execute as pg_execute
from ai.chat_engine import answer as chat_answer

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


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(user: dict = Depends(get_current_user)):
    """Full dashboard payload — KPIs, campaigns, alerts, recommendations, forecasts."""
    return run_pipeline(await _account_id_for(user))


@router.get("/campaigns")
async def get_campaigns(user: dict = Depends(get_current_user)):
    """Campaign list with metrics, health, and history for Campaign Analytics page."""
    return run_pipeline(await _account_id_for(user)).campaigns


@router.get("/recommendations")
async def get_recommendations(user: dict = Depends(get_current_user)):
    """AI recommendations list plus aggregate KPIs (used by AI Recommendations page)."""
    data = run_pipeline(await _account_id_for(user))
    return {"recommendations": data.recommendations, "kpis": data.kpis}


@router.get("/forecasts")
async def get_forecasts(user: dict = Depends(get_current_user)):
    """Metric forecasts + 30-day aggregated trend history (used by Trend Forecasting page)."""
    data = run_pipeline(await _account_id_for(user))
    return {"forecasts": data.forecasts, "trend_history": data.trend_history, "kpis": data.kpis}


@router.get("/audience", response_model=AudienceData)
async def get_audience(user: dict = Depends(get_current_user)):
    """Audience analytics — demographic, device, geographic, and interest data. Currently mock/illustrative for every account."""
    return generate_audience_data(current_window_seed())


@router.get("/keywords", response_model=KeywordData)
async def get_keywords(user: dict = Depends(get_current_user)):
    """Keyword analytics — search volume, CTR, quality scores, and opportunity heatmap. Currently mock/illustrative for every account."""
    return generate_keyword_data(current_window_seed())


@router.get("/creatives", response_model=CreativeData)
async def get_creatives(user: dict = Depends(get_current_user)):
    """Creative analytics — fatigue scores, CTR, and AI recommendations per creative. Currently mock/illustrative for every account."""
    return generate_creative_data(current_window_seed())


@router.get("/health")
async def health():
    return {"status": "ok"}


class ChatBody(BaseModel):
    message: str


@router.post("/chat")
async def chat(body: ChatBody, user: dict = Depends(get_current_user)):
    """Dashboard chatbot — rule-based against live data first, DeepSeek fallback for anything else."""
    _check_chat_rate_limit(user["id"])
    return chat_answer(body.message, run_pipeline(await _account_id_for(user)))


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
