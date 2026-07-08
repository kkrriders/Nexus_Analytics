"""
Trend detection — computes moving averages, trend direction, and growth rates
from a time-series of daily data points.
"""
from typing import List
from models.schemas import TrendDirection


def detect_trend(values: List[float], lookback: int = 7) -> TrendDirection:
    """
    Compare the recent average (last `lookback` points) against
    the prior average (points before that). Returns up/down/flat.
    """
    if len(values) < lookback * 2:
        return TrendDirection.flat

    recent = values[-lookback:]
    prior  = values[-lookback * 2:-lookback]

    recent_avg = sum(recent) / len(recent)
    prior_avg  = sum(prior)  / len(prior)

    if prior_avg == 0:
        return TrendDirection.flat

    change_pct = (recent_avg - prior_avg) / abs(prior_avg) * 100

    if change_pct > 2.0:
        return TrendDirection.up
    elif change_pct < -2.0:
        return TrendDirection.down
    return TrendDirection.flat
