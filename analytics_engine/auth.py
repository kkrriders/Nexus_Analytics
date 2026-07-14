"""
Supabase Auth verification for FastAPI routes.
Access tokens are verified by asking Supabase directly (GET /auth/v1/user)
rather than decoding the JWT locally, since Supabase signs session tokens
with a per-project key we don't hold a local copy of.
"""
import os
import time
import httpx
from fastapi import Depends, Header, HTTPException

from database.postgres_client import query as pg_query

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# A live Supabase round trip on every single API call adds real latency to
# every dashboard request. Cache verified tokens briefly — in-memory is fine
# at this scale (single Render instance, same reasoning as the rate limiters
# in routes.py/accounts.py). A revoked token can stay valid for up to this
# TTL, which is an acceptable trade for cutting an external call out of the
# hot path on (almost) every request.
_USER_CACHE_TTL = 60.0
_user_cache: dict[str, tuple[dict, float]] = {}


async def get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    now = time.monotonic()
    cached = _user_cache.get(token)
    if cached is not None and now - cached[1] < _USER_CACHE_TTL:
        return cached[0]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = resp.json()
    _user_cache[token] = (user, now)
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    rows = pg_query("SELECT role FROM public.users WHERE id = %(id)s", {"id": current_user["id"]})
    if not rows or rows[0]["role"] != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return current_user
