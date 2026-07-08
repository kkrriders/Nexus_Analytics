"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchKeywords } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";

type Trend  = "up" | "flat" | "down";
type Status = "active" | "paused";

const TREND_ICON: Record<Trend, { icon: string; tone: string }> = {
  up:   { icon: "trending_up",   tone: "text-tertiary" },
  flat: { icon: "trending_flat", tone: "text-on-surface-variant" },
  down: { icon: "trending_down", tone: "text-error" },
};
const STATUS_STYLES: Record<Status, string> = {
  active: "bg-tertiary-fixed-dim/20 text-tertiary",
  paused: "bg-surface-variant text-on-surface-variant",
};

function heatmapGradient(pct: number): string {
  if (pct >= 70) return "linear-gradient(to right, rgba(79,222,163,0.25), #006e4b)";
  if (pct >= 40) return "linear-gradient(to right, rgba(77,84,255,0.15), rgba(77,68,227,0.55))";
  return "linear-gradient(to right, rgba(119,117,135,0.15), rgba(119,117,135,0.38))";
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function LiveKeywords() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState("All Campaigns");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setData(await fetchKeywords());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Loading keyword data…</span>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Icon name="error_outline" className="text-[40px] text-error" />
      <p className="text-on-surface font-semibold">Analytics engine not reachable</p>
      <p className="text-on-surface-variant text-[13px]">{error}</p>
      <Button variant="primary" icon="refresh" onClick={load}>Retry</Button>
    </div>
  );

  const allKeywords: any[] = data?.keywords  ?? [];
  const keywords = campaignFilter === "All Campaigns" ? allKeywords : allKeywords.filter((k: any) => k.campaign === campaignFilter);
  const heatmap:  any[] = data?.heatmap   ?? [];
  const totalVol: number = data?.total_search_volume ?? 0;
  const avgCtr:   number = data?.avg_ctr             ?? 0;
  const avgQs:    number = data?.avg_quality_score    ?? 0;
  const ctrChg:   number = data?.ctr_change_pct       ?? 0;

  const exportKeywords = () => exportToCsv("nexus-keywords.csv", keywords.map((k: any) => ({
    keyword: k.keyword, status: k.status, campaign: k.campaign, volume: k.volume,
    ctr: k.ctr, cpc: k.cpc, quality_score: k.quality_score, trend: k.trend,
  })));

  const KPIS = [
    { label: "Total Search Volume", value: fmtVol(totalVol), icon: "search_insights", delta: `+${ctrChg.toFixed(1)}%`, dir: "up" as const },
    { label: "Avg. CTR",            value: `${avgCtr.toFixed(2)}%`,                   icon: "touch_app",      delta: `${ctrChg.toFixed(1)}%`, dir: (ctrChg >= 0 ? "up" : "down") as "up" | "down" },
    { label: "Avg. Quality Score",  value: avgQs.toFixed(1),                          icon: "high_quality",   suffix: "/10" },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-stack-md">
        <div>
          <h2 className="text-headline-lg-mobile md:text-display-kpi text-on-surface mb-1">Keyword Analytics</h2>
          <p className="text-body-md text-on-surface-variant">
            Search volume, CTR, and Quality Scores across all campaigns — last updated {data?.last_updated ? new Date(data.last_updated).toLocaleTimeString() : "—"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button icon="download" onClick={exportKeywords}>Export</Button>
          <Button variant="primary" icon="refresh" onClick={load}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">

        {/* KPI cards */}
        {KPIS.map((k) => (
          <Card key={k.label} className="md:col-span-4 p-card-padding flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-caps text-on-surface-variant uppercase tracking-wider">{k.label}</span>
              <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                <Icon name={k.icon} className="text-on-surface-variant text-[20px]" />
              </div>
            </div>
            <div>
              <div className="flex items-end gap-2">
                <span className="text-display-kpi text-on-surface">{k.value}</span>
                {"suffix" in k && k.suffix && <span className="text-headline-md text-on-surface-variant mb-1">{k.suffix}</span>}
              </div>
              {"delta" in k && k.delta && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={clsx("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-label-md font-semibold",
                    k.dir === "up" ? "bg-tertiary-fixed-dim/20 text-tertiary" : "bg-error-container text-error",
                  )}>
                    <Icon name={k.dir === "up" ? "arrow_upward" : "arrow_downward"} className="text-[12px]" />
                    {k.delta}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">vs last month</span>
                </div>
              )}
            </div>
          </Card>
        ))}

        {/* AI Keyword Cluster viz */}
        <Card className="md:col-span-8 flex flex-col overflow-hidden p-0">
          <div className="p-card-padding border-b border-outline-variant/50 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-headline-md text-on-surface">AI Keyword Clusters</h3>
              <p className="text-body-sm text-on-surface-variant mt-0.5">Semantic grouping based on user intent and volume.</p>
            </div>
          </div>
          <div className="relative w-full h-[320px]"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(79,70,229,0.13) 0%, rgba(0,110,75,0.07) 42%, transparent 72%)" }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute w-36 h-36 rounded-full blur-3xl top-[20%] left-[28%]" style={{ background: "rgba(79,70,229,0.07)" }} />
              <div className="absolute w-28 h-28 rounded-full blur-3xl top-[45%] left-[60%]" style={{ background: "rgba(0,110,75,0.06)" }} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Icon name="scatter_plot" className="text-[52px] text-on-surface-variant opacity-35 block" />
              <span className="text-label-md text-on-surface-variant opacity-55 mt-2">{keywords.length} keywords across {new Set(keywords.map((k: any) => k.campaign)).size} campaigns</span>
            </div>
            <div className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/50 rounded-lg p-3 shadow-sm">
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-2">Cluster Focus</p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-3 h-3 rounded-full bg-primary shrink-0" />
                <span className="text-body-sm text-on-surface">Primary (High Intent B2B)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary-container shrink-0" />
                <span className="text-body-sm text-on-surface">Research / Top Funnel</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Opportunity Heatmap */}
        <Card className="md:col-span-4 flex flex-col p-0">
          <div className="p-card-padding border-b border-outline-variant/50">
            <h3 className="text-headline-md text-on-surface">Opportunity Heatmap</h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">CPC vs Volume by Category</p>
          </div>
          <div className="flex-1 p-card-padding flex flex-col gap-4 justify-center">
            {heatmap.map((h: any) => (
              <div key={h.label} className="flex items-center gap-3">
                <span className="text-label-md text-on-surface-variant w-[68px] shrink-0">{h.label}</span>
                <div className="flex-1 h-5 bg-surface-container-low rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.min(100, h.pct)}%`, background: heatmapGradient(h.pct) }} />
                </div>
                <span className="text-label-md text-on-surface-variant w-9 text-right shrink-0">{h.pct}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Keyword table */}
        <Card className="md:col-span-12 overflow-hidden p-0">
          <div className="p-card-padding border-b border-outline-variant/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-headline-md text-on-surface">Top Performing Keywords</h3>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="w-full sm:w-52 appearance-none pl-4 pr-8 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary text-on-surface"
            >
              <option>All Campaigns</option>
              {[...new Set(allKeywords.map((k: any) => k.campaign))].map((c: any) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-outline-variant/50 bg-surface-container-low/50">
                  {["Keyword","Status","Search Volume","CTR","Avg. CPC","Quality Score","Trend"].map((h, i) => (
                    <th key={h} className={clsx("px-4 py-3 text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap",
                      i >= 2 && i <= 4 ? "text-right" : i === 5 ? "text-center" : i === 6 ? "text-center" : ""
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/30">
                {keywords.map((r: any) => {
                  const status = (r.status?.toLowerCase() ?? "active") as Status;
                  const trend  = (r.trend  ?? "flat") as Trend;
                  const qs     = r.quality_score ?? 0;
                  return (
                    <tr key={r.keyword} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-on-surface whitespace-nowrap">{r.keyword}</td>
                      <td className="px-4 py-3.5">
                        <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide", STATUS_STYLES[status])}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-on-surface-variant font-mono">{fmtVol(r.volume ?? 0)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-on-surface-variant font-mono">{(r.ctr ?? 0).toFixed(2)}%</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-on-surface-variant font-mono">₹{(r.cpc ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={clsx("font-semibold text-body-md",
                          qs >= 8 ? "text-tertiary" : qs <= 4 ? "text-error" : "text-on-surface"
                        )}>{qs}</span>
                        <span className="text-on-surface-variant text-[11px]">/10</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Icon name={TREND_ICON[trend].icon} className={clsx("text-[20px]", TREND_ICON[trend].tone)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-outline-variant/50 bg-surface-bright/50 flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">Showing {keywords.length} keywords</span>
          </div>
        </Card>

      </div>
    </>
  );
}
