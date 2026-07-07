"""
ClickHouse Cloud client using clickhouse_connect.
Falls back to mock mode if env vars are not set.
"""
import os
import logging
from typing import Any, Optional
import clickhouse_connect

logger = logging.getLogger(__name__)

_client: Optional[Any] = None


def get_client() -> Optional[Any]:
    global _client
    if _client is not None:
        return _client

    host = os.getenv("CLICKHOUSE_HOST", "")
    if not host:
        logger.info("CLICKHOUSE_HOST not set — running in mock mode")
        return None

    try:
        _client = clickhouse_connect.get_client(
            host=host,
            user=os.getenv("CLICKHOUSE_USER", "default"),
            password=os.getenv("CLICKHOUSE_PASSWORD", ""),
            secure=os.getenv("CLICKHOUSE_SECURE", "true").lower() == "true",
        )
        result = _client.query("SELECT 1").result_set[0][0]
        logger.info("ClickHouse connected at %s (ping=%s)", host, result)
    except Exception as e:
        logger.warning("ClickHouse unavailable (%s) — falling back to mock data", e)
        _client = None

    return _client


def is_connected() -> bool:
    return get_client() is not None


def query(sql: str, params: Optional[dict] = None) -> list[dict]:
    """Run a SELECT query. Returns list of row dicts. Falls back to [] on error."""
    client = get_client()
    if client is None:
        return []
    try:
        result = client.query(sql, parameters=params or {})
        columns = result.column_names
        return [dict(zip(columns, row)) for row in result.result_rows]
    except Exception as e:
        logger.error("ClickHouse query failed: %s", e)
        return []


def insert(table: str, data: list[dict]) -> bool:
    """Insert rows into a ClickHouse table. Returns True on success."""
    client = get_client()
    if client is None or not data:
        return False
    try:
        columns = list(data[0].keys())
        rows = [[row[col] for col in columns] for row in data]
        client.insert(table, rows, column_names=columns)
        return True
    except Exception as e:
        logger.error("ClickHouse insert into %s failed: %s", table, e)
        return False
