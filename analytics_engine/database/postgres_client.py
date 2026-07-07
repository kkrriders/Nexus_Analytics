"""
Supabase Postgres client using psycopg2, for user accounts / auth data.
Falls back to mock mode if env vars are not set. Kept separate from
ClickHouse, which stays dedicated to analytics/metrics data.
"""
import os
import logging
from contextlib import contextmanager
from typing import Optional
import psycopg2
import psycopg2.pool
import psycopg2.extras

logger = logging.getLogger(__name__)

_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None


def get_pool() -> Optional[psycopg2.pool.SimpleConnectionPool]:
    global _pool
    if _pool is not None:
        return _pool

    host = os.getenv("SUPABASE_DB_HOST", "")
    if not host:
        logger.info("SUPABASE_DB_HOST not set — running in mock mode")
        return None

    try:
        _pool = psycopg2.pool.SimpleConnectionPool(
            1,
            10,
            host=host,
            port=os.getenv("SUPABASE_DB_PORT", "5432"),
            dbname=os.getenv("SUPABASE_DB_NAME", "postgres"),
            user=os.getenv("SUPABASE_DB_USER", "postgres"),
            password=os.getenv("SUPABASE_DB_PASSWORD", ""),
            sslmode=os.getenv("SUPABASE_DB_SSLMODE", "require"),
        )
        with _pool.getconn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
            _pool.putconn(conn)
        logger.info("Supabase Postgres connected at %s", host)
    except Exception as e:
        logger.warning("Supabase Postgres unavailable (%s) — falling back to mock data", e)
        _pool = None

    return _pool


def is_connected() -> bool:
    return get_pool() is not None


@contextmanager
def get_connection():
    pool = get_pool()
    if pool is None:
        raise RuntimeError("Postgres pool is not available")
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)


def query(sql: str, params: Optional[dict] = None) -> list[dict]:
    """Run a SELECT query. Returns list of row dicts. Falls back to [] on error."""
    pool = get_pool()
    if pool is None:
        return []
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params or {})
                return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error("Postgres query failed: %s", e)
        return []


def execute(sql: str, params: Optional[dict] = None) -> bool:
    """Run an INSERT/UPDATE/DELETE. Returns True on success."""
    pool = get_pool()
    if pool is None:
        return False
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or {})
            conn.commit()
        return True
    except Exception as e:
        logger.error("Postgres execute failed: %s", e)
        return False
