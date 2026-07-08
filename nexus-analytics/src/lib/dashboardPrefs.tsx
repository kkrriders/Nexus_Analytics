"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DateRangeDays = 7 | 30 | 90;
export const DATE_RANGE_OPTIONS: { days: DateRangeDays; label: string }[] = [
  { days: 7, label: "Last 7 Days" },
  { days: 30, label: "Last 30 Days" },
  { days: 90, label: "Last 90 Days" },
];

export const PLATFORM_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
] as const;

type DashboardPrefs = {
  days: DateRangeDays;
  setDays: (d: DateRangeDays) => void;
  activePlatforms: Set<string>; // empty set = no filter (every platform included)
  togglePlatform: (p: string) => void;
  clearPlatformFilter: () => void;
  isPlatformActive: (p: string) => boolean;
};

const Ctx = createContext<DashboardPrefs | null>(null);

export function DashboardPrefsProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<DateRangeDays>(30);
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set());

  const togglePlatform = useCallback((p: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }, []);

  const clearPlatformFilter = useCallback(() => setActivePlatforms(new Set()), []);
  const isPlatformActive = useCallback(
    (p: string) => activePlatforms.size === 0 || activePlatforms.has(p),
    [activePlatforms],
  );

  const value = useMemo(
    () => ({ days, setDays, activePlatforms, togglePlatform, clearPlatformFilter, isPlatformActive }),
    [days, activePlatforms, togglePlatform, clearPlatformFilter, isPlatformActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardPrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboardPrefs must be used within DashboardPrefsProvider");
  return ctx;
}
