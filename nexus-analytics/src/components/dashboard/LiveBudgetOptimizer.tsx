"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchBudgetOptimizer } from "@/lib/api";
import { fmt } from "@/lib/format";
import { useAccountConnections } from "@/lib/useAccountConnections";

export default function LiveBudgetOptimizer() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>("");
  const { googleConnected, metaConnected, loading: connLoading } = useAccountConnections();
  const connected = googleConnected || metaConnected;

  const load = useCallback(async (totalBudget?: number) => {
    try {
      setLoading(true); setError(null);
      const result = await fetchBudgetOptimizer(totalBudget);
      setData(result);
      setBudgetInput(String(Math.round(result.total_budget)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Don't even hit the API until we know an ad account is connected — avoids
  // firing a request that can only ever 404 for accounts with nothing connected.
  useEffect(() => {
    if (connLoading || !connected) { setLoading(false); return; }
    load();
  }, [connLoading, connected, load]);

  const applyBudget = () => {
    const n = Number(budgetInput);
    if (n > 0) load(n);
  };

  if (connLoading) return null;
  if (!connected) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <Icon name="savings" className="text-[40px] text-outline" />
      <p className="text-on-surface font-semibold">Connect an ad account to optimize your budget</p>
      <p className="text-on-surface-variant text-[13px] max-w-md">
        Connect a Google Ads or Meta Ads account in Settings — there&apos;s nothing to optimize until then.
      </p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Analyzing budget allocation…</span>
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
      <Button variant="primary" icon="refresh" onClick={() => load()}>Retry</Button>
    </div>
  );
  if (!data) return null;

  const misallocated: any[] = data.misallocated ?? [];
  const allocation: any[] = data.allocation ?? [];
  const uplift: number = data.projected_uplift ?? 0;

  return (
    <>
      <PageHeader
        title="Budget Optimizer"
        subtitle="Where spend is underperforming your own best campaign, and how a budget should be split for the best return — every number computed from your real campaign data."
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">

        {/* Budget input */}
        <Card className="md:col-span-12 p-card-padding flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-label-md font-medium text-on-surface-variant mb-1">Budget to allocate</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-48 h-10 px-3 bg-surface border border-outline-variant rounded-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                placeholder="Total budget"
              />
              <Button variant="primary" icon="tune" onClick={applyBudget}>Recalculate</Button>
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Current mix, this budget</p>
              <p className="text-headline-md text-on-surface">{fmt(data.current_revenue_at_budget, "currency")}</p>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Optimized allocation</p>
              <p className="text-headline-md text-tertiary">{fmt(data.projected_revenue, "currency")}</p>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Projected uplift</p>
              <p className={clsx("text-headline-md", uplift >= 0 ? "text-tertiary" : "text-error")}>
                {uplift >= 0 ? "+" : ""}{fmt(uplift, "currency")}
              </p>
            </div>
          </div>
        </Card>

        {/* Where you're losing money */}
        <Card className="md:col-span-6 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40">
            <CardHeader title="Where You're Losing Money" icon="trending_down" className="border-0 pb-0 mb-0" />
            <p className="text-body-sm text-on-surface-variant mt-1">
              Compared to your own best-performing campaign ({data.misallocated?.[0]?.best_roas?.toFixed(2) ?? "—"}x ROAS)
            </p>
          </div>
          {misallocated.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant p-card-padding">
              No meaningful gap found — your active campaigns are performing close to your account's own best.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {misallocated.map((m: any) => (
                <div key={m.campaign_id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-on-surface truncate">{m.campaign_name}</p>
                    <p className="text-label-md text-on-surface-variant">{m.roas.toFixed(2)}x ROAS · {fmt(m.spend, "currency")} spent</p>
                  </div>
                  <span className="text-body-md font-semibold text-error shrink-0">-{fmt(m.opportunity_cost, "currency")}</span>
                </div>
              ))}
              <div className="px-5 py-3 flex items-center justify-between bg-error-container/10">
                <span className="text-label-md font-semibold text-on-surface">Total opportunity cost</span>
                <span className="text-body-md font-bold text-error">-{fmt(data.total_opportunity_cost, "currency")}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Suggested allocation */}
        <Card className="md:col-span-6 p-0 flex flex-col overflow-hidden">
          <div className="p-card-padding border-b border-outline-variant/40">
            <CardHeader title="Suggested Allocation" icon="pie_chart" className="border-0 pb-0 mb-0" />
            <p className="text-body-sm text-on-surface-variant mt-1">Weighted toward campaigns already beating their platform's benchmark</p>
          </div>
          {allocation.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant p-card-padding">
              No campaign is currently beating its platform's benchmark ROAS — nothing to confidently scale up yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {allocation.map((a: any) => {
                const pct = data.total_budget > 0 ? (a.suggested_spend / data.total_budget) * 100 : 0;
                return (
                  <div key={a.campaign_id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <p className="text-body-sm font-medium text-on-surface truncate">{a.campaign_name}</p>
                      <span className="text-body-sm font-semibold text-on-surface shrink-0">{fmt(a.suggested_spend, "currency")}</span>
                    </div>
                    <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-label-md text-on-surface-variant mt-1">
                      {a.roas.toFixed(2)}x ROAS · was {fmt(a.current_spend, "currency")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

      </div>
    </>
  );
}
