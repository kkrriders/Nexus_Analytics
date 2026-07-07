"""
Forecast engine — produces 7-day and 30-day projections using linear regression
on the last N days of history. Confidence is derived from R² of the fit.
"""
import math
from typing import List
from models.schemas import MetricForecast, TrendDirection


def _linear_regression(y: List[float]) -> tuple[float, float, float]:
    """
    Fit y = slope * x + intercept over index x = 0..n-1.
    Returns (slope, intercept, r_squared).
    """
    n = len(y)
    if n < 2:
        return 0.0, y[0] if y else 0.0, 0.0

    x_mean = (n - 1) / 2
    y_mean = sum(y) / n

    ss_xx = sum((i - x_mean) ** 2 for i in range(n))
    ss_xy = sum((i - x_mean) * (y[i] - y_mean) for i in range(n))
    ss_yy = sum((v - y_mean) ** 2 for v in y)

    if ss_xx == 0:
        return 0.0, y_mean, 0.0

    slope = ss_xy / ss_xx
    intercept = y_mean - slope * x_mean

    if ss_yy == 0:
        r_squared = 1.0
    else:
        ss_res = sum((y[i] - (slope * i + intercept)) ** 2 for i in range(n))
        r_squared = max(0.0, 1 - ss_res / ss_yy)

    return slope, intercept, r_squared


def _project_next_30d_sum(values: List[float]) -> tuple[float, float]:
    """
    Project the SUM of the next 30 days using linear regression.
    Returns (projected_30d_total, confidence_pct).
    """
    if not values or all(v == 0 for v in values):
        return 0.0, 0.0

    slope, intercept, r2 = _linear_regression(values)
    n = len(values)

    # Sum projected daily values for days n..n+29
    projected_sum = sum(
        max(0.0, slope * (n + i) + intercept)
        for i in range(30)
    )

    # Confidence: scale R² to 50–95% range (avoid overconfident projections)
    confidence = round(50 + r2 * 45, 1)
    return round(projected_sum, 2), confidence


def build_forecasts(history: List[dict]) -> List[MetricForecast]:
    """
    Takes the aggregated daily history and returns MetricForecast objects
    for Revenue, Spend, ROAS, CPA, CTR, and Conversions.
    """
    if not history:
        return []

    revenues     = [pt["revenue"]     for pt in history]
    spends       = [pt["spend"]       for pt in history]
    roases       = [pt["roas"]        for pt in history]
    cpas         = [pt["cpa"]         for pt in history]
    ctrs         = [pt["ctr"]         for pt in history]
    conversions  = [float(pt["conversions"]) for pt in history]

    def _trend(values: List[float]) -> TrendDirection:
        if len(values) < 4:
            return TrendDirection.flat
        recent = sum(values[-4:]) / 4
        prior  = sum(values[-8:-4]) / 4 if len(values) >= 8 else sum(values[:4]) / 4
        if prior == 0:
            return TrendDirection.flat
        pct = (recent - prior) / abs(prior) * 100
        if pct > 2:
            return TrendDirection.up
        elif pct < -2:
            return TrendDirection.down
        return TrendDirection.flat

    rev_30,  rev_conf  = _project_next_30d_sum(revenues)
    spd_30,  spd_conf  = _project_next_30d_sum(spends)
    conv_30, conv_conf = _project_next_30d_sum(conversions)

    # For rate metrics (ROAS, CPA, CTR) project a single average day, not a sum
    def _project_avg(vals: List[float]) -> tuple[float, float]:
        if not vals or all(v == 0 for v in vals):
            return 0.0, 0.0
        slope, intercept, r2 = _linear_regression(vals)
        n = len(vals)
        projected = max(0.0, slope * (n + 15) + intercept)  # midpoint of next 30 days
        confidence = round(50 + r2 * 45, 1)
        return round(projected, 4), confidence

    roas_30, roas_conf = _project_avg(roases)
    cpa_30,  cpa_conf  = _project_avg(cpas)
    ctr_30,  ctr_conf  = _project_avg(ctrs)

    current_rev  = round(sum(revenues),    2)
    current_spd  = round(sum(spends),      2)
    current_roas = round(sum(revenues) / max(sum(spends), 0.01), 2)
    current_cpa  = round(sum(spends) / max(sum(conversions), 0.01), 2)
    current_ctr  = round(sum(ctrs) / max(len(ctrs), 1), 2)
    current_conv = round(sum(conversions))

    return [
        MetricForecast(metric="revenue",     label="Revenue",     icon="trending_up",           current=current_rev,  forecast_30d=rev_30,  confidence=rev_conf,  trend=_trend(revenues),    unit="currency"),
        MetricForecast(metric="spend",       label="Spend",       icon="payments",              current=current_spd,  forecast_30d=spd_30,  confidence=spd_conf,  trend=_trend(spends),      unit="currency"),
        MetricForecast(metric="roas",        label="ROAS",        icon="show_chart",            current=current_roas, forecast_30d=roas_30, confidence=roas_conf, trend=_trend(roases),      unit="multiplier"),
        MetricForecast(metric="cpa",         label="CPA",         icon="target",                current=current_cpa,  forecast_30d=cpa_30,  confidence=cpa_conf,  trend=_trend(cpas),        unit="currency"),
        MetricForecast(metric="ctr",         label="CTR",         icon="ads_click",             current=current_ctr,  forecast_30d=ctr_30,  confidence=ctr_conf,  trend=_trend(ctrs),        unit="percent"),
        MetricForecast(metric="conversions", label="Conversions", icon="check_circle",          current=current_conv, forecast_30d=conv_30, confidence=conv_conf, trend=_trend(conversions), unit="number"),
    ]
