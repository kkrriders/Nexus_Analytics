"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "@/lib/clsx";
import { useTheme } from "@/lib/theme";
import { DATE_RANGE_OPTIONS, PLATFORM_OPTIONS, useDashboardPrefs } from "@/lib/dashboardPrefs";
import { NotificationBell } from "./NotificationBell";

type TopNavProps = { onMenuClick?: () => void };

const PLAN_LABEL: Record<string, string> = { google: "Google Ads", meta: "Meta Ads", both: "Google + Meta" };

export function TopNav({ onMenuClick }: TopNavProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { days, setDays, customRange, setCustomRange, activePlatforms, togglePlatform, clearPlatformFilter } = useDashboardPrefs();

  const [account, setAccount] = useState<{ email: string; fullName: string | null; plan: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [customStart, setCustomStart] = useState(customRange?.start ?? "");
  const [customEnd, setCustomEnd] = useState(customRange?.end ?? "");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [{ data: profile }, { data: acc }] = await Promise.all([
        supabase.from("users").select("full_name").eq("id", data.user.id).single(),
        supabase.from("accounts").select("plan").eq("user_id", data.user.id).single(),
      ]);
      setAccount({ email: data.user.email ?? "", fullName: profile?.full_name ?? null, plan: acc?.plan ?? null });
    });
  }, []);

  useEffect(() => {
    if (!menuOpen && !dateOpen && !filterOpen) return;
    const onClickAway = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
      if (dateOpen && dateRef.current && !dateRef.current.contains(t)) setDateOpen(false);
      if (filterOpen && filterRef.current && !filterRef.current.contains(t)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen, dateOpen, filterOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) router.push(`/campaign-analytics?q=${encodeURIComponent(q)}`);
  };

  const initial = (account?.fullName ?? account?.email ?? "?").charAt(0).toUpperCase();
  const formatRangeDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateLabel = customRange
    ? `${formatRangeDate(customRange.start)} – ${formatRangeDate(customRange.end)}`
    : DATE_RANGE_OPTIONS.find((o) => o.days === days)?.label ?? "Last 30 Days";
  const filterCount = activePlatforms.size;

  const applyCustomRange = () => {
    if (!customStart || !customEnd) { setCustomRangeError("Pick both a start and end date"); return; }
    if (customStart > customEnd) { setCustomRangeError("Start date must be before end date"); return; }
    setCustomRangeError(null);
    setCustomRange({ start: customStart, end: customEnd });
    setDateOpen(false);
  };

  return (
    <header className="bg-surface-bright h-16 fixed top-0 right-0 left-0 md:left-[280px] z-40 flex items-center justify-between px-6 border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="md:hidden text-on-surface-variant hover:text-primary transition-colors" aria-label="Open navigation">
          <Icon name="menu" />
        </button>
        <span className="md:hidden text-[17px] font-bold text-on-surface">Nexus</span>

        {/* Workspace — single-workspace app, so this is a shortcut to Settings rather than a switcher */}
        <button
          onClick={() => router.push("/settings")}
          className="hidden md:flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-on-surface hover:bg-surface-container transition-colors"
          title="Go to Settings"
        >
          <div className="w-4 h-4 rounded bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold">N</span>
          </div>
          <span className="truncate max-w-[140px]">{account?.plan ? PLAN_LABEL[account.plan] ?? "Nexus Workspace" : "Nexus Workspace"}</span>
        </button>
      </div>

      <div className="flex-1 mx-6 hidden lg:block max-w-sm">
        <form onSubmit={handleSearch} className="flex items-center bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-[10px] focus-within:border-primary focus-within:bg-surface-bright transition-all">
          <Icon name="search" className="text-[17px] text-outline mr-2 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, metrics, keywords…"
            className="bg-transparent border-none p-0 text-[13px] focus:ring-0 w-full text-on-surface placeholder:text-outline focus:outline-none"
          />
          <kbd className="hidden xl:flex items-center gap-0.5 ml-2 px-1.5 py-0.5 bg-surface-bright border border-outline-variant rounded text-[10px] font-mono text-outline shrink-0">↵</kbd>
        </form>
      </div>

      <div className="flex items-center gap-2">
        {/* Date range */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setDateOpen((o) => !o)}
            className="hidden sm:flex items-center gap-2 bg-surface-bright border border-outline-variant px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-on-surface hover:border-primary transition-colors"
          >
            <Icon name="calendar_today" className="text-[15px] text-outline" />
            {dateLabel}
            <Icon name="expand_more" className="text-[14px] text-outline" />
          </button>
          {dateOpen && (
            <div className="absolute right-0 top-10 w-64 bg-surface-bright border border-outline-variant rounded-[10px] shadow-lg py-1.5 z-50">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => { setDays(opt.days); setDateOpen(false); }}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-[13px] hover:bg-surface-container-low transition-colors",
                    !customRange && opt.days === days ? "text-primary font-medium" : "text-on-surface",
                  )}
                >
                  {opt.label}
                </button>
              ))}
              <div className="border-t border-outline-variant mt-1.5 pt-2.5 px-3 pb-2.5">
                <p className={clsx("text-[12px] font-medium mb-2", customRange ? "text-primary" : "text-on-surface-variant")}>
                  Custom Range
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || undefined}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full min-w-0 bg-surface-container-low border border-outline-variant rounded-[6px] px-1.5 py-1 text-[12px] text-on-surface"
                  />
                  <span className="text-on-surface-variant text-[12px] shrink-0">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart || undefined}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full min-w-0 bg-surface-container-low border border-outline-variant rounded-[6px] px-1.5 py-1 text-[12px] text-on-surface"
                  />
                </div>
                {customRangeError && <p className="text-[11px] text-error mt-1.5">{customRangeError}</p>}
                <button
                  onClick={applyCustomRange}
                  className="w-full mt-2 bg-primary text-white text-[12px] font-medium py-1.5 rounded-[6px] hover:opacity-90 transition-opacity"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global platform filter */}
        <div className="relative hidden md:block" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-1.5 bg-surface-bright border border-outline-variant px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-on-surface hover:border-primary transition-colors"
          >
            <Icon name="filter_list" className="text-[15px] text-outline" />
            Filters
            {filterCount > 0 && (
              <span className="w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">{filterCount}</span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-10 w-56 bg-surface-bright border border-outline-variant rounded-[10px] shadow-lg py-1.5 z-50">
              <p className="px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Platforms</p>
              {PLATFORM_OPTIONS.map((p) => (
                <label key={p.value} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activePlatforms.has(p.value)}
                    onChange={() => togglePlatform(p.value)}
                    className="accent-primary"
                  />
                  {p.label}
                </label>
              ))}
              {filterCount > 0 && (
                <button onClick={clearPlatformFilter} className="w-full text-left px-3 py-2 text-[12px] text-primary hover:bg-surface-container-low border-t border-outline-variant mt-1">
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-outline-variant mx-1" />

        <NotificationBell />

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-[10px] transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} className="text-[20px]" />
        </button>

        {/* Avatar */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-primary text-white text-[12px] font-bold flex items-center justify-center cursor-pointer border-2 border-surface-bright shadow-sm"
            aria-label="Account menu"
          >
            {initial}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-56 bg-surface-bright border border-outline-variant rounded-[10px] shadow-lg py-1.5 z-50">
              <div className="px-3 py-2 border-b border-outline-variant">
                <p className="text-[13px] font-medium text-on-surface truncate">{account?.fullName || "Account"}</p>
                <p className="text-[12px] text-on-surface-variant truncate">{account?.email || ""}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <Icon name="logout" className="text-[16px]" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
