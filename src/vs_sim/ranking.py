from __future__ import annotations

import numpy as np

from .vc_simulator import run_vc_return_simulator_uncertain
from .investor_metrics import attach_rar_metrics


def simulate_company_metrics(
    name: str,
    priors: dict,
    *,
    seed: int,
    n_sims: int = 15_000,
    horizon_years: float = 5.0,
    investment: float = 100_000.0,
    pre_money: float = 1_000_000.0,
    macro_shock_sd_annual: float = 0.25,
    keep_full_res: bool = False,
) -> dict:
    """
    Simulates a single company and returns a UI-ready row.

    Base ranking metric:
      RAR = E[IRR] * (1 - PD_12m)
    where PD_12m is derived from the survival curve:
      PD_12m = 1 - P(alive at month 12).
    """
    res = run_vc_return_simulator_uncertain(
        seed=int(seed),
        n_sims=int(n_sims),
        horizon_years=float(horizon_years),
        investment=float(investment),
        pre_money=float(pre_money),
        priors=dict(priors),
        macro_shock_sd_annual=float(macro_shock_sd_annual),
    )

    m = res["metrics"]

    # Dashboard metrics (RAR, E[IRR], PD_12m)
    rar_pack = attach_rar_metrics(res)
    rar = float(rar_pack["rar"])
    expected_irr = float(rar_pack["expected_irr"])
    pd_12m = float(rar_pack["pd_12m"])

    row = {
        "name": name,

        # --- Base metric (primary sort key)
        "rar": rar,
        "expected_irr": expected_irr,
        "pd_12m": pd_12m,

        # --- ROI metrics (still useful everywhere)
        "expected_roi": float(m["expected_roi"]),
        "median_roi": float(m["median_roi"]),
        "p_loss_roi_lt_1": float(m["prob_roi_lt_1"]),
        "p_total_loss_roi_0": float(m["prob_total_loss"]),
        "p_3x": float(m["prob_3x"]),
        "p_10x": float(m["prob_10x"]),
        "roi_p10": float(m["roi_percentiles"][10]),
        "roi_p50": float(m["roi_percentiles"][50]),
        "roi_p90": float(m["roi_percentiles"][90]),
        "roi_p95": float(m["roi_percentiles"][95]),

        # Default ranking score mirrors RAR (kept for backward compatibility)
        "score": rar,

        # Inputs
        "priors": dict(priors),

        # Keep samples for drill-down
        "roi_samples": res["samples"]["roi"],
        "irr_samples": res["samples"]["irr"],
        "alive_by_month": res["paths"]["alive_frac_by_month"],
    }

    if keep_full_res:
        row["vc_res"] = res

    return row


def build_company_ranking(
    companies: list[tuple[str, dict]],
    *,
    seed0: int = 1000,
    n_sims: int = 15_000,
    horizon_years: float = 5.0,
    investment: float = 100_000.0,
    pre_money: float = 1_000_000.0,
    macro_shock_sd_annual: float = 0.25,
    sort_by: str = "rar",
    descending: bool = True,
    keep_full_res: bool = False,
) -> list[dict]:
    rows: list[dict] = []
    for i, (name, priors) in enumerate(companies):
        rows.append(
            simulate_company_metrics(
                name,
                priors,
                seed=int(seed0 + i),
                n_sims=int(n_sims),
                horizon_years=float(horizon_years),
                investment=float(investment),
                pre_money=float(pre_money),
                macro_shock_sd_annual=float(macro_shock_sd_annual),
                keep_full_res=bool(keep_full_res),
            )
        )

    if not rows:
        return []

    if sort_by not in rows[0]:
        raise KeyError(f"sort_by='{sort_by}' not found in row keys. Available keys include: {sorted(rows[0].keys())}")

    rows_sorted = sorted(rows, key=lambda r: r[sort_by], reverse=bool(descending))
    for idx, r in enumerate(rows_sorted, start=1):
        r["rank"] = idx
    return rows_sorted


def print_top(rows: list[dict], k: int = 10) -> None:
    print(f"=== Top {k} companies (sorted by {rows[0].get('rank', 'rank')}) ===")
    for r in rows[:k]:
        print(
            f"{r['rank']:>2}. {r['name']:<18} | "
            f"RAR={r['rar']*100:6.2f}% | "
            f"E[IRR]={r['expected_irr']*100:6.2f}% | "
            f"PD_12m={r['pd_12m']*100:5.1f}% | "
            f"E[ROI]={r['expected_roi']:.2f}x"
        )


def make_synthetic_companies(n: int = 20, seed: int = 42) -> list[tuple[str, dict]]:
    rng = np.random.default_rng(seed)
    companies: list[tuple[str, dict]] = []
    for i in range(n):
        mu = float(np.clip(rng.normal(0.60, 0.20), -0.20, 1.50))
        mu_sd = float(np.clip(rng.normal(0.25, 0.07), 0.10, 0.60))

        pf = float(np.clip(rng.normal(0.22, 0.07), 0.03, 0.60))
        pf_strength = float(np.clip(rng.normal(25, 8), 8, 60))

        sig = float(np.clip(rng.normal(0.95, 0.20), 0.30, 1.80))
        sig_sd = float(np.clip(rng.normal(0.25, 0.07), 0.10, 0.60))

        dil = float(np.clip(rng.normal(0.40, 0.12), 0.05, 0.80))
        dil_sd = float(np.clip(rng.normal(0.15, 0.06), 0.05, 0.35))

        exs = float(np.clip(rng.normal(0.80, 0.18), 0.10, 1.50))
        exs_sd = float(np.clip(rng.normal(0.20, 0.06), 0.05, 0.50))

        priors = dict(
            mu_annual_mean=mu,
            mu_annual_sd=mu_sd,
            sigma_annual_mean=sig,
            sigma_annual_sd=sig_sd,
            p_fail_annual_mean=pf,
            p_fail_annual_strength=pf_strength,
            dilution_mean=dil,
            dilution_sd=dil_sd,
            exit_sigma_mean=exs,
            exit_sigma_sd=exs_sd,
        )
        companies.append((f"Company_{i+1:02d}", priors))
    return companies
