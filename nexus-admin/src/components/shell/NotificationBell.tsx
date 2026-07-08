"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from "@/lib/api";

type Notification = {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const LEVEL_ICON: Record<string, string> = { critical: "error", warning: "warning", info: "info" };
const LEVEL_COLOR: Record<string, string> = { critical: "text-error", warning: "text-warning", info: "text-primary" };

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminNotifications();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Bell degrades silently if the engine is unreachable.
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const handleItemClick = (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markAdminNotificationRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    markAllAdminNotificationsRead().catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant relative"
        aria-label="Notifications"
      >
        <Icon name="notifications" className="text-[20px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-96 overflow-y-auto custom-scrollbar bg-surface-bright border border-outline-variant rounded-[10px] shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-outline-variant">
            <span className="text-[13px] font-semibold text-on-surface">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-[12px] text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-on-surface-variant">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={clsx(
                  "w-full text-left px-3 py-2.5 border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors flex gap-2",
                  !n.read && "bg-primary-container/20",
                )}
              >
                <Icon name={LEVEL_ICON[n.level] ?? "info"} className={clsx("text-[16px] mt-0.5 shrink-0", LEVEL_COLOR[n.level] ?? "text-primary")} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-on-surface truncate">{n.title}</span>
                  {n.body && <span className="block text-[11.5px] text-on-surface-variant line-clamp-2 mt-0.5">{n.body}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
