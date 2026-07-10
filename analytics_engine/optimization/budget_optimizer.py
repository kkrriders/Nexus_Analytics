"""
Budget Optimizer — every number here is arithmetic on this account's own real
campaign metrics. No fitted diminishing-returns curve (real accounts don't have
enough spend variance day to day to fit one honestly), no industry-average
assumptions. Two outputs:

  1. Misallocated spend — campaigns underperforming this account's OWN best
     real performer, with a real dollar opportunity-cost figure.
  2. Suggested allocation — a hypothetical budget split weighted toward
     campaigns already proven above their platform's benchmark ROAS, capped so
     one campaign can't absorb the whole budget.
"""
from typing import List, Optional
from datetime import datetime, timezone

from models.schemas import (
    ProcessedCampaign, MisallocatedSpend, BudgetAllocation, BudgetOptimizerData, Platform,
)
from scoring.campaign_health_score import BENCHMARKS

MAX_ALLOCATION_SHARE = 0.5   # no single campaign gets more than half the reallocated budget
MIN_OPPORTUNITY_COST = 10.0  # filter out noise-level gaps


def _benchmark_for(platform: Platform) -> dict:
    return BENCHMARKS.get(platform, BENCHMARKS[Platform.google_ads])


def build_budget_optimizer(processed_campaigns: List[ProcessedCampaign], total_budget: Optional[float] = None) -> Optional[BudgetOptimizerData]:
    active = [c for c in processed_campaigns if c.campaign.status.value in ("active", "review") and c.metrics.spend > 0]
    if not active:
        return None

    # ── 1. Misallocated spend — vs this account's own best real campaign ─────
    best_roas = max(c.metrics.roas for c in active)
    misallocated = sorted(
        (
            MisallocatedSpend(
                campaign_id=c.campaign.id, campaign_name=c.campaign.name, platform=c.campaign.platform,
                spend=c.metrics.spend, roas=c.metrics.roas, best_roas=best_roas,
                opportunity_cost=round(c.metrics.spend * max(0.0, best_roas - c.metrics.roas), 2),
            )
            for c in active
        ),
        key=lambda m: -m.opportunity_cost,
    )
    misallocated = [m for m in misallocated if m.opportunity_cost > MIN_OPPORTUNITY_COST]
    total_opportunity_cost = round(sum(m.opportunity_cost for m in misallocated), 2)

    # ── 2. Suggested allocation for a (real or hypothetical) total budget ────
    current_total_spend = sum(c.metrics.spend for c in active)
    if total_budget is None:
        total_budget = round(current_total_spend, 2)
    scale = (total_budget / current_total_spend) if current_total_spend > 0 else 0.0
    current_revenue_at_budget = round(sum(c.metrics.spend * scale * c.metrics.roas for c in active), 2)

    qualifying = [c for c in active if c.metrics.roas >= _benchmark_for(c.campaign.platform)["roas_warn"]]

    allocation: List[BudgetAllocation] = []
    if qualifying:
        weights = {c.campaign.id: max(0.0001, c.metrics.roas - _benchmark_for(c.campaign.platform)["roas_warn"]) for c in qualifying}
        total_weight = sum(weights.values())
        raw_shares = {cid: w / total_weight for cid, w in weights.items()}

        # Cap any single campaign, redistribute the excess proportionally among the
        # rest — a single pass is enough for a handful of campaigns, not a full
        # iterative water-filling solver. Only applies with 3+ qualifying campaigns:
        # with just 2, capping the winner forces 100% of the excess onto the only
        # other one regardless of how much weaker it is (e.g. a 4x campaign capped
        # at 50% would dump the other 50% onto a campaign barely above the warn
        # threshold) — a forced 50/50 split that misrepresents a weak campaign as
        # an equally good bet. Below 3 candidates, an uncapped proportional split
        # is the honest answer even if one campaign takes the large majority.
        capped = dict(raw_shares)
        if len(qualifying) >= 3:
            capped = {cid: min(s, MAX_ALLOCATION_SHARE) for cid, s in raw_shares.items()}
            excess = sum(raw_shares[cid] - capped[cid] for cid in capped if raw_shares[cid] > capped[cid])
            if excess > 0:
                uncapped_ids = [cid for cid in capped if raw_shares[cid] < MAX_ALLOCATION_SHARE]
                uncapped_weight = sum(raw_shares[cid] for cid in uncapped_ids) or 1.0
                for cid in uncapped_ids:
                    capped[cid] += excess * (raw_shares[cid] / uncapped_weight)

        share_total = sum(capped.values()) or 1.0
        for c in qualifying:
            share = capped[c.campaign.id] / share_total
            suggested_spend = round(total_budget * share, 2)
            allocation.append(BudgetAllocation(
                campaign_id=c.campaign.id, campaign_name=c.campaign.name, platform=c.campaign.platform,
                current_spend=c.metrics.spend, roas=c.metrics.roas,
                suggested_spend=suggested_spend, projected_revenue=round(suggested_spend * c.metrics.roas, 2),
            ))
        allocation.sort(key=lambda a: -a.suggested_spend)

    projected_revenue = round(sum(a.projected_revenue for a in allocation), 2)

    return BudgetOptimizerData(
        total_budget=total_budget,
        misallocated=misallocated,
        total_opportunity_cost=total_opportunity_cost,
        allocation=allocation,
        current_revenue_at_budget=current_revenue_at_budget,
        projected_revenue=projected_revenue,
        projected_uplift=round(projected_revenue - current_revenue_at_budget, 2),
        last_updated=datetime.now(timezone.utc).isoformat() + "Z",
    )
