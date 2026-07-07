"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { clsx } from "@/lib/clsx";

const STORAGE_KEY = "nexus_notification_prefs";

const PREFS = [
  { id: "criticalAlerts", label: "Critical alerts", desc: "Budget overruns, sync failures, and account errors.", default: true },
  { id: "weeklySummary", label: "Weekly performance summary", desc: "A digest of KPIs across all connected platforms.", default: true },
  { id: "aiDigest", label: "AI recommendation digest", desc: "New AI-suggested optimizations as they're generated.", default: true },
  { id: "productUpdates", label: "Product updates", desc: "New features, changelogs, and platform announcements.", default: false },
] as const;

type PrefId = (typeof PREFS)[number]["id"];
type Prefs = Record<PrefId, boolean>;

function defaultPrefs(): Prefs {
  return Object.fromEntries(PREFS.map((p) => [p.id, p.default])) as Prefs;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
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

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultPrefs(), ...JSON.parse(raw) } : defaultPrefs();
  } catch {
    return defaultPrefs();
  }
}

export function NotificationsPanel() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [saved, setSaved] = useState(false);

  function update(id: PrefId, value: boolean) {
    const next = { ...prefs, [id]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Card className="p-card-padding">
      <CardHeader
        title="Email Notifications"
        icon="notifications"
        action={saved ? <span className="text-body-sm text-tertiary">Saved</span> : undefined}
      />

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
              <div className="text-body-sm font-medium text-on-surface">{pref.label}</div>
              <div className="text-body-sm text-on-surface-variant">{pref.desc}</div>
            </div>
            <Toggle checked={prefs[pref.id]} onChange={(v) => update(pref.id, v)} />
          </div>
        ))}
      </div>
    </Card>
  );
}
