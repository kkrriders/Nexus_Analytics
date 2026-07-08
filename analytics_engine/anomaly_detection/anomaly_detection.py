"""
Anomaly detection — rule-based alert generation.
Compares current metrics against benchmarks and prior-period values.
"""
import uuid
from datetime import datetime, timezone
from typing import List
from models.schemas import Alert, AlertSeverity, DerivedMetrics, Campaign


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def detect_alerts(
    campaign: Campaign,
    current: DerivedMetrics,
    previous: DerivedMetrics | None,
) -> List[Alert]:
    """
    Returns a list of Alert objects for a single campaign.
    Rules run in priority order: critical first, then warning, then info.
    """
    if current.spend == 0:
        return []

    alerts: List[Alert] = []
    cid   = campaign.id
    cname = campaign.name
    ts    = _now_iso()

    # ── Critical ──────────────────────────────────────────────────────────────

    # CTR dropped >15% vs prior period
    if previous and previous.ctr > 0:
        ctr_drop = (previous.ctr - current.ctr) / previous.ctr * 100
        if ctr_drop > 15:
            alerts.append(Alert(
                id=f"alert_{cid}_ctr_{uuid.uuid4().hex[:6]}",
                severity=AlertSeverity.critical,
                campaign_id=cid, campaign_name=cname,
                message=f"CTR dropped {ctr_drop:.0f}% vs last month — action required",
                detail=f"Current: {current.ctr:.1f}%  |  Previous: {previous.ctr:.1f}%",
                timestamp=ts,
            ))

    # CPA spiked >25% vs prior period
    if previous and previous.cpa > 0:
        cpa_spike = (current.cpa - previous.cpa) / previous.cpa * 100
        if cpa_spike > 25:
            alerts.append(Alert(
                id=f"alert_{cid}_cpa_{uuid.uuid4().hex[:6]}",
                severity=AlertSeverity.critical,
                campaign_id=cid, campaign_name=cname,
                message=f"CPA increased {cpa_spike:.0f}% — efficiency critical",
                detail=f"Current: ${current.cpa:.2f}  |  Previous: ${previous.cpa:.2f}",
                timestamp=ts,
            ))

    # ROAS below 1.5x (not profitable)
    if current.roas < 1.5:
        alerts.append(Alert(
            id=f"alert_{cid}_roas_{uuid.uuid4().hex[:6]}",
            severity=AlertSeverity.critical,
            campaign_id=cid, campaign_name=cname,
            message=f"ROAS {current.roas:.2f}x is below break-even threshold",
            detail="Consider pausing or restructuring this campaign immediately.",
            timestamp=ts,
        ))

    # ── Warning ───────────────────────────────────────────────────────────────

    # Budget >85% utilized
    if 85 <= current.budget_utilization < 95:
        alerts.append(Alert(
            id=f"alert_{cid}_budget_{uuid.uuid4().hex[:6]}",
            severity=AlertSeverity.warning,
            campaign_id=cid, campaign_name=cname,
            message=f"Budget {current.budget_utilization:.0f}% depleted — consider topping up budget",
            detail=f"Spent: ${current.spend:,.0f}  |  Remaining: ~{100 - current.budget_utilization:.0f}%",
            timestamp=ts,
        ))

    # CTR dropped 8–15% (not yet critical)
    if previous and previous.ctr > 0:
        ctr_drop = (previous.ctr - current.ctr) / previous.ctr * 100
        if 8 < ctr_drop <= 15:
            alerts.append(Alert(
                id=f"alert_{cid}_ctr_warn_{uuid.uuid4().hex[:6]}",
                severity=AlertSeverity.warning,
                campaign_id=cid, campaign_name=cname,
                message=f"CTR declining {ctr_drop:.0f}% — monitor closely",
                detail=f"Current: {current.ctr:.1f}%  |  Previous: {previous.ctr:.1f}%",
                timestamp=ts,
            ))

    # Low conversion rate
    if current.conversion_rate < 1.0:
        alerts.append(Alert(
            id=f"alert_{cid}_convrate_{uuid.uuid4().hex[:6]}",
            severity=AlertSeverity.warning,
            campaign_id=cid, campaign_name=cname,
            message=f"Conversion rate {current.conversion_rate:.1f}% is below 1% threshold",
            detail="Landing page or audience targeting may need optimisation.",
            timestamp=ts,
        ))

    # ── Info ──────────────────────────────────────────────────────────────────

    # ROAS improved >10% vs prior period
    if previous and previous.roas > 0:
        roas_gain = (current.roas - previous.roas) / previous.roas * 100
        if roas_gain > 10:
            alerts.append(Alert(
                id=f"alert_{cid}_roas_pos_{uuid.uuid4().hex[:6]}",
                severity=AlertSeverity.info,
                campaign_id=cid, campaign_name=cname,
                message=f"ROAS improved {roas_gain:.0f}% — scaling opportunity",
                detail=f"Current: {current.roas:.2f}x  |  Previous: {previous.roas:.2f}x",
                timestamp=ts,
            ))

    return alerts


def generate_all_alerts(processed_campaigns: list) -> List[Alert]:
    """Aggregate alerts from all campaigns, sorted by severity."""
    all_alerts: List[Alert] = []
    for pc in processed_campaigns:
        all_alerts.extend(detect_alerts(pc["campaign"], pc["current_metrics"], pc["prev_metrics"]))

    severity_order = {AlertSeverity.critical: 0, AlertSeverity.warning: 1, AlertSeverity.info: 2}
    all_alerts.sort(key=lambda a: severity_order[a.severity])
    return all_alerts
