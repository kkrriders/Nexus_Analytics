"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchSpendAnalytics } from "@/lib/api";
import { fmt } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { useAccountConnections } from "@/lib/useAccountConnections";

const TOOLTIP_STYLE = {
  background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px",
  fontSize: "13px", boxShadow: "0 4px 16px rgba(15,23,42,0.1)", padding: "10px 14px",
};

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <Card className="p-card-padding flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label-caps text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
          <Icon name={icon} className="text-on-surface-variant text-[20px]" />
        </div>
      </div>
      <div>
        <span className="text-display-kpi text-on-surface">{value}</span>
        {sub && <p className="text-body-sm text-on-surface-variant mt-2">{sub}</p>}
      </div>
    </Card>
  );
}

export default function LiveSpend() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { googleConnected, metaConnected, loading: connLoading } = useAccountConnections();
  const connected = googleConnected || metaConnected;

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setData(await fetchSpendAnalytics());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connLoading || !connected) { setLoading(false); return; }
    load();
  }, [connLoading, connected, load]);

  if (connLoading) return null;
  if (!connected) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <Icon name="account_balance_wallet" className="text-[40px] text-outline" />
      <p className="text-on-surface font-semibold">Spend Analytics needs a connected ad account</p>
      <p className="text-on-surface-variant text-[13px] max-w-md">
        Connect a Google Ads or Meta Ads account in Settings to see total spend to date and trends —
        there&apos;s nothing to show until then.
      </p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Loading spend data…</span>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Icon name={error.includes("404") ? "sync_problem" : "error_outline"} className="text-[40px] text-error" />
      <p className="text-on-surface font-semibold">
        {error.includes("404") ? "No spend data synced yet" : "Analytics engine not reachable"}
      </p>
      <p className="text-on-surface-variant text-[13px]">
        {error.includes("404") ? "Sync your connected account in Settings, then refresh." : error}
      </p>
      <Button variant="primary" icon="refresh" onClick={load}>Retry</Button>
    </div>
  );

  const series: any[]   = data?.daily_series  ?? [];
  const byCampaign: any[] = data?.by_campaign ?? [];
  const byPlatform: any[] = data?.by_platform ?? [];

  const exportSpend = () => exportToCsv("nexus-spend-by-campaign.csv", byCampaign.map((c: any) => ({
    campaign: c.campaign_name, platform: c.platform, spend: c.spend, revenue: c.revenue,
  })));

  return (
    <>
      <PageHeader
        title="Spend Analytics"
        subtitle={`Total ad spend to date — tracking since ${data.tracking_since} (${data.days_tracked} days).`}
        actions={
          <>
            <Button icon="download" onClick={exportSpend}>Export</Button>
            <Button variant="primary" icon="refresh" onClick={load}>Refresh</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">

        <div className="md:col-span-3">
          <StatCard label="Total Spend To Date" value={fmt(data.total_spend_all_time, "currency")} icon="payments" />
        </div>
        <div className="md:col-span-3">
          <StatCard label="Total Revenue To Date" value={fmt(data.total_revenue_all_time, "currency")} icon="trending_up" />
        </div>
        <div className="md:col-span-3">
          <StatCard label="Blended ROAS" value={fmt(data.blended_roas_all_time, "x")} icon="show_chart" />
        </div>
        <div className="md:col-span-3">
          <StatCard label="Avg. Daily Spend" value={fmt(data.avg_daily_spend, "currency")}
            sub={`Highest single day: ${fmt(data.highest_spend_day_amount, "currency")} on ${data.highest_spend_day}`} icon="calendar_today" />
        </div>

        {/* Spend vs Revenue over time */}
        <Card className="md:col-span-8 p-card-padding">
          <CardHeader title="Spend & Revenue Over Time" icon="show_chart" />
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} dy={6} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(Number(v), "currency")} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [fmt(Number(value), "currency"), name === "spend" ? "Spend" : "Revenue"]} />
              <Area type="monotone" dataKey="spend" stroke="#2563EB" strokeWidth={2} fill="url(#grad-spend)" dot={false} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#grad-revenue)" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Platform split */}
        <Card className="md:col-span-4 p-card-padding flex flex-col">
          <CardHeader title="Spend by Platform" icon="pie_chart" />
          {byPlatform.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No platform data yet.</p>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {byPlatform.map((p: any) => {
                const total = byPlatform.reduce((s: number, x: any) => s + x.spend, 0) || 1;
                const pct = (p.spend / total) * 100;
                return (
                  <div key={p.platform}>
                    <div className="flex items-center justify-between text-body-sm mb-1">
                      <span className="flex items-center gap-2 text-on-surface font-medium">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                        {p.display_name}
                      </span>
                      <span className="text-on-surface-variant tabular-nums">{fmt(p.spend, "currency")}</span>
                    </div>
                    <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Spend by campaign */}
        <Card className="md:col-span-12 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40">
            <CardHeader title="Spend by Campaign" icon="campaign" className="border-0 pb-0 mb-0" />
            <p className="text-body-sm text-on-surface-variant mt-1">All-time totals, highest spend first</p>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/40">
                  {["Campaign", "Platform", "Spend", "Revenue", "ROAS"].map((h, i) => (
                    <th key={h} className={clsx("px-5 py-2.5 text-label-caps text-on-surface-variant uppercase whitespace-nowrap", i >= 2 && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/20">
                {byCampaign.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant">No campaign spend recorded yet.</td></tr>
                )}
                {byCampaign.map((c: any) => (
                  <tr key={c.campaign_id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-on-surface">{c.campaign_name}</td>
                    <td className="px-5 py-3 text-on-surface-variant capitalize">{c.platform.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-right font-mono text-on-surface">{fmt(c.spend, "currency")}</td>
                    <td className="px-5 py-3 text-right font-mono text-on-surface">{fmt(c.revenue, "currency")}</td>
                    <td className="px-5 py-3 text-right font-mono text-on-surface">{c.spend > 0 ? fmt(c.revenue / c.spend, "x") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </>
  );
}
