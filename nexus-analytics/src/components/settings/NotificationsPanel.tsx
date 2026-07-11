"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from "@/lib/api";

// Only criticalAlerts is backed by a real send path today (the in-app
// notification bell — see analytics_engine/notifications.py). The other three
// are shown but disabled until a weekly-digest job / AI-digest trigger /
// changelog feed actually exists to gate.
const PREFS = [
  { id: "criticalAlerts", label: "Critical alerts", desc: "Budget overruns, sync failures, and account errors — shown in the notification bell.", live: true },
  { id: "weeklySummary", label: "Weekly performance summary", desc: "A digest of KPIs across all connected platforms.", live: false },
  { id: "aiDigest", label: "AI recommendation digest", desc: "New AI-suggested optimizations as they're generated.", live: false },
  { id: "productUpdates", label: "Product updates", desc: "New features, changelogs, and platform announcements.", live: false },
] as const;

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        disabled ? "opacity-40 cursor-not-allowed" : "",
        checked ? "bg-primary" : "bg-outline-variant",
      )}
    >
      <span
        className={clsx(
          "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

export function NotificationsPanel() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotificationPrefs().then(setPrefs).catch((e) => setError(e.message));
  }, []);

  async function update(id: keyof NotificationPrefs, value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [id]: value };
    setPrefs(next);
    try {
      await saveNotificationPrefs(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences.");
      setPrefs(prefs);
    }
  }

  return (
    <Card className="p-card-padding">
      <CardHeader
        title="Notification Preferences"
        icon="notifications"
        action={saved ? <span className="text-body-sm text-tertiary">Saved</span> : undefined}
      />

      {error && (
        <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 text-body-sm mb-4">
          <Icon name="error" className="text-[18px] mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!prefs ? (
        <p className="text-body-sm text-on-surface-variant py-6 text-center">Loading preferences…</p>
      ) : (
        <div className="flex flex-col">
          {PREFS.map((pref, i) => (
            <div
              key={pref.id}
              className={clsx(
                "flex items-center justify-between gap-4 py-4",
                i < PREFS.length - 1 && "border-b border-outline-variant/40",
              )}
            >
              <div>
                <div className="text-body-sm font-medium text-on-surface flex items-center gap-2">
                  {pref.label}
                  {!pref.live && <Badge tone="neutral">Coming soon</Badge>}
                </div>
                <div className="text-body-sm text-on-surface-variant">{pref.desc}</div>
              </div>
              <Toggle
                checked={prefs[pref.id]}
                disabled={!pref.live}
                onChange={(v) => update(pref.id, v)}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
