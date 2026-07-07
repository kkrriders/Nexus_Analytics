"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchRecommendations } from "@/lib/api";

type Priority = "high" | "medium" | "low";

const PRIORITY_STYLES: Record<Priority, { tag: string; tagColor: string; iconWrap: string }> = {
  high:   { tag: "HIGH PRIORITY",   tagColor: "text-error",              iconWrap: "bg-error-container/20 text-error" },
  medium: { tag: "MEDIUM PRIORITY", tagColor: "text-warning",            iconWrap: "bg-warning/10 text-warning" },
  low:    { tag: "LOW PRIORITY",    tagColor: "text-on-surface-variant", iconWrap: "bg-surface-variant/60 text-on-surface-variant" },
};

const TYPE_ICON: Record<string, string> = {
  budget_optimization:   "payments",
  bid_strategy:          "trending_up",
  creative_refresh:      "image",
  audience_expansion:    "group_add",
  schedule_optimization: "schedule",
  keyword_optimization:  "search",
  optimization:          "tune",
};

const FILTERS = ["All", "Budget", "Creative", "Audience", "Bid", "Schedule"];

function RecCard({ rec, index }: { rec: any; index: number }) {
  const priority = (rec.priority ?? "medium") as Priority;
  const style    = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium;
  const icon     = TYPE_ICON[rec.type ?? ""] ?? "lightbulb";

  const upliftLines: string[] = [];
  if (rec.roas_impact    > 0) upliftLines.push(`+${rec.roas_impact.toFixed(1)}% ROAS`);
  if (rec.revenue_impact > 0) upliftLines.push(`+${rec.revenue_impact.toFixed(1)}% Rev`);
  if (rec.cpa_impact     < 0) upliftLines.push(`${rec.cpa_impact.toFixed(1)}% CPA`);
  const uplift = upliftLines[0] ?? "Optimization";

  return (
    <Card className={clsx("lg:col-span-4 p-card-padding flex flex-col hover:shadow-md transition-shadow",
      index >= 3 && "opacity-75"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={clsx("w-8 h-8 rounded-md flex items-center justify-center shrink-0", style.iconWrap)}>
            <Icon name={icon} className="text-[16px]" />
          </div>
          <span className={clsx("text-label-caps", style.tagColor)}>{style.tag}</span>
        </div>
        <span className="flex items-center gap-1 text-label-md text-tertiary bg-tertiary-container/10 px-2 py-0.5 rounded-full">
          <Icon name="trending_up" className="text-[14px]" />
          {uplift}
        </span>
      </div>

      <h4 className="text-headline-md text-on-surface mb-1">{rec.title}</h4>
      <p className="text-body-sm text-on-surface-variant mb-3">{rec.campaign_name} · {(rec.type ?? "").replace(/_/g, " ")}</p>

      <div className="space-y-3 mb-5 flex-1">
        <div className="bg-tertiary-container/5 p-3 rounded-lg border border-tertiary-container/20">
          <p className="text-label-caps text-tertiary mb-1">RECOMMENDATION</p>
          <p className="text-body-sm text-on-surface">{rec.description}</p>
        </div>

        {/* Impact grid */}
        <div className="grid grid-cols-3 gap-2">
          {rec.roas_impact !== 0 && (
            <div className={clsx("rounded-[8px] p-2 text-center", rec.roas_impact > 0 ? "bg-[#ECFDF5]" : "bg-[#FEF2F2]")}>
              <div className={clsx("text-[16px] font-bold", rec.roas_impact > 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                {rec.roas_impact > 0 ? "+" : ""}{rec.roas_impact.toFixed(1)}%
              </div>
              <div className="text-[10px] font-medium text-on-surface-variant">ROAS</div>
            </div>
          )}
          {rec.revenue_impact !== 0 && (
            <div className={clsx("rounded-[8px] p-2 text-center", rec.revenue_impact > 0 ? "bg-[#ECFDF5]" : "bg-[#FEF2F2]")}>
              <div className={clsx("text-[16px] font-bold", rec.revenue_impact > 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                {rec.revenue_impact > 0 ? "+" : ""}{rec.revenue_impact.toFixed(1)}%
              </div>
              <div className="text-[10px] font-medium text-on-surface-variant">Revenue</div>
            </div>
          )}
          {rec.cpa_impact !== 0 && (
            <div className={clsx("rounded-[8px] p-2 text-center", rec.cpa_impact < 0 ? "bg-[#ECFDF5]" : "bg-[#FEF2F2]")}>
              <div className={clsx("text-[16px] font-bold", rec.cpa_impact < 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                {rec.cpa_impact.toFixed(1)}%
              </div>
              <div className="text-[10px] font-medium text-on-surface-variant">CPA</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-outline-variant mt-auto">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-label-md text-on-surface-variant">
            <Icon name="verified" className="text-[16px] text-primary" />
            <span>{rec.confidence.toFixed(0)}% confidence</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors" title="Reject">
            <Icon name="close" className="text-[16px]" />
          </button>
          <button className="px-3 py-1.5 bg-primary text-on-primary text-label-md rounded-md hover:bg-surface-tint transition-colors">
            Approve
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function LiveRecommendations() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      setData(await fetchRecommendations());
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
      <span className="text-on-surface-variant text-[14px]">Loading AI recommendations…</span>
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

  const recs:   any[] = data?.recommendations ?? [];
  const kpis:   any   = data?.kpis            ?? {};
  const health: number = kpis?.ai_health_score ?? 82;
  const avgConf: number = recs.length > 0 ? recs.reduce((s: number, r: any) => s + (r.confidence ?? 0), 0) / recs.length : 0;

  const filtered = activeFilter === "All" ? recs : recs.filter((r: any) => {
    const t = (r.type ?? "").toLowerCase();
    if (activeFilter === "Budget")   return t.includes("budget");
    if (activeFilter === "Creative") return t.includes("creative");
    if (activeFilter === "Audience") return t.includes("audience");
    if (activeFilter === "Bid")      return t.includes("bid");
    if (activeFilter === "Schedule") return t.includes("schedule");
    return true;
  });

  // Gauge stroke offset: circumference = 2π × 45 ≈ 283
  const dashOffset = 283 - (health / 100) * 283;

  return (
    <>
      <PageHeader
        title="AI Recommendation Center"
        subtitle="Nexus Intelligence engine has analyzed your active campaigns and identified optimization opportunities."
        actions={
          <>
            <Button variant="secondary" onClick={load}>Recalculate</Button>
            <Button variant="primary" icon="check_circle">Apply All Safe Recs</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter pb-margin-desktop">

        {/* Strategy Overview */}
        <Card className="lg:col-span-8 p-card-padding flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name="psychology" className="text-primary text-[22px]" />
              <h3 className="text-headline-md text-on-surface">Strategy Overview</h3>
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 bg-tertiary-container/10 text-on-tertiary-container rounded-full text-label-caps">
              <Icon name="auto_awesome" className="text-[13px] fill" />
              AI Active
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant mb-6">Holistic view of current AI confidence and system health.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center flex-1">
            {/* Health gauge */}
            <div className="flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-lg">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-label={`AI Health Score: ${health.toFixed(0)}%`}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-surface-variant" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10"
                    strokeDasharray="283" strokeDashoffset={dashOffset} strokeLinecap="round"
                    className={health >= 80 ? "text-tertiary" : health >= 60 ? "text-warning" : "text-error"} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-display-kpi text-on-surface leading-none">
                    {health.toFixed(0)}<span className="text-headline-md">%</span>
                  </span>
                </div>
              </div>
              <p className="text-label-md text-on-surface-variant mt-4 text-center">Platform Health Score</p>
            </div>

            {/* Stats */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center text-body-sm mb-1.5">
                  <span className="text-on-surface-variant">Avg. Prediction Confidence</span>
                  <span className="text-on-surface font-medium">{avgConf.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${avgConf}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-body-sm mb-1.5">
                  <span className="text-on-surface-variant">Recommendations Generated</span>
                  <span className="text-on-surface font-medium">{recs.length}</span>
                </div>
                <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                  <div className="bg-tertiary h-full rounded-full" style={{ width: `${Math.min(100, recs.length * 12.5)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-body-sm mb-1.5">
                  <span className="text-on-surface-variant">High Priority</span>
                  <span className="text-on-surface font-medium">{recs.filter((r: any) => r.priority === "high").length}</span>
                </div>
                <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                  <div className="bg-error h-full rounded-full"
                    style={{ width: `${recs.length > 0 ? (recs.filter((r: any) => r.priority === "high").length / recs.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant">
                <p className="text-body-sm text-on-surface-variant">
                  Data refreshes every <span className="font-semibold text-on-surface">5 minutes</span>. DeepSeek analyzes ClickHouse metrics each new window.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Critical Impact panel */}
        <div className="lg:col-span-4 bg-primary-container text-on-primary-container rounded-xl p-card-padding shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-headline-md mb-1">Critical Impact</h3>
            <p className="text-body-sm opacity-80 mb-6">Immediate actions required for optimal performance.</p>
            <div className="mt-auto space-y-3">
              {recs.filter((r: any) => r.priority === "high").slice(0, 2).map((r: any) => (
                <div key={r.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-start gap-3">
                    <Icon name="warning" className="text-error-container mt-0.5 text-[20px] fill" />
                    <div>
                      <h4 className="text-label-md font-semibold text-white leading-tight">{r.title}</h4>
                      <p className="text-body-sm opacity-90 mt-1 line-clamp-2">{r.description}</p>
                    </div>
                  </div>
                  <button className="mt-3 w-full py-1.5 bg-white text-primary text-label-md font-medium rounded-md hover:bg-surface-container-low transition-colors">
                    View Insight
                  </button>
                </div>
              ))}
              {recs.filter((r: any) => r.priority === "high").length === 0 && (
                <div className="bg-white/10 rounded-lg p-3 border border-white/20 text-center">
                  <Icon name="check_circle" className="text-[32px] text-white/60 mb-2" />
                  <p className="text-body-sm text-white/80">No critical issues detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-outline-variant pb-3 mt-2">
          <h3 className="text-headline-md text-on-surface">Actionable Insights</h3>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={clsx("text-label-md px-3.5 py-1.5 rounded-full transition-colors",
                  activeFilter === f
                    ? "bg-primary text-on-primary font-medium"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendation cards */}
        {filtered.length === 0 ? (
          <div className="lg:col-span-12 py-16 text-center text-on-surface-variant">
            <Icon name="psychology" className="text-[48px] text-outline mb-3" />
            <p className="text-body-md">No recommendations match the selected filter.</p>
          </div>
        ) : (
          filtered.map((rec: any, i: number) => <RecCard key={rec.id ?? i} rec={rec} index={i} />)
        )}

      </div>
    </>
  );
}
