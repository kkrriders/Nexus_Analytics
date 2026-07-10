"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import ScenarioPlanner from "@/components/dashboard/ScenarioPlanner";
import { clsx } from "@/lib/clsx";
import { fetchForecasts } from "@/lib/api";
import { useDashboardPrefs } from "@/lib/dashboardPrefs";
import { fmt } from "@/lib/format";
import { useAccountConnections } from "@/lib/useAccountConnections";

export default function LiveForecasting() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const { days } = useDashboardPrefs();
  const { googleConnected, metaConnected, loading: connLoading } = useAccountConnections();
  const connected = googleConnected || metaConnected;

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setData(await fetchForecasts(days));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Don't even hit the API until we know an ad account is connected — avoids
  // firing a request that can only ever 404 for accounts with nothing connected.
  useEffect(() => {
    if (connLoading || !connected) { setLoading(false); return; }
    load();
  }, [connLoading, connected, load]);

  if (connLoading) return null;
  if (!connected) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <Icon name="auto_graph" className="text-[40px] text-outline" />
      <p className="text-on-surface font-semibold">Connect an ad account for forecasts</p>
      <p className="text-on-surface-variant text-[13px] max-w-md">
        Connect a Google Ads or Meta Ads account in Settings — there&apos;s nothing to forecast until then.
      </p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Loading forecast data…</span>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Icon name={error.includes("404") ? "sync_problem" : "error_outline"} className="text-[40px] text-error" />
      <p className="text-on-surface font-semibold">
        {error.includes("404") ? "No data synced yet" : "Analytics engine not reachable"}
      </p>
      <p className="text-on-surface-variant text-[13px]">
        {error.includes("404") ? "Sync your connected account in Settings, then refresh." : error}
      </p>
      <Button variant="primary" icon="refresh" onClick={load}>Retry</Button>
    </div>
  );

  const forecasts: any[] = data?.forecasts     ?? [];
  const history:   any[] = data?.trend_history ?? [];

  // Build SVG path from trend history (revenue line)
  const revenuePoints = history.map((p: any) => p.revenue ?? 0);
  const spendPoints   = history.map((p: any) => p.spend   ?? 0);

  function buildPath(points: number[], viewW = 100, viewH = 100): string {
    if (points.length < 2) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const step = viewW / (points.length - 1);
    return points
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(viewH - ((v - min) / range) * (viewH * 0.75) - viewH * 0.1).toFixed(2)}`)
      .join(" ");
  }

  const revPath   = buildPath(revenuePoints);
  const spendPath = buildPath(spendPoints);

  return (
    <>
      <PageHeader
        title="Trend Forecasting"
        subtitle="ARIMA-based projections across spend, revenue, and efficiency for the next 30 days."
        actions={<Button icon="refresh" onClick={load}>Refresh</Button>}
      />

      {/* Forecast KPI mini-cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-gutter">
        {forecasts.map((f: any) => {
          const pctChange = f.current > 0
            ? ((f.forecast_30d - f.current) / f.current) * 100
            : 0;
          const isUp = pctChange >= 0;
          // For CPA: lower is better
          const isCPA     = f.metric === "cpa";
          const isGood    = isCPA ? !isUp : isUp;
          const trendIcon = Math.abs(pctChange) < 0.1 ? "trending_flat" : isUp ? "trending_up" : "trending_down";
          const tone      = Math.abs(pctChange) < 0.1 ? "text-outline" : isGood ? "text-tertiary" : "text-error";

          return (
            <Card key={f.metric} className="p-card-padding">
              <div className="flex justify-between items-start mb-2">
                <span className="text-label-md text-on-surface-variant">{f.label}</span>
                <Icon name={f.icon} className="text-outline text-sm" />
              </div>
              <div className="text-headline-lg font-semibold text-on-surface mb-1 font-mono">
                {fmt(f.forecast_30d, f.unit)}
              </div>
              <div className="text-[11px] text-on-surface-variant mb-2">
                Current: <span className="font-semibold font-mono">{fmt(f.current, f.unit)}</span>
              </div>
              <div className={clsx("flex items-center gap-1 text-label-caps", tone)}>
                <Icon name={trendIcon} className="text-[14px]" />
                <span>{pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%</span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-on-surface-variant mb-0.5">
                  <span>Confidence</span>
                  <span className="font-semibold">{f.confidence.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${f.confidence}%` }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Forecast chart — live SVG from trend history */}
      <Card className="flex flex-col h-[500px] p-0">
        <div className="p-card-padding border-b border-outline-variant flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-headline-md text-on-surface">Revenue vs Spend — 30-Day Trend</h2>
            <p className="text-body-sm text-on-surface-variant">Live trend data from analytics engine · 30-day window</p>
          </div>
          <div className="flex items-center gap-4 text-body-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-primary" />
              <span className="text-on-surface-variant">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-tertiary" style={{ borderTop: "2px dashed" }} />
              <span className="text-on-surface-variant">Spend</span>
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-surface-bright">
          <div className="absolute inset-0 w-full h-full"
            style={{ backgroundImage: "linear-gradient(to right, rgba(203,213,225,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(203,213,225,0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          {history.length > 1 ? (
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Revenue area fill */}
              <path d={`${revPath} L100,100 L0,100 Z`} fill="var(--color-primary)" opacity={0.06} />
              {/* Revenue line */}
              <path d={revPath} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              {/* Spend line dashed */}
              <path d={spendPath} fill="none" stroke="var(--color-tertiary)" strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <div className="z-10 absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant text-body-sm">
              <Icon name="monitoring" className="text-[40px] text-outline" />
              <span>Waiting for trend data…</span>
            </div>
          )}

          {/* X-axis labels */}
          {history.length > 0 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-[10px] text-on-surface-variant/60">
              <span>{history[0]?.label}</span>
              <span>{history[Math.floor(history.length / 2)]?.label}</span>
              <span>{history[history.length - 1]?.label}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Scenario Planning */}
      <div className="pb-margin-desktop">
        <ScenarioPlanner />
      </div>
    </>
  );
}
