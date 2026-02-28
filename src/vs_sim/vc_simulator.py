from __future__ import annotations

import numpy as np


def _clip(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.minimum(np.maximum(x, lo), hi)


def _roi_to_irr(roi: np.ndarray, years: float) -> np.ndarray:
    roi = np.asarray(roi, dtype=float)
    return np.where(roi <= 0, -1.0, roi ** (1.0 / years) - 1.0)


def _percentiles(x: np.ndarray, qs=(5, 10, 25, 50, 75, 90, 95)) -> dict[int, float]:
    return {int(q): float(np.percentile(x, q)) for q in qs}


def _annual_fail_to_monthly(p_fail_annual: np.ndarray) -> np.ndarray:
    return 1.0 - (1.0 - p_fail_annual) ** (1.0 / 12.0)


def sample_parameters(
    rng: np.random.Generator,
    n_sims: int,
    *,
    dilution_mean: float = 0.40,
    dilution_sd: float = 0.15,
    dilution_bounds=(0.05, 0.85),
    mu_annual_mean: float = 0.55,
    mu_annual_sd: float = 0.25,
    mu_bounds=(-0.30, 2.00),
    sigma_annual_mean: float = 0.95,
    sigma_annual_sd: float = 0.25,
    sigma_bounds=(0.20, 2.00),
    p_fail_annual_mean: float = 0.22,
    p_fail_annual_strength: float = 25.0,
    p_fail_bounds=(0.01, 0.80),
    exit_sigma_mean: float = 0.70,
    exit_sigma_sd: float = 0.20,
    exit_sigma_bounds=(0.05, 1.50),
    exit_mu_mean: float = 0.0,
    exit_mu_sd: float = 0.15,
    exit_mu_bounds=(-1.0, 1.0),
) -> dict[str, np.ndarray]:
    """
    Parameter uncertainty layer (priors).

    Returns arrays of length n_sims.
    """
    dilution = _clip(rng.normal(dilution_mean, dilution_sd, size=n_sims), *dilution_bounds)

    mu_annual = _clip(rng.normal(mu_annual_mean, mu_annual_sd, size=n_sims), *mu_bounds)
    sigma_annual = _clip(rng.normal(sigma_annual_mean, sigma_annual_sd, size=n_sims), *sigma_bounds)

    m = float(p_fail_annual_mean)
    s = float(p_fail_annual_strength)
    alpha = m * s
    beta = (1.0 - m) * s
    p_fail_annual = rng.beta(alpha, beta, size=n_sims)
    p_fail_annual = _clip(p_fail_annual, *p_fail_bounds)

    exit_sigma = _clip(rng.normal(exit_sigma_mean, exit_sigma_sd, size=n_sims), *exit_sigma_bounds)
    exit_mu = _clip(rng.normal(exit_mu_mean, exit_mu_sd, size=n_sims), *exit_mu_bounds)

    return {
        "dilution_total": dilution,
        "mu_annual": mu_annual,
        "sigma_annual": sigma_annual,
        "p_fail_annual": p_fail_annual,
        "exit_mu": exit_mu,
        "exit_sigma": exit_sigma,
    }


def run_vc_return_simulator_uncertain(
    *,
    seed: int = 0,
    n_sims: int = 50_000,
    horizon_years: float = 5.0,
    investment: float = 100_000.0,
    pre_money: float = 1_000_000.0,
    post_money: float | None = None,
    valuation_floor: float = 10_000.0,
    priors: dict | None = None,
    macro_shock_sd_annual: float = 0.0,
    # path controls
    store_valuation_path: bool = True,
    valuation_path_dtype=np.float32,
) -> dict:
    """
    Single-startup VC return simulator with parameter uncertainty.

    - ROI multiple: payout / investment
    - Failure happens monthly with per-sim p_fail_m (derived from p_fail_annual prior)
    - Valuation evolves as lognormal with per-sim drift/vol (mu_annual, sigma_annual)
    - Optional shared macro shock term (same per month across sims) to emulate correlated markets
    - Exposes valuation path (optional) + first-hit month for break-even valuation
    """
    rng = np.random.default_rng(seed)
    if post_money is None:
        post_money = pre_money + investment

    equity0 = float(investment / post_money)

    months = int(round(float(horizon_years) * 12))
    years = months / 12.0

    priors = priors or {}
    P = sample_parameters(rng, n_sims, **priors)

    dilution = P["dilution_total"]
    mu_annual = P["mu_annual"]
    sigma_annual = P["sigma_annual"]
    p_fail_annual = P["p_fail_annual"]
    exit_mu = P["exit_mu"]
    exit_sigma = P["exit_sigma"]

    equity = equity0 * (1.0 - dilution)

    p_fail_m = _annual_fail_to_monthly(p_fail_annual)
    sigma_m = sigma_annual / np.sqrt(12.0)
    mu_m = (1.0 + mu_annual) ** (1.0 / 12.0) - 1.0

    V = np.full(n_sims, pre_money, dtype=float)
    alive = np.ones(n_sims, dtype=bool)

    alive_over_time = np.empty(months + 1, dtype=float)
    alive_over_time[0] = float(alive.mean())

    valuation_by_month = None
    if store_valuation_path:
        valuation_by_month = np.empty((n_sims, months + 1), dtype=valuation_path_dtype)
        valuation_by_month[:, 0] = V.astype(valuation_path_dtype, copy=False)

    # Break-even valuation (per sim): need valuation >= investment/equity to get 1x back (ignoring exit_mult)
    equity_safe = np.clip(equity, 1e-12, 1.0)
    break_even_valuation = investment / equity_safe
    first_hit_month_break_even = np.full(n_sims, np.inf, dtype=float)
    hit0 = (V >= break_even_valuation) & alive
    first_hit_month_break_even[hit0] = 0.0

    macro_sd_m = (float(macro_shock_sd_annual) / np.sqrt(12.0)) if macro_shock_sd_annual > 0 else 0.0

    for t in range(months):
        fail = rng.random(n_sims) < p_fail_m
        newly_failed = alive & fail
        alive[newly_failed] = False
        V[newly_failed] = 0.0

        eps_idio = rng.normal(0.0, 1.0, size=n_sims)
        eps_macro = (rng.normal(0.0, 1.0) * macro_sd_m) if macro_sd_m > 0 else 0.0

        drift = (mu_m - 0.5 * sigma_m * sigma_m)
        V_next = V * np.exp(drift + sigma_m * eps_idio + eps_macro)

        V = np.where(alive, _clip(V_next, valuation_floor, np.inf), 0.0)
        alive_over_time[t + 1] = float(alive.mean())

        if store_valuation_path:
            valuation_by_month[:, t + 1] = V.astype(valuation_path_dtype, copy=False)

        not_hit_yet = ~np.isfinite(first_hit_month_break_even)
        hit_now = not_hit_yet & alive & (V >= break_even_valuation)
        first_hit_month_break_even[hit_now] = float(t + 1)

    exit_mult = np.exp(rng.normal(exit_mu, exit_sigma, size=n_sims))
    V_exit = np.where(alive, V * exit_mult, 0.0)

    payout = equity * V_exit
    roi = payout / float(investment)
    irr = _roi_to_irr(roi, years)

    metrics = {
        "prob_roi_lt_1": float(np.mean(roi < 1.0)),
        "prob_total_loss": float(np.mean(roi == 0.0)),
        "prob_3x": float(np.mean(roi >= 3.0)),
        "prob_10x": float(np.mean(roi >= 10.0)),
        "expected_roi": float(np.mean(roi)),
        "median_roi": float(np.median(roi)),
        "expected_irr": float(np.mean(irr)),
        "median_irr": float(np.median(irr)),
        "roi_percentiles": _percentiles(roi),
        "irr_percentiles": _percentiles(irr),
        "expected_payout": float(np.mean(payout)),
        "median_payout": float(np.median(payout)),
        "p_alive_end": float(alive_over_time[-1]),
        "p_break_even_by_end": float(np.mean(np.isfinite(first_hit_month_break_even))),
        "expected_time_to_break_even_years": float(
            np.mean(first_hit_month_break_even[np.isfinite(first_hit_month_break_even)]) / 12.0
        ) if np.isfinite(first_hit_month_break_even).any() else float("nan"),
        "median_time_to_break_even_years": float(
            np.median(first_hit_month_break_even[np.isfinite(first_hit_month_break_even)]) / 12.0
        ) if np.isfinite(first_hit_month_break_even).any() else float("nan"),
    }

    def corr(x: np.ndarray, y: np.ndarray) -> float:
        x = x - x.mean()
        y = y - y.mean()
        denom = (np.sqrt((x * x).mean()) * np.sqrt((y * y).mean()) + 1e-12)
        return float((x * y).mean() / denom)

    y = np.log(roi + 1e-12)
    sens = {
        "mu_annual": corr(mu_annual, y),
        "sigma_annual": corr(sigma_annual, y),
        "p_fail_annual": corr(p_fail_annual, y),
        "dilution_total": corr(dilution, y),
        "exit_sigma": corr(exit_sigma, y),
    }
    sens_sorted = sorted(sens.items(), key=lambda kv: abs(kv[1]), reverse=True)

    paths = {
        "alive_frac_by_month": alive_over_time,
        "first_hit_month_break_even": first_hit_month_break_even,
    }
    if store_valuation_path:
        paths["valuation_by_month"] = valuation_by_month

    return {
        "config": {
            "n_sims": int(n_sims),
            "horizon_years": float(years),
            "investment": float(investment),
            "pre_money": float(pre_money),
            "post_money": float(post_money),
            "equity0": float(equity0),
            "macro_shock_sd_annual": float(macro_shock_sd_annual),
            "priors": priors,
            "store_valuation_path": bool(store_valuation_path),
            "valuation_path_dtype": str(valuation_path_dtype),
        },
        "paths": paths,
        "samples": {
            "roi": roi,
            "irr": irr,
            "payout": payout,
            "valuation_exit": V_exit,
        },
        "params": P,
        "metrics": metrics,
        "sensitivity": sens_sorted,
    }
