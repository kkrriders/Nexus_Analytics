"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchCampaigns, fetchCampaignDeviceBreakdown } from "@/lib/api";
import { PLATFORM_OPTIONS, useDashboardPrefs } from "@/lib/dashboardPrefs";
import { exportToCsv } from "@/lib/csv";
import { fmt } from "@/lib/format";
import { useAccountConnections } from "@/lib/useAccountConnections";

type Status = "active" | "paused" | "review" | "draft";
const ALL_STATUSES: Status[] = ["active", "paused", "review", "draft"];

// Personalized benchmarking — this campaign's own real historical average,
// alongside the platform-benchmark health score. Computed client-side from
// the campaign's own already-fetched daily history, nothing invented.
function ownHistoricalAverage(factorName: string, history: any[], budget: number): number | null {
  if (!history || history.length === 0) return null;
  let sum = 0, count = 0;
  for (const pt of history) {
    let v: number | null = null;
    if (factorName === "CTR") v = pt.ctr;
    else if (factorName === "ROAS") v = pt.roas;
    else if (factorName === "CPA") v = pt.cpa;
    else if (factorName === "Conversion Rate") v = pt.clicks > 0 ? (pt.conversions / pt.clicks) * 100 : null;
    else if (factorName === "Budget Util.") v = budget > 0 ? (pt.spend / budget) * 100 : null;
    if (v !== null && Number.isFinite(v)) { sum += v; count++; }
  }
  return count > 0 ? sum / count : null;
}

function formatFactorValue(factorName: string, v: number): string {
  if (factorName === "ROAS") return `${v.toFixed(2)}x`;
  if (factorName === "CPA") return `₹${v.toFixed(2)}`;
  return `${v.toFixed(1)}%`;
}

const HEALTH_FACTOR_HINTS: Record<string, string> = {
  "CTR": "Click-Through Rate — % of people who saw the ad and clicked it.",
  "ROAS": "Return On Ad Spend — revenue earned per ₹1 spent.",
  "CPA": "Cost Per Acquisition — average spend to get one conversion.",
  "Conversion Rate": "% of clicks that turned into a completed goal action.",
  "Budget Util.": "% of the campaign's budget spent so far.",
};

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-tertiary-fixed-dim/20 text-tertiary",
  review: "bg-error-container text-error",
  paused: "bg-surface-variant text-on-surface-variant",
  draft:  "bg-secondary-fixed/50 text-secondary",
};

type ColumnKey = "cpa" | "roas" | "health";
const OPTIONAL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "cpa", label: "CPA" },
  { key: "roas", label: "ROAS" },
  { key: "health", label: "Health Score" },
];

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Loading campaign data…</span>
    </div>
  );
}

function ErrorState({ msg, retry }: { msg: string; retry: () => void }) {
  const notSynced = msg.includes("404");
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Icon name={notSynced ? "sync_problem" : "error_outline"} className="text-[40px] text-error" />
      <p className="text-on-surface font-semibold">{notSynced ? "No data synced yet" : "Analytics engine not reachable"}</p>
      <p className="text-on-surface-variant text-[13px]">{notSynced ? "Sync your connected account in Settings, then refresh." : msg}</p>
      <Button variant="primary" icon="refresh" onClick={retry}>Retry</Button>
    </div>
  );
}

function NotConnectedState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <Icon name="analytics" className="text-[40px] text-outline" />
      <p className="text-on-surface font-semibold">Connect an ad account to see Campaign Analytics</p>
      <p className="text-on-surface-variant text-[13px] max-w-md">
        Connect a Google Ads or Meta Ads account in Settings — there&apos;s nothing to show until then.
      </p>
    </div>
  );
}

function FilterDropdown({ label, open, onToggle, onClose, children }: {
  label: string; open: boolean; onToggle: () => void; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary transition-colors text-body-sm text-on-surface"
      >
        {label}
        <Icon name="expand_more" className="text-[16px] text-outline" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 w-52 bg-surface-bright border border-outline-variant rounded-[10px] shadow-lg py-1.5 z-50 max-h-64 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      )}
    </div>
  );
}

export default function LiveCampaigns() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LiveCampaignsInner />
    </Suspense>
  );
}

function LiveCampaignsInner() {
  const searchParams = useSearchParams();
  const { range, activePlatforms, togglePlatform, clearPlatformFilter } = useDashboardPrefs();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("campaign"));
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(new Set());
  const [audienceFilter, setAudienceFilter] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(["cpa", "roas", "health"]));
  const [openFilter, setOpenFilter] = useState<"platform" | "status" | "audience" | "columns" | null>(null);
  const { googleConnected, metaConnected, loading: connLoading } = useAccountConnections();
  const connected = googleConnected || metaConnected;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCampaigns(range);
      setCampaigns(data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Don't even hit the API until we know an ad account is connected — avoids
  // firing a request that can only ever 404 for accounts with nothing connected.
  useEffect(() => {
    if (connLoading || !connected) { setLoading(false); return; }
    load();
  }, [connLoading, connected, load]);

  const audiences = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.campaign?.target_audience).filter(Boolean))),
    [campaigns],
  );

  const filtered = useMemo(() => campaigns.filter((c: any) => {
    if (activePlatforms.size > 0 && !activePlatforms.has(c.campaign?.platform)) return false;
    if (statusFilter.size > 0 && !statusFilter.has(c.campaign?.status)) return false;
    if (audienceFilter.size > 0 && !audienceFilter.has(c.campaign?.target_audience)) return false;
    if (search.trim() && !c.campaign?.name?.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  }), [campaigns, activePlatforms, statusFilter, audienceFilter, search]);

  const toggleSetValue = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  const clearAllFilters = () => {
    clearPlatformFilter();
    setStatusFilter(new Set());
    setAudienceFilter(new Set());
    setSearch("");
  };

  const activeFilterCount = activePlatforms.size + statusFilter.size + audienceFilter.size + (search.trim() ? 1 : 0);

  const selected = filtered.find((c) => c.campaign?.id === selectedId) ?? filtered[0];
  const selectedCampaignId: string | undefined = selected?.campaign?.id;

  const [deviceBreakdown, setDeviceBreakdown] = useState<{ label: string; pct: number }[]>([]);
  useEffect(() => {
    if (!selectedCampaignId) { setDeviceBreakdown([]); return; }
    fetchCampaignDeviceBreakdown(selectedCampaignId)
      .then((d) => setDeviceBreakdown(d?.devices ?? []))
      .catch(() => setDeviceBreakdown([]));
  }, [selectedCampaignId]);

  if (connLoading) return null;
  if (!connected) return <NotConnectedState />;
  if (loading) return <LoadingState />;
  if (error)   return <ErrorState msg={error} retry={load} />;

  // ── Derived KPIs from live campaign data ──────────────────────────────────
  const active = campaigns.filter((c: any) =>
    ["active", "review"].includes(c.campaign?.status)
  );
  const totalSpend  = active.reduce((s: number, c: any) => s + (c.metrics?.spend ?? 0), 0);
  const totalImpr   = active.reduce((s: number, c: any) => s + (c.metrics?.impressions ?? 0), 0);
  const totalConv   = active.reduce((s: number, c: any) => s + (c.metrics?.conversions ?? 0), 0);
  const totalRev    = active.reduce((s: number, c: any) => s + (c.metrics?.revenue ?? 0), 0);
  const blendedROAS = totalSpend > 0 ? totalRev / totalSpend : 0;
  const avgCPA      = totalConv  > 0 ? totalSpend / totalConv : 0;

  // Real vs-previous-period deltas from each campaign's own prev_metrics — no fabricated numbers.
  const prevSpend = active.reduce((s: number, c: any) => s + (c.prev_metrics?.spend ?? 0), 0);
  const prevImpr  = active.reduce((s: number, c: any) => s + (c.prev_metrics?.impressions ?? 0), 0);
  const prevConv  = active.reduce((s: number, c: any) => s + (c.prev_metrics?.conversions ?? 0), 0);
  const prevRev   = active.reduce((s: number, c: any) => s + (c.prev_metrics?.revenue ?? 0), 0);
  const prevROAS  = prevSpend > 0 ? prevRev / prevSpend : 0;
  const prevCPA   = prevConv  > 0 ? prevSpend / prevConv : 0;
  const pctDelta = (cur: number, prev: number) => (prev === 0 ? 0 : ((cur - prev) / Math.abs(prev)) * 100);
  const fmtDelta = (d: number) => `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;

  const spendDelta = pctDelta(totalSpend, prevSpend);
  const imprDelta  = pctDelta(totalImpr, prevImpr);
  const cpaDelta   = pctDelta(avgCPA, prevCPA);
  const roasDelta  = pctDelta(blendedROAS, prevROAS);

  const KPIS = [
    { label: "Total Spend",      value: fmt(totalSpend, "currency"), delta: fmtDelta(spendDelta), dir: (spendDelta >= 0 ? "up" : "down") as "up" | "down", icon: "payments" },
    { label: "Total Impressions",value: fmt(totalImpr,  "number"),   delta: fmtDelta(imprDelta),  dir: (imprDelta  >= 0 ? "up" : "down") as "up" | "down", icon: "visibility" },
    { label: "Average CPA",      value: fmt(avgCPA,     "currency"), delta: fmtDelta(cpaDelta),   dir: (cpaDelta   >= 0 ? "up" : "down") as "up" | "down", icon: "target" },
    { label: "Blended ROAS",     value: fmt(blendedROAS,"x"),        delta: fmtDelta(roasDelta),  dir: (roasDelta  >= 0 ? "up" : "down") as "up" | "down", icon: "monetization_on" },
  ];

  const openInNewTab = () => {
    if (!selected?.campaign?.id) return;
    window.open(`/campaign-analytics?campaign=${encodeURIComponent(selected.campaign.id)}`, "_blank");
  };

  const exportCampaigns = () => exportToCsv("nexus-campaigns.csv", filtered.map((c: any) => ({
    name: c.campaign?.name, platform: c.campaign?.platform, status: c.campaign?.status,
    spend: c.metrics?.spend, revenue: c.metrics?.revenue, cpa: c.metrics?.cpa, roas: c.metrics?.roas,
    conversions: c.metrics?.conversions, health_score: c.health?.score,
  })));

  return (
    <>
      <PageHeader
        title="Campaign Analytics"
        subtitle="Detailed performance metrics across all active channels."
        actions={
          <>
            <Button icon="download" onClick={exportCampaigns}>Export</Button>
            <Button variant="primary" icon="refresh" onClick={load}>Refresh</Button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-label-caps text-on-surface-variant uppercase tracking-wider mr-2">
          <Icon name="filter_list" className="text-[16px]" />
          Filters
        </div>

        <FilterDropdown label={`Platform${activePlatforms.size ? ` (${activePlatforms.size})` : ""}`}
          open={openFilter === "platform"} onToggle={() => setOpenFilter(openFilter === "platform" ? null : "platform")} onClose={() => setOpenFilter(null)}>
          {PLATFORM_OPTIONS.map((p) => (
            <label key={p.value} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer">
              <input type="checkbox" checked={activePlatforms.has(p.value)} onChange={() => togglePlatform(p.value)} className="accent-primary" />
              {p.label}
            </label>
          ))}
        </FilterDropdown>

        <FilterDropdown label={`Status${statusFilter.size ? ` (${statusFilter.size})` : ""}`}
          open={openFilter === "status"} onToggle={() => setOpenFilter(openFilter === "status" ? null : "status")} onClose={() => setOpenFilter(null)}>
          {ALL_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer capitalize">
              <input type="checkbox" checked={statusFilter.has(s)} onChange={() => toggleSetValue(statusFilter, s, setStatusFilter)} className="accent-primary" />
              {s}
            </label>
          ))}
        </FilterDropdown>

        <FilterDropdown label={`Audience${audienceFilter.size ? ` (${audienceFilter.size})` : ""}`}
          open={openFilter === "audience"} onToggle={() => setOpenFilter(openFilter === "audience" ? null : "audience")} onClose={() => setOpenFilter(null)}>
          {audiences.length === 0 && <p className="px-3 py-2 text-[12px] text-on-surface-variant">No audiences yet</p>}
          {audiences.map((a: string) => (
            <label key={a} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer">
              <input type="checkbox" checked={audienceFilter.has(a)} onChange={() => toggleSetValue(audienceFilter, a, setAudienceFilter)} className="accent-primary" />
              <span className="truncate">{a}</span>
            </label>
          ))}
        </FilterDropdown>

        <div className="h-6 w-px bg-outline-variant mx-1" />
        <button onClick={clearAllFilters} disabled={activeFilterCount === 0} className="text-primary text-body-sm font-medium hover:underline px-2 disabled:opacity-40 disabled:no-underline">
          Clear All
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl elevation-card p-card-padding flex flex-col gap-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="text-label-md font-medium">{k.label}</span>
              <Icon name={k.icon} className="text-[20px]" />
            </div>
            <h3 className="text-display-kpi text-on-surface">{k.value}</h3>
            <div className="flex items-center gap-1.5 text-label-md mt-2">
              <span className={clsx("flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold",
                k.dir === "up" ? "bg-tertiary-fixed-dim/20 text-tertiary" : "bg-error-container text-error",
              )}>
                <Icon name={k.dir === "up" ? "trending_up" : "trending_down"} className="text-[14px]" />
                {k.delta}
              </span>
              <span className="text-on-surface-variant">vs last month</span>
            </div>
            <div className={clsx("absolute bottom-0 left-0 w-full h-1",
              k.dir === "up" ? "bg-tertiary-fixed-dim" : "bg-error-container",
            )} />
          </div>
        ))}
      </div>

      {/* Table + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter pb-margin-desktop">

        {/* Campaign table */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden h-[600px] p-0">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/50">
            <div className="relative w-64">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-9 pr-3 bg-surface border border-outline-variant rounded-md text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline"
                placeholder="Search campaigns…"
              />
            </div>
            <FilterDropdown label="" open={openFilter === "columns"} onToggle={() => setOpenFilter(openFilter === "columns" ? null : "columns")} onClose={() => setOpenFilter(null)}>
              <p className="px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Columns</p>
              {OPTIONAL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-on-surface hover:bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleSetValue(visibleCols, col.key, setVisibleCols)} className="accent-primary" />
                  {col.label}
                </label>
              ))}
            </FilterDropdown>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Campaign</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Platform</th>
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Spend</th>
                  {visibleCols.has("cpa") && <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">CPA</th>}
                  {visibleCols.has("roas") && <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">ROAS</th>}
                  <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Status</th>
                  {visibleCols.has("health") && <th className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Health Score</th>}
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/50">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-on-surface-variant">No campaigns match the current filters.</td></tr>
                )}
                {filtered.map((c: any, i: number) => {
                  const m = c.metrics ?? {};
                  const status = (c.campaign?.status ?? "draft") as Status;
                  const health = c.health?.score ?? 0;
                  const platform = titleCase(c.campaign?.platform ?? "");
                  const isSelected = (selected?.campaign?.id ?? filtered[0]?.campaign?.id) === c.campaign?.id;
                  return (
                    <tr key={c.campaign?.id ?? i}
                      onClick={() => setSelectedId(c.campaign?.id ?? null)}
                      className={clsx("hover:bg-surface-container-low/50 transition-colors cursor-pointer",
                        isSelected && "bg-primary-container/5",
                        status === "paused" && "opacity-75",
                      )}>
                      <td className="px-4 py-3 font-medium text-on-surface">{c.campaign?.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{platform}</td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface font-mono">
                        {m.spend > 0 ? fmt(m.spend, "currency") : "—"}
                      </td>
                      {visibleCols.has("cpa") && (
                        <td className={clsx("px-4 py-3 text-right font-medium font-mono",
                          m.cpa > 0 && m.cpa < 20 ? "text-tertiary" : m.cpa > 40 ? "text-error" : "text-on-surface"
                        )}>
                          {m.cpa > 0 ? fmt(m.cpa, "currency") : "—"}
                        </td>
                      )}
                      {visibleCols.has("roas") && (
                        <td className="px-4 py-3 text-right font-medium text-on-surface font-mono">
                          {m.roas > 0 ? fmt(m.roas, "x") : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", STATUS_STYLES[status])}>
                          {status}
                        </span>
                      </td>
                      {visibleCols.has("health") && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-surface-variant rounded-full h-1.5 max-w-[80px]">
                              {health > 0 && (
                                <div className={clsx("h-1.5 rounded-full",
                                  health >= 80 ? "bg-tertiary" : health >= 60 ? "bg-warning" : "bg-error"
                                )} style={{ width: `${health}%` }} />
                              )}
                            </div>
                            <span className={clsx("text-label-caps min-w-[1.5rem]",
                              health >= 80 ? "text-tertiary" : health < 50 ? "text-error" : "text-on-surface-variant"
                            )}>
                              {health > 0 ? Math.round(health) : "—"}
                            </span>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>Showing {filtered.length} of {campaigns.length} campaigns · {active.length} active</span>
          </div>
        </Card>

        {/* Side panel */}
        <div className="lg:col-span-1 flex flex-col gap-gutter">
          {selected && (
            <>
              <Card className="p-card-padding flex flex-col border-primary/20">
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-outline-variant/50">
                  <div className="min-w-0">
                    <h3 className="text-headline-md text-on-surface font-semibold truncate">{selected.campaign?.name}</h3>
                    <p className="text-body-sm text-on-surface-variant mt-0.5">
                      {titleCase(selected.campaign?.platform ?? "")} · {selected.campaign?.target_audience}
                    </p>
                  </div>
                  <button onClick={openInNewTab} title="Open in new tab" className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors shrink-0 ml-2">
                    <Icon name="open_in_new" className="text-[20px]" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-label-caps text-outline uppercase tracking-wider mb-1">Budget Utilized</p>
                    <p className="text-body-md font-semibold text-on-surface">
                      {((selected.metrics?.budget_utilization ?? 0) * 100).toFixed(1)}%{" "}
                      <span className="text-on-surface-variant font-normal text-body-sm">
                        of {fmt(selected.campaign?.budget ?? 0, "currency")}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-label-caps text-outline uppercase tracking-wider mb-1">Revenue</p>
                    <p className="text-body-md font-semibold text-on-surface font-mono">
                      {fmt(selected.metrics?.revenue ?? 0, "currency")}
                    </p>
                  </div>
                  <div>
                    <p className="text-label-caps text-outline uppercase tracking-wider mb-1">ROAS</p>
                    <p className="text-body-md font-semibold text-[#4F46E5] font-mono">
                      {selected.metrics?.roas > 0 ? fmt(selected.metrics.roas, "x") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-label-caps text-outline uppercase tracking-wider mb-1">Conversions</p>
                    <p className="text-body-md font-semibold text-on-surface font-mono">
                      {(selected.metrics?.conversions ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Sparkline mini area chart */}
                <div className="flex flex-col gap-2">
                  <p className="text-label-md font-semibold text-on-surface">
                    Revenue Trend ({"days" in range ? `${range.days} Days` : `${range.start} – ${range.end}`})
                  </p>
                  <div className="h-40 w-full bg-surface-container-low/30 rounded-lg border border-outline-variant/50 relative overflow-hidden">
                    {selected.sparkline?.length > 1 && (() => {
                      const pts: number[] = selected.sparkline;
                      const min = Math.min(...pts);
                      const max = Math.max(...pts);
                      const range = max - min || 1;
                      const w = 100 / (pts.length - 1);
                      const toY = (v: number) => 85 - ((v - min) / range) * 70;
                      const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * w).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
                      const area = `${d} L100,100 L0,100 Z`;
                      return (
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <path d={area} fill="var(--color-primary)" opacity={0.15} />
                          <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              <Card className="p-card-padding flex-1">
                <h3 className="text-label-md font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <Icon name="psychology" className="text-[18px] text-ai" />
                  Health Factors
                </h3>
                <ul className="flex flex-col gap-3 text-body-sm text-on-surface-variant">
                  {(selected.health?.factors ?? []).slice(0, 4).map((f: any) => {
                    const ownAvg = ownHistoricalAverage(f.name, selected.history ?? [], selected.campaign?.budget ?? 0);
                    return (
                    <li key={f.name} className="flex items-center gap-3">
                      <span className={clsx("w-2 h-2 rounded-full shrink-0",
                        f.status === "good" ? "bg-tertiary" : f.status === "warning" ? "bg-warning" : "bg-error"
                      )} />
                      <div className="flex-1">
                        <div className="flex justify-between text-[12px] mb-0.5">
                          <span className="font-medium text-on-surface" title={HEALTH_FACTOR_HINTS[f.name] ?? undefined}>{f.name}</span>
                          <span className={clsx("font-bold",
                            f.status === "good" ? "text-tertiary" : f.status === "warning" ? "text-warning" : "text-error"
                          )}>{Math.round(f.score)}/100</span>
                        </div>
                        <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
                          <div className={clsx("h-full rounded-full",
                            f.status === "good" ? "bg-tertiary" : f.status === "warning" ? "bg-warning" : "bg-error"
                          )} style={{ width: `${f.score}%` }} />
                        </div>
                        {ownAvg !== null && (
                          <p className="text-[10px] text-on-surface-variant mt-0.5">vs your own {formatFactorValue(f.name, ownAvg)} average</p>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </Card>

              <Card className="p-card-padding">
                <h3 className="text-label-md font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <Icon name="devices" className="text-[18px] text-on-surface-variant" />
                  Device Breakdown
                </h3>
                {deviceBreakdown.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">No device data synced yet for this campaign.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {deviceBreakdown.map((d) => (
                      <li key={d.label} className="flex items-center gap-3">
                        <span className="text-body-sm text-on-surface w-16 shrink-0">{d.label}</span>
                        <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                        </div>
                        <span className="text-label-md text-on-surface-variant tabular-nums w-10 text-right">{d.pct.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
