from __future__ import annotations

import numpy as np


def _safe_percentile(x: np.ndarray, q: float) -> float:
    x = np.asarray(x, dtype=float)
    return float(np.percentile(x, q))


def _cvar(x: np.ndarray, q: float = 5.0) -> float:
    x = np.asarray(x, dtype=float)
    var = np.percentile(x, q)
    tail = x[x <= var]
    return float(tail.mean()) if tail.size else float(var)


def compute_investor_metrics_from_vc_res(
    res: dict,
    *,
    var_q: float = 5.0,
    roi_target: float = 2.0,
    profitability_mode: str = "break_even_valuation",
) -> dict:
    roi = np.asarray(res["samples"]["roi"], dtype=float)
    payout = np.asarray(res["samples"]["payout"], dtype=float)
    alive_curve = np.asarray(res["paths"]["alive_frac_by_month"], dtype=float)

    investment = float(res["config"]["investment"])
    horizon_years = float(res["config"]["horizon_years"])

    profit = payout - investment
    expected_payout = float(np.mean(payout))
    median_payout = float(np.median(payout))
    expected_profit = float(np.mean(profit))
    median_profit = float(np.median(profit))

    expected_multiple = float(np.mean(roi))
    median_multiple = float(np.median(roi))

    prob_loss = float(np.mean(roi < 1.0))
    prob_total_loss = float(np.mean(roi == 0.0))

    prob_target = float(np.mean(roi >= float(roi_target)))
    prob_3x = float(np.mean(roi >= 3.0))
    prob_10x = float(np.mean(roi >= 10.0))

    var_profit = _safe_percentile(profit, var_q)
    cvar_profit = _cvar(profit, var_q)
    var_roi = _safe_percentile(roi, var_q)
    cvar_roi = _cvar(roi, var_q)

    p_survive_to_end = float(alive_curve[-1])

    downside = abs(min(0.0, var_profit)) + 1e-12
    risk_adjusted_profit_over_var = float(expected_profit / downside)

    roi_percentiles = {q: _safe_percentile(roi, q) for q in (5, 10, 25, 50, 75, 90, 95)}
    profit_percentiles = {q: _safe_percentile(profit, q) for q in (5, 10, 25, 50, 75, 90, 95)}
    payout_percentiles = {q: _safe_percentile(payout, q) for q in (5, 10, 25, 50, 75, 90, 95)}

    # Time-to-profitability (path-based)
    time_to_profit_years = np.full_like(roi, np.inf, dtype=float)
    p_profitable_by_end = float("nan")
    expected_time_to_profit_years = float("nan")
    median_time_to_profit_years = float("nan")
    profitability_available = False

    equity0 = float(res["config"]["equity0"])
    dilution_total = np.asarray(res.get("params", {}).get("dilution_total", np.zeros_like(roi)), dtype=float)
    equity = equity0 * (1.0 - dilution_total)
    equity = np.clip(equity, 1e-12, 1.0)
    break_even_valuation = investment / equity

    V_path = None
    if "paths" in res and isinstance(res["paths"], dict):
        V_path = res["paths"].get("valuation_by_month", None)

    if isinstance(V_path, np.ndarray) and V_path.ndim == 2 and V_path.shape[0] == roi.shape[0]:
        profitability_available = True
        hit = V_path >= break_even_valuation[:, None]
        any_hit = hit.any(axis=1)
        first = hit.argmax(axis=1).astype(float)
        first[~any_hit] = np.inf

        time_to_profit_years = first / 12.0
        finite = np.isfinite(time_to_profit_years)
        p_profitable_by_end = float(np.mean(finite))
        expected_time_to_profit_years = float(np.mean(time_to_profit_years[finite])) if finite.any() else float("nan")
        median_time_to_profit_years = float(np.median(time_to_profit_years[finite])) if finite.any() else float("nan")

    return {
        "expected_multiple": expected_multiple,
        "median_multiple": median_multiple,
        "prob_loss": prob_loss,
        "prob_total_loss": prob_total_loss,
        "prob_target": prob_target,
        "prob_3x": prob_3x,
        "prob_10x": prob_10x,
        "roi_percentiles": roi_percentiles,
        "var_q": float(var_q),
        "var_roi": var_roi,
        "cvar_roi": cvar_roi,
        "expected_payout": expected_payout,
        "median_payout": median_payout,
        "expected_profit": expected_profit,
        "median_profit": median_profit,
        "payout_percentiles": payout_percentiles,
        "profit_percentiles": profit_percentiles,
        "var_profit": var_profit,
        "cvar_profit": cvar_profit,
        "p_survive_to_end": p_survive_to_end,
        "horizon_years": horizon_years,
        "risk_adjusted_profit_over_var": risk_adjusted_profit_over_var,
        "profitability_available": profitability_available,
        "break_even_valuation_note": (
            "Time-to-profitability computed as first month where valuation >= investment/equity. "
            "Requires res['paths']['valuation_by_month']."
        ),
        "p_profitable_by_end": p_profitable_by_end,
        "expected_time_to_profit_years": expected_time_to_profit_years,
        "median_time_to_profit_years": median_time_to_profit_years,
        "profitability_mode": profitability_mode,
    }


def enrich_row_with_investor_metrics(
    row: dict,
    vc_res: dict,
    *,
    var_q: float = 5.0,
    roi_target: float = 2.0,
) -> dict:
    extra = compute_investor_metrics_from_vc_res(vc_res, var_q=var_q, roi_target=roi_target)

    row["expected_multiple"] = extra["expected_multiple"]
    row["median_multiple"] = extra["median_multiple"]
    row["prob_loss"] = extra["prob_loss"]
    row["prob_total_loss"] = extra["prob_total_loss"]
    row["prob_target"] = extra["prob_target"]
    row["prob_3x"] = extra["prob_3x"]
    row["prob_10x"] = extra["prob_10x"]

    row["expected_payout"] = extra["expected_payout"]
    row["expected_profit"] = extra["expected_profit"]
    row["median_profit"] = extra["median_profit"]

    row["var_profit"] = extra["var_profit"]
    row["cvar_profit"] = extra["cvar_profit"]

    row["p_survive_to_end"] = extra["p_survive_to_end"]
    row["risk_adjusted_profit_over_var"] = extra["risk_adjusted_profit_over_var"]

    row["profitability_available"] = extra["profitability_available"]
    row["p_profitable_by_end"] = extra["p_profitable_by_end"]
    row["expected_time_to_profit_years"] = extra["expected_time_to_profit_years"]
    row["median_time_to_profit_years"] = extra["median_time_to_profit_years"]

    row["investor_metrics_full"] = extra
    return row
