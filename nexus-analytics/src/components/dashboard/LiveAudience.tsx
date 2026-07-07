"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchAudience } from "@/lib/api";

type Affinity = "high" | "med" | "low";

const AFFINITY_STYLES: Record<Affinity, string> = {
  high: "bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim",
  med:  "bg-surface-container-high text-on-surface-variant border-outline-variant",
  low:  "bg-surface-container text-outline border-outline-variant/50",
};

const DEVICE_COLORS = ["var(--color-primary)", "var(--color-secondary)", "var(--color-surface-variant)"];
const DEVICE_DOT    = ["bg-primary", "bg-secondary", "bg-surface-variant"];

function buildConic(slices: { pct: number }[]): string {
  let cursor = 0;
  const stops = slices.map((s, i) => {
    const start = cursor;
    cursor += s.pct;
    return `${DEVICE_COLORS[i] ?? "#ccc"} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function LiveAudience() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setData(await fetchAudience());
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
      <span className="text-on-surface-variant text-[14px]">Loading audience data…</span>
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

  const ageBars:    any[] = data?.age_groups       ?? [];
  const devices:    any[] = data?.device_split      ?? [];
  const geoRows:    any[] = data?.geo_distribution  ?? [];
  const interests:  any[] = data?.interest_segments ?? [];
  const reach:      number = data?.total_unique_reach_m ?? 0;
  const quality:    number = data?.audience_quality_score ?? 0;
  const reachChg:   number = data?.reach_change_pct ?? 0;
  const primaryDem: string = data?.primary_demographic ?? "—";

  const peakPct = ageBars.length > 0 ? Math.max(...ageBars.map((a: any) => a.pct)) : 0;
  const topDevice = devices[0];

  return (
    <>
      <PageHeader
        title="Audience Analytics"
        subtitle="Deep dive into demographic segments, device preferences, and overlap patterns."
        actions={
          <>
            <Button icon="download">Export Report</Button>
            <Button variant="primary" icon="refresh" onClick={load}>Refresh</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">

        {/* KPI 1 — Total Unique Reach */}
        <Card className="md:col-span-4 p-card-padding flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-label-md font-medium text-on-surface-variant">Total Unique Reach</h3>
            <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
              <Icon name="public" className="text-on-secondary-fixed text-[18px]" />
            </div>
          </div>
          <div>
            <div className="text-display-kpi text-on-surface">{reach.toFixed(1)}M</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 bg-tertiary-fixed-dim/20 text-tertiary px-2 py-0.5 rounded text-label-md font-semibold">
                <Icon name="trending_up" className="text-[14px]" /> {reachChg.toFixed(1)}%
              </span>
              <span className="text-body-sm text-on-surface-variant">vs previous 30 days</span>
            </div>
          </div>
        </Card>

        {/* KPI 2 — Primary Demographic */}
        <Card className="md:col-span-4 p-card-padding flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-label-md font-medium text-on-surface-variant">Primary Demographic</h3>
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
              <Icon name="face" className="text-on-primary-fixed text-[18px]" />
            </div>
          </div>
          <div>
            <div className="text-display-kpi text-on-surface truncate">{primaryDem}</div>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Represents <strong className="text-on-surface font-semibold">
                {ageBars.find((a: any) => a.pct === peakPct)?.pct ?? 0}%
              </strong> of total engaged audience
            </p>
          </div>
        </Card>

        {/* KPI 3 — Audience Quality Score */}
        <Card className="md:col-span-4 p-card-padding flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-5 -bottom-4 pointer-events-none select-none opacity-[0.05]">
            <Icon name="vital_signs" className="text-[120px] text-on-surface" />
          </div>
          <div className="relative z-10 flex items-start justify-between mb-4">
            <h3 className="text-label-md font-medium text-on-surface-variant">Audience Quality Score</h3>
            <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
              <Icon name="star" className="fill text-on-surface text-[18px]" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-display-kpi text-on-surface">
              {quality.toFixed(0)}<span className="text-headline-md text-outline ml-1">/100</span>
            </div>
            <div className="mt-3 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${quality}%` }} />
            </div>
          </div>
        </Card>

        {/* Age Demographics */}
        <Card className="md:col-span-6 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40">
            <CardHeader title="Age Demographics" icon="bar_chart" className="border-0 pb-0 mb-0" />
            <p className="text-body-sm text-on-surface-variant mt-1">Distribution across audience age groups</p>
          </div>
          <div className="flex-1 p-card-padding flex flex-col justify-center gap-4">
            {ageBars.map((row: any) => {
              const isPeak = row.pct === peakPct;
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-label-md text-on-surface-variant w-12 shrink-0 text-right tabular-nums">{row.label}</span>
                  <div className="flex-1 h-6 bg-surface-container-low rounded-sm overflow-hidden relative">
                    <div className={clsx("h-full rounded-sm transition-all", isPeak ? "bg-primary" : "bg-primary-fixed-dim")}
                      style={{ width: `${row.pct}%` }} />
                    {isPeak && (
                      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-on-primary">Peak</span>
                    )}
                  </div>
                  <span className={clsx("text-label-md w-8 shrink-0 tabular-nums font-semibold",
                    isPeak ? "text-primary" : "text-on-surface-variant")}>
                    {row.pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Device Split */}
        <Card className="md:col-span-6 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40">
            <CardHeader title="Device Split" icon="devices" className="border-0 pb-0 mb-0" />
            <p className="text-body-sm text-on-surface-variant mt-1">Share of sessions by device category</p>
          </div>
          <div className="flex-1 p-card-padding flex flex-col sm:flex-row items-center justify-around gap-6">
            {devices.length > 0 && (
              <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
                <div className="w-full h-full rounded-full" style={{ background: buildConic(devices) }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-surface-container-lowest flex flex-col items-center justify-center" style={{ width: 88, height: 88 }}>
                    <span className="text-display-kpi text-on-surface" style={{ fontSize: 22, lineHeight: 1.1 }}>
                      {topDevice?.pct?.toFixed(0) ?? 0}%
                    </span>
                    <span className="text-label-caps text-outline" style={{ fontSize: 10 }}>{topDevice?.label}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4 w-full sm:w-auto">
              {devices.map((d: any, i: number) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className={clsx("w-3 h-3 rounded-full shrink-0", DEVICE_DOT[i])} />
                  <div className="flex-1 min-w-[100px]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-body-sm text-on-surface font-medium">{d.label}</span>
                      <span className="text-label-md text-on-surface-variant tabular-nums">{d.pct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full", DEVICE_DOT[i])} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Geographic Distribution */}
        <Card className="md:col-span-8 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40 flex items-center justify-between">
            <div>
              <h3 className="text-headline-md text-on-surface">Geographic Distribution</h3>
              <p className="text-body-sm text-on-surface-variant mt-1">Top audience markets by share of reach</p>
            </div>
            <span className="text-label-caps text-on-surface-variant uppercase bg-surface-container px-2 py-1 rounded">Last 30 days</span>
          </div>

          {/* Map placeholder */}
          <div className="relative bg-surface-container-low/40 h-44 flex items-center justify-center overflow-hidden border-b border-outline-variant/30">
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "linear-gradient(var(--color-outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline-variant) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative flex flex-col items-center gap-2">
              <Icon name="map" className="text-[56px] text-on-surface-variant opacity-20" />
              <span className="text-label-caps text-on-surface-variant opacity-50 uppercase tracking-wider">Interactive World Map</span>
            </div>
            {[{ top:"30%", left:"22%", code:"US" },{ top:"28%", left:"47%", code:"UK" },{ top:"32%", left:"56%", code:"DE" },{ top:"50%", left:"78%", code:"AU" },{ top:"27%", left:"18%", code:"CA" }].map((p) => (
              <div key={p.code} className="absolute flex flex-col items-center" style={{ top: p.top, left: p.left }}>
                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-on-primary shadow-md" />
                <span className="text-[9px] font-bold text-primary mt-0.5 bg-surface-container-lowest/80 px-0.5 rounded leading-none">{p.code}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/40">
                  {["Country","Code","Share","Reach"].map((h, i) => (
                    <th key={h} className={clsx("px-5 py-2.5 text-label-caps text-on-surface-variant uppercase whitespace-nowrap", i >= 2 && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/20">
                {geoRows.map((r: any) => (
                  <tr key={r.code} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-on-surface">{r.country}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded uppercase">{r.code}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-label-md font-semibold text-on-surface tabular-nums w-8 text-right">{r.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-on-surface-variant tabular-nums">{(r.reach_m ?? 0).toFixed(2)}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Interest Segments */}
        <Card className="md:col-span-4 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40">
            <CardHeader title="Interest Segments" icon="interests" className="border-0 pb-0 mb-0" />
            <p className="text-body-sm text-on-surface-variant mt-1">Audience affinity clusters by engagement signal</p>
          </div>
          <div className="flex-1 p-card-padding flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {interests.map((seg: any) => (
                <div key={seg.label} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-body-sm font-medium select-none", AFFINITY_STYLES[seg.affinity as Affinity] ?? AFFINITY_STYLES.low)}>
                  {seg.label}
                  <span className={clsx("text-[9px] font-bold uppercase px-1 py-px rounded",
                    seg.affinity === "high" ? "bg-primary/20 text-primary" : "bg-outline-variant/40 text-outline"
                  )}>
                    {seg.affinity}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-outline-variant/30 flex flex-col gap-2">
              <p className="text-label-caps text-outline uppercase tracking-wider mb-1">Affinity Scale</p>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary shrink-0" />
                <span className="text-body-sm text-on-surface-variant">High — Strong intent signal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-surface-container-highest border border-outline-variant shrink-0" />
                <span className="text-body-sm text-on-surface-variant">Med — Moderate engagement</span>
              </div>
            </div>
            <div className="p-3 bg-secondary-fixed/30 border border-secondary-fixed rounded-lg flex items-start gap-2">
              <Icon name="lightbulb" className="text-[18px] text-secondary shrink-0 mt-0.5" />
              <p className="text-body-sm text-on-surface-variant">
                <strong className="text-on-surface">Technology</strong> and{" "}
                <strong className="text-on-surface">Analytics</strong> segments share a{" "}
                <span className="text-secondary font-semibold">74% audience overlap</span>.
              </p>
            </div>
          </div>
        </Card>

      </div>
    </>
  );
}
