import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user, require_admin
from database.postgres_client import query as pg_query, execute as pg_execute

router = APIRouter()

DEFAULT_NOTIFICATION_PREFS = {
    "criticalAlerts": True, "weeklySummary": True, "aiDigest": True, "productUpdates": False,
}


class NotificationPrefs(BaseModel):
    criticalAlerts: bool = True
    weeklySummary: bool = True
    aiDigest: bool = True
    productUpdates: bool = False


@router.get("/settings/notification-prefs")
async def get_notification_prefs(user: dict = Depends(get_current_user)):
    rows = pg_query("SELECT notification_prefs FROM public.users WHERE id = %(uid)s", {"uid": user["id"]})
    return rows[0]["notification_prefs"] if rows and rows[0]["notification_prefs"] else DEFAULT_NOTIFICATION_PREFS


@router.put("/settings/notification-prefs")
async def set_notification_prefs(prefs: NotificationPrefs, user: dict = Depends(get_current_user)):
    ok = pg_execute(
        "UPDATE public.users SET notification_prefs = %(prefs)s, updated_at = now() WHERE id = %(uid)s",
        {"prefs": json.dumps(prefs.model_dump()), "uid": user["id"]},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to save notification preferences")
    return {"status": "ok"}


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    rows = pg_query(
        """SELECT id, level, title, body, link, read, created_at FROM public.notifications
           WHERE scope_key = %(sk)s ORDER BY created_at DESC LIMIT 50""",
        {"sk": user["id"]},
    )
    return {"notifications": rows, "unread_count": sum(1 for r in rows if not r["read"])}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    ok = pg_execute(
        "UPDATE public.notifications SET read = true WHERE id = %(id)s AND scope_key = %(sk)s",
        {"id": notification_id, "sk": user["id"]},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update notification")
    return {"status": "ok"}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    ok = pg_execute(
        "UPDATE public.notifications SET read = true WHERE scope_key = %(sk)s AND read = false",
        {"sk": user["id"]},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update notifications")
    return {"status": "ok"}


@router.get("/admin/notifications")
async def list_admin_notifications(_admin: dict = Depends(require_admin)):
    rows = pg_query(
        """SELECT id, level, title, body, link, read, created_at FROM public.notifications
           WHERE scope_key = 'admin' ORDER BY created_at DESC LIMIT 50"""
    )
    return {"notifications": rows, "unread_count": sum(1 for r in rows if not r["read"])}


@router.post("/admin/notifications/{notification_id}/read")
async def mark_admin_notification_read(notification_id: str, _admin: dict = Depends(require_admin)):
    ok = pg_execute(
        "UPDATE public.notifications SET read = true WHERE id = %(id)s AND scope_key = 'admin'",
        {"id": notification_id},
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update notification")
    return {"status": "ok"}


@router.post("/admin/notifications/read-all")
async def mark_all_admin_notifications_read(_admin: dict = Depends(require_admin)):
    ok = pg_execute("UPDATE public.notifications SET read = true WHERE scope_key = 'admin' AND read = false")
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update notifications")
    return {"status": "ok"}
