import sys
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.accounts import router as accounts_router
from api.notifications import router as notifications_router
from api.admin_integrations import router as admin_integrations_router
from database.clickhouse_client import get_client, is_connected
from database.clickhouse_schema import create_tables
from ai.deepseek_client import get_client as get_deepseek, is_available as deepseek_available

app = FastAPI(
    title="Nexus Analytics Engine",
    description=(
        "AI Marketing Analytics — "
        "pipeline writes processed metrics to ClickHouse, "
        "DeepSeek reads from ClickHouse and writes recommendations back."
    ),
    version="1.1.0",
)

_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(accounts_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(admin_integrations_router, prefix="/api")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.on_event("startup")
async def startup():
    get_client()     # Attempt ClickHouse connection; logs result
    get_deepseek()   # Attempt DeepSeek init; logs result

    ch_ok = is_connected()
    if ch_ok:
        create_tables()   # Create all 6 tables if not present

    db_mode = "ClickHouse (live write-back)" if ch_ok else "Mock Data (no persistence)"
    ai_mode = "DeepSeek ON (reads ClickHouse -> writes recs)" if deepseek_available() else "AI OFF (rule-based)"

    print(f"\n{'='*60}")
    print(f"  Nexus Analytics Engine  v1.1.0")
    print(f"  Database : {db_mode}")
    print(f"  AI       : {ai_mode}")
    print(f"  Docs     : http://localhost:8000/docs")
    print(f"{'='*60}\n")
