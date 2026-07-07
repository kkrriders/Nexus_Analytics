"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchCampaigns } from "@/lib/api";

type Status = "active" | "paused" | "review" | "draft";

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-tertiary-fixed-dim/20 text-tertiary",
  review: "bg-error-container text-error",
  paused: "bg-surface-variant text-on-surface-variant",
  draft:  "bg-secondary-fixed/50 text-secondary",
};

const FILTERS = ["Platform", "Campaign", "Country", "Device"];

function fmt(n: number, type: "currency" | "pct" | "x" | "number") {
  if (type === "currency") {
    if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
    return `₹${n.toFixed(2)}`;
  }
  if (type === "pct")    return `${n.toFixed(2)}%`;
  if (type === "x")      return `${n.toFixed(2)}x`;
  if (type === "number") return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(n);
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
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Icon name="error_outline" className="text-[40px] text-error" />
      <p className="text-on-surface font-semibold">Analytics engine not reachable</p>
      <p className="text-on-surface-variant text-[13px]">{msg}</p>
      <Button variant="primary" icon="refresh" onClick={retry}>Retry</Button>
    </div>
  );
}

export default function LiveCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCampaigns();
      setCampaigns(data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const KPIS = [
    { label: "Total Spend",      value: fmt(totalSpend, "currency"), delta: "+12.5%", dir: "up"   as const, icon: "payments" },
    { label: "Total Impressions",value: fmt(totalImpr,  "number"),   delta: "+8.2%",  dir: "up"   as const, icon: "visibility" },
    { label: "Average CPA",      value: fmt(avgCPA,     "currency"), delta: "-3.1%",  dir: "down" as const, icon: "target" },
    { label: "Blended ROAS",     value: fmt(blendedROAS,"x"),        delta: "+1.2%",  dir: "up"   as const, icon: "monetization_on" },
  ];

  const selected = campaigns[selectedIdx] ?? campaigns[0];

  return (
    <>
      <PageHeader
        title="Campaign Analytics"
        subtitle="Detailed performance metrics across all active channels."
        actions={
          <>
            <Button icon="download" onClick={load}>Export</Button>
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
        {FILTERS.map((f) => (
          <button key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary transition-colors text-body-sm text-on-surface">
            {f}
            <Icon name="expand_more" className="text-[16px] text-outline" />
          </button>
        ))}
        <div className="h-6 w-px bg-outline-variant mx-1" />
        <button className="text-primary text-body-sm font-medium hover:underline px-2">Clear All</button>
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
              <input className="w-full h-8 pl-9 pr-3 bg-surface border border-outline-variant rounded-md text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline" placeholder="Search campaigns…" />
            </div>
            <button className="p-1.5 rounded border border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface-variant">
              <Icon name="view_column" className="text-[18px]" />
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant shadow-sm z-10">
                <tr>
                  {["Campaign", "Platform", "Spend", "CPA", "ROAS", "Status", "Health Score"].map((h) => (
                    <th key={h} className="px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/50">
                {campaigns.map((c: any, i: number) => {
                  const m = c.metrics ?? {};
                  const status = (c.campaign?.status ?? "draft") as Status;
                  const health = c.health?.score ?? 0;
                  const platform = (c.campaign?.platform ?? "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
                  return (
                    <tr key={c.campaign?.id ?? i}
                      onClick={() => setSelectedIdx(i)}
                      className={clsx("hover:bg-surface-container-low/50 transition-colors cursor-pointer",
                        selectedIdx === i && "bg-primary-container/5",
                        status === "paused" && "opacity-75",
                      )}>
                      <td className="px-4 py-3 font-medium text-on-surface">{c.campaign?.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{platform}</td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface font-mono">
                        {m.spend > 0 ? fmt(m.spend, "currency") : "—"}
                      </td>
                      <td className={clsx("px-4 py-3 text-right font-medium font-mono",
                        m.cpa > 0 && m.cpa < 20 ? "text-tertiary" : m.cpa > 40 ? "text-error" : "text-on-surface"
                      )}>
                        {m.cpa > 0 ? fmt(m.cpa, "currency") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface font-mono">
                        {m.roas > 0 ? fmt(m.roas, "x") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", STATUS_STYLES[status])}>
                          {status}
                        </span>
                      </td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-outline-variant flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>Showing {campaigns.length} campaigns · {active.length} active</span>
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
                      {(selected.campaign?.platform ?? "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} · {selected.campaign?.target_audience}
                    </p>
                  </div>
                  <button className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors shrink-0 ml-2">
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
                  <p className="text-label-md font-semibold text-on-surface">Revenue Trend (30 Days)</p>
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
                  {(selected.health?.factors ?? []).slice(0, 4).map((f: any) => (
                    <li key={f.name} className="flex items-center gap-3">
                      <span className={clsx("w-2 h-2 rounded-full shrink-0",
                        f.status === "good" ? "bg-tertiary" : f.status === "warning" ? "bg-warning" : "bg-error"
                      )} />
                      <div className="flex-1">
                        <div className="flex justify-between text-[12px] mb-0.5">
                          <span className="font-medium text-on-surface">{f.name}</span>
                          <span className={clsx("font-bold",
                            f.status === "good" ? "text-tertiary" : f.status === "warning" ? "text-warning" : "text-error"
                          )}>{Math.round(f.score)}/100</span>
                        </div>
                        <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
                          <div className={clsx("h-full rounded-full",
                            f.status === "good" ? "bg-tertiary" : f.status === "warning" ? "bg-warning" : "bg-error"
                          )} style={{ width: `${f.score}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
