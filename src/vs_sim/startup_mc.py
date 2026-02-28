from __future__ import annotations

import numpy as np


def clipped_normal(
    rng: np.random.Generator,
    mean: float,
    sd: float,
    lo: float,
    hi: float,
    size=None,
) -> np.ndarray:
    x = rng.normal(mean, sd, size=size)
    return np.clip(x, lo, hi)


def run_startup_mc(
    *,
    seed: int = 0,
    n_sims: int = 20_000,
    months: int = 12,
    # initial conditions
    mrr0: float = 2000.0,
    cash0: float = 50_000.0,
    burn0: float = 8000.0,
    margin0: float = 0.70,
    # targets
    target_mrr: float = 10_000.0,
    # uncertainty (means are your “best guess”, sds are uncertainty)
    g_mean: float = 0.12,   # monthly growth (12% = strong early stage)
    g_sd: float = 0.06,
    c_mean: float = 0.04,   # monthly churn (4%)
    c_sd: float = 0.02,
    margin_sd: float = 0.10,
    burn_mult_sd: float = 0.15,
) -> dict:
    """
    Simple startup runway + MRR evolution Monte Carlo.

    Success = (never runs out of cash) AND (hits target MRR at any time).
    """
    rng = np.random.default_rng(seed)

    # Sample per-simulation parameters (constant over the horizon)
    g = clipped_normal(rng, g_mean, g_sd, 0.0, 0.6, size=n_sims)
    c = clipped_normal(rng, c_mean, c_sd, 0.0, 0.3, size=n_sims)
    margin = clipped_normal(rng, margin0, margin_sd, 0.05, 0.95, size=n_sims)
    burn_mult = np.exp(rng.normal(0.0, burn_mult_sd, size=n_sims))  # lognormal multiplier

    # Time series storage for percentiles
    mrr_paths = np.empty((n_sims, months + 1), dtype=float)
    cash_paths = np.empty((n_sims, months + 1), dtype=float)

    mrr_paths[:, 0] = mrr0
    cash_paths[:, 0] = cash0

    alive = np.ones(n_sims, dtype=bool)  # hasn’t hit cash<0 yet

    for t in range(months):
        mrr_t = mrr_paths[:, t]
        cash_t = cash_paths[:, t]

        # Revenue dynamics
        mrr_next = mrr_t * (1.0 + g - c)
        mrr_next = np.clip(mrr_next, 0.0, None)

        # Cash dynamics (simple)
        profit = mrr_t * margin
        burn = burn0 * burn_mult
        cash_next = cash_t + profit - burn

        mrr_paths[:, t + 1] = mrr_next
        cash_paths[:, t + 1] = cash_next

        alive &= (cash_next >= 0.0)

    # Success: alive throughout AND reach target by end (or at any point)
    hit_target = (mrr_paths.max(axis=1) >= target_mrr)
    success = alive & hit_target
    p_success = float(success.mean())

    # Percentiles for fan chart
    def pct(arr: np.ndarray, qs=(10, 50, 90)):
        return np.percentile(arr, qs, axis=0)

    mrr_p10, mrr_p50, mrr_p90 = pct(mrr_paths)
    cash_p10, cash_p50, cash_p90 = pct(cash_paths)

    # Sensitivity: correlate sampled params with success (0/1)
    y = success.astype(float)

    def corr(x: np.ndarray, y_: np.ndarray) -> float:
        x = x - x.mean()
        y__ = y_ - y_.mean()
        denom = (np.sqrt((x * x).mean()) * np.sqrt((y__ * y__).mean()) + 1e-12)
        return float((x * y__).mean() / denom)

    sens = {
        "growth_g": corr(g, y),
        "churn_c": corr(c, y),
        "margin": corr(margin, y),
        "burn_mult": corr(burn_mult, y),
    }
    sens_sorted = sorted(sens.items(), key=lambda kv: abs(kv[1]), reverse=True)

    return {
        "p_success": p_success,
        "success": success,
        "params": {"g": g, "c": c, "margin": margin, "burn_mult": burn_mult},
        "paths": {"mrr": mrr_paths, "cash": cash_paths},
        "percentiles": {
            "mrr": (mrr_p10, mrr_p50, mrr_p90),
            "cash": (cash_p10, cash_p50, cash_p90),
        },
        "sensitivity": sens_sorted,
        "config": dict(months=months, target_mrr=target_mrr),
    }
