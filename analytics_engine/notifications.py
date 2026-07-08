"""
Notification write helper, shared by the pipeline (critical alerts), account
sync (failures), and n8n ingestion (failures). Reads/list endpoints live in
api/notifications.py.
"""
import logging
from typing import Optional

from database.postgres_client import execute as pg_execute

logger = logging.getLogger(__name__)


def create_notification(
    *,
    user_id: Optional[str],
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
    level: str = "info",
    audience: str = "user",
    dedup_key: Optional[str] = None,
) -> bool:
    """Insert a notification. `dedup_key` (scoped per user/admin) silently no-ops
    on repeat instead of spamming duplicates — pass one for anything that could
    otherwise fire repeatedly for the same underlying issue."""
    scope_key = user_id if user_id else "admin"
    params = {
        "user_id": user_id, "scope_key": scope_key, "audience": audience,
        "level": level, "title": title, "body": body, "link": link, "dedup_key": dedup_key,
    }
    if dedup_key:
        sql = """
            INSERT INTO public.notifications (user_id, scope_key, audience, level, title, body, link, dedup_key)
            VALUES (%(user_id)s, %(scope_key)s, %(audience)s, %(level)s, %(title)s, %(body)s, %(link)s, %(dedup_key)s)
            ON CONFLICT (scope_key, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
        """
    else:
        sql = """
            INSERT INTO public.notifications (user_id, scope_key, audience, level, title, body, link, dedup_key)
            VALUES (%(user_id)s, %(scope_key)s, %(audience)s, %(level)s, %(title)s, %(body)s, %(link)s, %(dedup_key)s)
        """
    ok = pg_execute(sql, params)
    if not ok:
        logger.warning("Failed to write notification: %s", title)
    return ok
