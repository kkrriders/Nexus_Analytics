"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchCampaigns } from "@/lib/api";
import { fmt } from "@/lib/format";

/**
 * "What if I changed this campaign's budget?" — every projection assumes
 * revenue scales with spend at that campaign's own real, current ROAS. That's
 * a stated, transparent assumption (not a fitted diminishing-returns curve —
 * real accounts don't have enough spend variance to fit one honestly), same
 * methodology as the Budget Optimizer and the recommendation engine.
 */
export default function ScenarioPlanner() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await fetchCampaigns();
      const active = (data ?? []).filter((c: any) => ["active", "review"].includes(c.campaign?.status) && c.metrics?.spend > 0);
      setCampaigns(active);
      setAdjustments(Object.fromEntries(active.map((c: any) => [c.campaign.id, c.metrics.spend])));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setAdjustment = (campaignId: string, value: number) => {
    setAdjustments((prev) => ({ ...prev, [campaignId]: Math.max(0, value) }));
  };

  const resetAll = () => {
    setAdjustments(Object.fromEntries(campaigns.map((c) => [c.campaign.id, c.metrics.spend])));
  };

  const { baselineSpend, baselineRevenue, baselineRoas, scenarioSpend, scenarioRevenue, scenarioRoas, delta } = useMemo(() => {
    let bSpend = 0, bRev = 0, sSpend = 0, sRev = 0;
    for (const c of campaigns) {
      const roas = c.metrics.roas ?? 0;
      bSpend += c.metrics.spend;
      bRev += c.metrics.revenue;
      const adjSpend = adjustments[c.campaign.id] ?? c.metrics.spend;
      sSpend += adjSpend;
      sRev += adjSpend * roas;
    }
    return {
      baselineSpend: bSpend, baselineRevenue: bRev, baselineRoas: bSpend > 0 ? bRev / bSpend : 0,
      scenarioSpend: sSpend, scenarioRevenue: sRev, scenarioRoas: sSpend > 0 ? sRev / sSpend : 0,
      delta: sRev - bRev,
    };
  }, [campaigns, adjustments]);

  if (loading) return (
    <Card className="p-card-padding flex items-center justify-center h-48 gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-on-surface-variant text-[14px]">Loading campaigns…</span>
    </Card>
  );
  if (error) return (
    <Card className="p-card-padding flex flex-col items-center justify-center h-48 gap-3">
      <Icon name="error_outline" className="text-[32px] text-error" />
      <p className="text-body-sm text-on-surface-variant">{error}</p>
      <Button variant="primary" icon="refresh" onClick={load}>Retry</Button>
    </Card>
  );
  if (campaigns.length === 0) return (
    <Card className="p-card-padding flex flex-col items-center justify-center h-48 gap-2 text-center">
      <Icon name="schema" className="text-[32px] text-outline" />
      <p className="text-body-sm text-on-surface-variant">No active campaigns to model yet.</p>
    </Card>
  );

  return (
    <Card className="p-card-padding">
      <CardHeader
        title="Scenario Planning"
        icon="schema"
        action={<Button icon="restart_alt" onClick={resetAll}>Reset</Button>}
      />
      <p className="text-body-sm text-on-surface-variant mb-5">
        Adjust a campaign's budget below to see the projected effect — assumes each campaign's ROAS holds steady at its current real value.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Sliders */}
        <div className="flex flex-col gap-4">
          {campaigns.map((c: any) => {
            const adj = adjustments[c.campaign.id] ?? c.metrics.spend;
            const pctOfCurrent = c.metrics.spend > 0 ? (adj / c.metrics.spend) * 100 : 100;
            return (
              <div key={c.campaign.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-body-sm font-medium text-on-surface truncate">{c.campaign.name}</span>
                  <span className="text-label-md text-on-surface-variant shrink-0">{c.metrics.roas.toFixed(2)}x ROAS</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(c.metrics.spend * 3, 100)}
                    step={Math.max(1, Math.round(c.metrics.spend / 100))}
                    value={adj}
                    onChange={(e) => setAdjustment(c.campaign.id, Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className={clsx("text-label-md font-semibold w-24 text-right tabular-nums shrink-0",
                    pctOfCurrent > 100 ? "text-tertiary" : pctOfCurrent < 100 ? "text-error" : "text-on-surface-variant")}>
                    {fmt(adj, "currency")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison */}
        <div className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Baseline</p>
              <p className="text-headline-md text-on-surface">{fmt(baselineRevenue, "currency")}</p>
              <p className="text-body-sm text-on-surface-variant">{fmt(baselineSpend, "currency")} spend · {baselineRoas.toFixed(2)}x ROAS</p>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Scenario</p>
              <p className="text-headline-md text-tertiary">{fmt(scenarioRevenue, "currency")}</p>
              <p className="text-body-sm text-on-surface-variant">{fmt(scenarioSpend, "currency")} spend · {scenarioRoas.toFixed(2)}x ROAS</p>
            </div>
          </div>
          <div className="pt-4 border-t border-outline-variant/40">
            <p className="text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Projected revenue change</p>
            <p className={clsx("text-display-kpi", delta >= 0 ? "text-tertiary" : "text-error")}>
              {delta >= 0 ? "+" : ""}{fmt(delta, "currency")}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
