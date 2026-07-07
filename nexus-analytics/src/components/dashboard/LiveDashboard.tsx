"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TrendChart, SpendDonut } from "@/components/charts/TrendChart";
import { clsx } from "@/lib/clsx";
import { fetchDashboard } from "@/lib/api";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function fmt(value: number, unit: string): string {
  if (unit === "currency") {
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000)    return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(2)}`;
  }
  if (unit === "multiplier") return `${value.toFixed(2)}x`;
  if (unit === "percent")   return `${value.toFixed(1)}%`;
  if (unit === "number")    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return String(value);
}

function HealthBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color = value >= 80 ? "#10B981" : value >= 60 ? "#F59E0B" : "#EF4444";
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div className={`w-full bg-surface-variant rounded-full overflow-hidden ${h}`}>
      <div className={`${h} rounded-full transition-all`} style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-[22px] font-semibold text-on-surface">{children}</h2>
      <div className="flex-1 h-px bg-outline-variant/60" />
    </div>
  );
}

type Sev = "critical" | "warning" | "info";
const SEV_STYLE: Record<Sev, { dot: string; badge: string; label: string }> = {
  critical: { dot: "bg-error",    badge: "bg-[#FEF2F2] text-[#991B1B]", label: "Critical" },
  warning:  { dot: "bg-warning",  badge: "bg-[#FFFBEB] text-[#92400E]", label: "Warning"  },
  info:     { dot: "bg-tertiary", badge: "bg-[#ECFDF5] text-[#065F46]", label: "Info"     },
};

/* ─── component ───────────────────────────────────────────────────────────── */
export default function LiveDashboard() {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await fetchDashboard();
      setData(d);
      setCountdown(d.next_update_in_seconds ?? 300);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Countdown tick — refresh when it hits 0
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { load(); return 300; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-on-surface-variant text-[14px]">Connecting to analytics engine…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon name="error_outline" className="text-[40px] text-error" />
        <p className="text-on-surface font-semibold">Analytics engine not reachable</p>
        <p className="text-on-surface-variant text-[13px]">Make sure the Python server is running on port 8000</p>
        <Button variant="primary" icon="refresh" onClick={load}>Retry</Button>
      </div>
    );
  }

  const kpis = data?.kpis;
  const changes = data?.kpi_changes;
  const campaigns = data?.campaigns ?? [];
  const platforms = data?.platforms ?? [];
  const alerts = data?.alerts ?? [];
  const recommendations = data?.recommendations ?? [];
  const forecasts = data?.forecasts ?? [];
  const history = data?.trend_history ?? [];

  // ── KPI cards ─────────────────────────────────────────────────────────────
  type Dir = "up" | "down" | "flat";
  const d = (n: number, inverse = false): Dir => ((n >= 0) !== inverse) ? "up" : "down";
  const KPI_ROWS = [
    { label:"Total Spend",    value:`₹${(kpis?.total_spend/1000).toFixed(1)}K`,  change:`${Math.abs(changes?.spend_change??0).toFixed(1)}%`,        direction:d(changes?.spend_change??0),         icon:"payments",        accent:"blue"    as const },
    { label:"Revenue",        value:`₹${(kpis?.total_revenue/1000).toFixed(1)}K`,change:`${Math.abs(changes?.revenue_change??0).toFixed(1)}%`,      direction:d(changes?.revenue_change??0),       icon:"trending_up",     accent:"emerald" as const },
    { label:"ROAS",           value:`${kpis?.blended_roas?.toFixed(2)}x`,        change:`${Math.abs(changes?.roas_change??0).toFixed(1)}%`,         direction:d(changes?.roas_change??0),          icon:"show_chart",      accent:"indigo"  as const },
    { label:"CPA",            value:`₹${kpis?.average_cpa?.toFixed(2)}`,         change:`${Math.abs(changes?.cpa_change??0).toFixed(1)}%`,          direction:d(changes?.cpa_change??0, true),     icon:"target",          accent:"amber"   as const },
    { label:"CTR",            value:`${kpis?.average_ctr?.toFixed(2)}%`,         change:`${Math.abs(changes?.ctr_change??0).toFixed(1)}%`,          direction:d(changes?.ctr_change??0),           icon:"ads_click",       accent:"cyan"    as const },
    { label:"Conversions",    value:(kpis?.total_conversions??0).toLocaleString(),change:`${Math.abs(changes?.conversions_change??0).toFixed(1)}%`, direction:d(changes?.conversions_change??0),   icon:"check_circle",    accent:"purple"  as const },
    { label:"Profit",         value:`₹${(kpis?.total_profit/1000).toFixed(1)}K`, change:`${Math.abs(changes?.profit_change??0).toFixed(1)}%`,       direction:d(changes?.profit_change??0),        icon:"account_balance", accent:"emerald" as const },
    { label:"AI Health Score",value:`${kpis?.ai_health_score?.toFixed(0)}/100`,  change:`${Math.abs(changes?.health_score_change??0).toFixed(1)} pts`,direction:d(changes?.health_score_change??0),icon:"psychology",      accent:"purple"  as const },
  ];

  const topRec = recommendations[0];
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical");
  const warningAlerts  = alerts.filter((a: any) => a.severity === "warning");

  type Status = "active" | "paused" | "review" | "draft";
  const STATUS_STYLE: Record<Status, string> = {
    active: "bg-[#ECFDF5] text-[#065F46]",
    paused: "bg-surface-container text-on-surface-variant",
    review: "bg-[#FFFBEB] text-[#92400E]",
    draft:  "bg-[#F1F5F9] text-[#475569]",
  };

  return (
    <div className="space-y-8 pb-10">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-on-surface leading-tight">Executive Dashboard</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            {lastUpdated && ` · Updated ${lastUpdated}`}
            {loading && <span className="ml-2 text-primary animate-pulse">· Refreshing…</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant bg-surface-container px-3 py-2 rounded-[10px]">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span>Next refresh in <span className="font-mono font-semibold text-on-surface">{countdown}s</span></span>
          </div>
          <Button icon="file_download" size="sm">Export</Button>
          <Button variant="primary" icon="refresh" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {/* ── Section 1: KPIs ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Executive KPIs</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          {KPI_ROWS.map(k => <KpiCard key={k.label} {...k} />)}
        </div>
      </div>

      {/* ── Section 2: AI Command Center ─────────────────────────────────── */}
      {(criticalAlerts.length > 0 || topRec) && (
        <div>
          <SectionLabel>
            <span className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-[8px] bg-ai flex items-center justify-center">
                <Icon name="psychology" className="text-white text-[16px]" />
              </span>
              AI Command Center
            </span>
          </SectionLabel>

          <div className="bg-white border border-outline-variant rounded-[14px] elevation-card overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-[#F5F3FF]/50">
              <div className="flex items-center gap-3">
                {criticalAlerts.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />}
                <span className="text-[14px] font-semibold text-on-surface">
                  {criticalAlerts.length > 0 ? `${criticalAlerts.length} Critical Alert${criticalAlerts.length > 1 ? "s" : ""}` : ""}
                  {criticalAlerts.length > 0 && warningAlerts.length > 0 ? " · " : ""}
                  {warningAlerts.length > 0 ? `${warningAlerts.length} Warning${warningAlerts.length > 1 ? "s" : ""}` : ""}
                  {alerts.length === 0 ? "All systems healthy" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/ai-recommendations"><Button size="sm">View All</Button></Link>
                <Button size="sm" icon="settings">Configure AI</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant">
              {/* Active alerts */}
              <div className="p-5 space-y-3">
                <p className="text-[12px] font-bold text-outline uppercase tracking-widest mb-4">Active Alerts</p>
                {alerts.slice(0, 3).map((a: any) => (
                  <div key={a.id} className={clsx(
                    "p-3 rounded-[10px] border",
                    a.severity === "critical" ? "bg-[#FEF2F2] border-[#FECACA]" :
                    a.severity === "warning"  ? "bg-[#FFFBEB] border-[#FDE68A]" :
                                                "bg-[#ECFDF5] border-[#A7F3D0]",
                  )}>
                    <p className="text-[13px] font-semibold text-on-surface">{a.campaign_name}</p>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">{a.message}</p>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="p-3 rounded-[10px] border bg-[#ECFDF5] border-[#A7F3D0]">
                    <p className="text-[13px] font-semibold text-[#065F46]">No alerts — all campaigns healthy</p>
                  </div>
                )}
              </div>

              {/* Top recommendation */}
              <div className="p-5">
                <p className="text-[12px] font-bold text-outline uppercase tracking-widest mb-4">Top Recommendation</p>
                {topRec ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {topRec.campaign_name}
                      </span>
                      <span className="text-[12px] text-on-surface-variant capitalize">{topRec.type}</span>
                    </div>
                    <h3 className="text-[16px] font-bold text-on-surface mb-1">{topRec.title}</h3>
                    <p className="text-[13px] text-on-surface-variant mb-4">{topRec.description}</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {topRec.roas_impact !== 0 && (
                        <div className="bg-[#ECFDF5] rounded-[10px] p-3 text-center">
                          <div className="text-[20px] font-bold text-[#10B981]">+{topRec.roas_impact}%</div>
                          <div className="text-[11px] text-[#065F46] font-medium">ROAS</div>
                        </div>
                      )}
                      {topRec.revenue_impact !== 0 && (
                        <div className="bg-[#ECFDF5] rounded-[10px] p-3 text-center">
                          <div className="text-[20px] font-bold text-[#10B981]">+{topRec.revenue_impact}%</div>
                          <div className="text-[11px] text-[#065F46] font-medium">Revenue</div>
                        </div>
                      )}
                      {topRec.cpa_impact !== 0 && (
                        <div className={clsx("rounded-[10px] p-3 text-center", topRec.cpa_impact < 0 ? "bg-[#ECFDF5]" : "bg-[#FEF2F2]")}>
                          <div className={clsx("text-[20px] font-bold", topRec.cpa_impact < 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                            {topRec.cpa_impact}%
                          </div>
                          <div className="text-[11px] font-medium text-on-surface-variant">CPA</div>
                        </div>
                      )}
                    </div>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-on-surface-variant font-medium">Confidence</span>
                      <span className="font-bold text-ai">{topRec.confidence}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#F5F3FF] rounded-full overflow-hidden">
                      <div className="h-2 rounded-full bg-ai" style={{ width:`${topRec.confidence}%` }} />
                    </div>
                  </>
                ) : <p className="text-[13px] text-on-surface-variant">No high-priority recommendations at this time.</p>}
              </div>

              {/* Quick actions */}
              <div className="p-5">
                <p className="text-[12px] font-bold text-outline uppercase tracking-widest mb-4">Quick Actions</p>
                <div className="space-y-3">
                  {[
                    { icon:"check_circle", bg:"bg-[#ECFDF5]", border:"border-[#A7F3D0]", color:"text-[#10B981]", label:"Approve", sub:"Apply changes immediately", hover:"hover:bg-[#D1FAE5]", textColor:"text-[#065F46]" },
                    { icon:"cancel",       bg:"bg-[#FEF2F2]", border:"border-[#FECACA]", color:"text-error",     label:"Reject",  sub:"Dismiss this suggestion",   hover:"hover:bg-[#FEE2E2]", textColor:"text-[#991B1B]" },
                    { icon:"schedule",     bg:"bg-[#FFFBEB]", border:"border-[#FDE68A]", color:"text-warning",   label:"Schedule",sub:"Apply at a specific time",   hover:"hover:bg-[#FEF3C7]", textColor:"text-[#92400E]" },
                    { icon:"insights",     bg:"bg-[#F5F3FF]", border:"border-[#DDD6FE]", color:"text-ai",        label:"Full Analysis", sub:"See all AI reasoning", hover:"hover:bg-[#EDE9FE]", textColor:"text-[#4C1D95]" },
                  ].map(a => {
                    const content = (
                      <>
                        <Icon name={a.icon} className={clsx("text-[20px]", a.color)} />
                        <div>
                          <div className={clsx("text-[13px] font-semibold", a.textColor)}>{a.label}</div>
                          <div className="text-[11px] text-on-surface-variant">{a.sub}</div>
                        </div>
                      </>
                    );
                    const className = clsx("w-full flex items-center gap-3 px-4 py-3 border rounded-[10px] transition-colors text-left", a.bg, a.border, a.hover);
                    return a.label === "Full Analysis" ? (
                      <Link key={a.label} href="/ai-recommendations" className={className}>{content}</Link>
                    ) : (
                      <button key={a.label} className={className}>{content}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: Platform Performance ──────────────────────────────── */}
      <div>
        <SectionLabel>Platform Performance</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {platforms.map((p: any) => (
            <Card key={p.platform} className="overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ background:`${p.color}12` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white" style={{ background:p.color }}>
                    <Icon name={p.icon} className="text-[18px]" />
                  </div>
                  <span className="text-[15px] font-bold text-on-surface">{p.display_name}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: p.health_score >= 80 ? "#10B981" : p.health_score >= 60 ? "#F59E0B" : "#EF4444" }}>
                  {p.health_score?.toFixed(0)}%
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { l:"Spend",   v:`₹${(p.spend/1000).toFixed(1)}K` },
                    { l:"Revenue", v:`₹${(p.revenue/1000).toFixed(1)}K` },
                    { l:"ROAS",    v:`${p.roas?.toFixed(2)}x` },
                    { l:"CTR",     v:`${p.ctr?.toFixed(1)}%` },
                  ].map(m => (
                    <div key={m.l}>
                      <div className="text-[11px] text-outline font-medium uppercase tracking-wide mb-0.5">{m.l}</div>
                      <div className="text-[15px] font-bold text-on-surface font-mono">{m.v}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[12px] text-on-surface-variant mb-1.5 flex justify-between">
                  <span>Health Score</span><span className="font-semibold">{p.health_score?.toFixed(0)}/100</span>
                </div>
                <HealthBar value={p.health_score} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Section 4: Trend Analytics ───────────────────────────────────── */}
      <div>
        <SectionLabel>Trend Analytics</SectionLabel>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2 p-6">
            <CardHeader title="Performance Trends (30 Days)" icon="show_chart" action={
              <Button size="sm" icon="file_download">Export</Button>
            } />
            <TrendChart history={history} />
          </Card>
          <Card className="p-6">
            <CardHeader title="Spend by Platform" icon="pie_chart" />
            <SpendDonut platforms={platforms} />
            <div className="mt-5 pt-4 border-t border-outline-variant/60">
              <div className="flex justify-between text-[13px]">
                <span className="text-on-surface-variant">Total Spend</span>
                <span className="font-bold text-on-surface">₹{(kpis?.total_spend/1000).toFixed(1)}K</span>
              </div>
              <div className="flex justify-between text-[13px] mt-1">
                <span className="text-on-surface-variant">Total Revenue</span>
                <span className="font-bold text-[#10B981]">₹{(kpis?.total_revenue/1000).toFixed(1)}K</span>
              </div>
              <div className="flex justify-between text-[13px] mt-1">
                <span className="text-on-surface-variant">Blended ROAS</span>
                <span className="font-bold text-[#4F46E5]">{kpis?.blended_roas?.toFixed(2)}x</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Section 5: Campaign Table ─────────────────────────────────────── */}
      <div>
        <SectionLabel>Campaign Performance</SectionLabel>
        <Card className="overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-[17px] font-semibold text-on-surface">All Campaigns</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" icon="filter_list">Filter</Button>
              <Button size="sm" icon="sort">Sort</Button>
              <Button variant="primary" size="sm" icon="add">New Campaign</Button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[1080px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/50">
                  {["Campaign","Platform","Budget","Spend","CTR","CPC","CPA","ROAS","Revenue","Health","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-[12px] font-bold text-outline uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any, i: number) => {
                  const m = c.metrics;
                  const status = c.campaign.status as Status;
                  return (
                    <tr key={c.campaign.id} className={clsx("border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-low/60 transition-colors")}>
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-semibold text-on-surface">{c.campaign.name}</div>
                        <div className="text-[11px] text-outline">{c.campaign.target_audience}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full whitespace-nowrap">
                          {c.campaign.platform.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-on-surface">₹{(c.campaign.budget/1000).toFixed(0)}K</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-on-surface">{m.spend > 0 ? `₹${(m.spend/1000).toFixed(1)}K` : "—"}</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-on-surface">{m.ctr > 0 ? `${m.ctr.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-on-surface">{m.cpc > 0 ? `₹${m.cpc.toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono text-on-surface">{m.cpa > 0 ? `₹${m.cpa.toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono font-semibold text-[#4F46E5]">{m.roas > 0 ? `${m.roas.toFixed(2)}x` : "—"}</td>
                      <td className="px-4 py-3.5 text-[13px] font-mono font-semibold text-[#10B981]">{m.revenue > 0 ? `₹${(m.revenue/1000).toFixed(1)}K` : "—"}</td>
                      <td className="px-4 py-3.5 min-w-[80px]">
                        {c.health.score > 0 ? (
                          <div>
                            <div className="text-[11px] font-bold mb-1"
                              style={{ color: c.health.score >= 80 ? "#10B981" : c.health.score >= 60 ? "#F59E0B" : "#EF4444" }}>
                              {c.health.score.toFixed(0)}
                            </div>
                            <HealthBar value={c.health.score} size="sm" />
                          </div>
                        ) : <span className="text-outline text-[12px]">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={clsx("text-[11px] font-bold px-2.5 py-1 rounded-full capitalize", STATUS_STYLE[status])}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-outline-variant flex items-center justify-between text-[13px] text-on-surface-variant">
            <span>{campaigns.length} campaigns · {campaigns.filter((c: any) => c.campaign.status === "active").length} active</span>
          </div>
        </Card>
      </div>

      {/* ── Section 6: Forecasting ────────────────────────────────────────── */}
      <div>
        <SectionLabel>Forecasting — Next 30 Days</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {forecasts.map((f: any) => (
            <Card key={f.metric} className="p-5">
              <div className="w-9 h-9 rounded-[10px] mb-3 flex items-center justify-center bg-primary/10">
                <Icon name={f.icon} className="text-[18px] text-primary" />
              </div>
              <div className="text-[11px] font-bold text-outline uppercase tracking-wide mb-2">{f.label}</div>
              <div className="text-[13px] text-on-surface-variant mb-0.5">
                Current: <span className="font-semibold text-on-surface font-mono">{fmt(f.current, f.unit)}</span>
              </div>
              <div className="text-[15px] font-bold mb-3 text-primary font-mono">
                {fmt(f.forecast_30d, f.unit)}
              </div>
              <div className="text-[11px] text-on-surface-variant mb-1 flex justify-between">
                <span>Confidence</span>
                <span className="font-bold text-primary">{f.confidence.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width:`${f.confidence}%` }} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Sections 7–8: Alerts + Recommendations ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Alert Center */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-[17px] font-semibold text-on-surface flex items-center gap-2">
              <Icon name="notifications_active" className="text-[20px] text-error" />
              Alert Center
            </h3>
            <Button size="sm">View All</Button>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {alerts.length === 0 ? (
              <div className="px-5 py-6 text-center text-[13px] text-on-surface-variant">
                No active alerts — all campaigns healthy
              </div>
            ) : alerts.map((a: any) => {
              const s = SEV_STYLE[a.severity as Sev];
              return (
                <div key={a.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-surface-container-low/50 transition-colors">
                  <span className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", s.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface">{a.campaign_name}</p>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">{a.message}</p>
                  </div>
                  <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", s.badge)}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-[17px] font-semibold text-on-surface flex items-center gap-2">
              <Icon name="psychology" className="text-[20px] text-ai" />
              AI Recommendations
            </h3>
            <Button size="sm">View All</Button>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {recommendations.length === 0 ? (
              <div className="px-5 py-6 text-center text-[13px] text-on-surface-variant">
                No recommendations — campaigns are optimised
              </div>
            ) : recommendations.slice(0, 4).map((r: any) => (
              <div key={r.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-surface-container-low/50 transition-colors">
                <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-full shrink-0 mt-0.5",
                  r.priority === "high"   ? "bg-[#FEF2F2] text-[#991B1B]" :
                  r.priority === "medium" ? "bg-[#FFFBEB] text-[#92400E]" :
                                             "bg-surface-container text-on-surface-variant"
                )}>
                  {r.priority.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-on-surface">{r.title}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{r.campaign_name} · {r.type}</p>
                </div>
                <span className="text-[12px] font-bold text-ai shrink-0">{r.confidence}%</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

    </div>
  );
}
