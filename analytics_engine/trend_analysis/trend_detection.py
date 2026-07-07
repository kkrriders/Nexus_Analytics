"""
Trend detection — computes moving averages, trend direction, and growth rates
from a time-series of daily data points.
"""
from typing import List
from models.schemas import TrendDirection


def simple_moving_average(values: List[float], window: int) -> List[float]:
    """Return SMA for each position; first (window-1) positions return the available mean."""
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(round(sum(values[start:i + 1]) / (i - start + 1), 4))
    return result


def exponential_moving_average(values: List[float], alpha: float = 0.3) -> List[float]:
    """EMA with smoothing factor alpha."""
    if not values:
        return []
    ema = [values[0]]
    for v in values[1:]:
        ema.append(round(alpha * v + (1 - alpha) * ema[-1], 4))
    return ema


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


def growth_rate(values: List[float]) -> float:
    """Overall percentage growth from first to last non-zero value."""
    non_zero = [v for v in values if v > 0]
    if len(non_zero) < 2:
        return 0.0
    return round((non_zero[-1] - non_zero[0]) / non_zero[0] * 100, 2)


def momentum(values: List[float], short: int = 3, long: int = 7) -> float:
    """Difference between short-term and long-term SMA at the last point (positive = accelerating)."""
    if len(values) < long:
        return 0.0
    sma_short = sum(values[-short:]) / short
    sma_long  = sum(values[-long:])  / long
    if sma_long == 0:
        return 0.0
    return round((sma_short - sma_long) / sma_long * 100, 2)
