"""
Supabase Auth verification for FastAPI routes.
Access tokens are verified by asking Supabase directly (GET /auth/v1/user)
rather than decoding the JWT locally, since Supabase signs session tokens
with a per-project key we don't hold a local copy of.
"""
import os
import httpx
from fastapi import Depends, Header, HTTPException

from database.postgres_client import query as pg_query

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")


async def get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return resp.json()


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    rows = pg_query("SELECT role FROM public.users WHERE id = %(id)s", {"id": current_user["id"]})
    if not rows or rows[0]["role"] != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return current_user
