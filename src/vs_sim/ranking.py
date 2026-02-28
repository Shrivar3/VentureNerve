from __future__ import annotations

import numpy as np

from .vc_simulator import run_vc_return_simulator_uncertain


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
) -> dict:
    res = run_vc_return_simulator_uncertain(
        seed=seed,
        n_sims=n_sims,
        horizon_years=horizon_years,
        investment=investment,
        pre_money=pre_money,
        priors=priors,
        macro_shock_sd_annual=macro_shock_sd_annual,
    )
    m = res["metrics"]

    # Default ranking score: expected ROI penalised by chance of losing money
    score = float(m["expected_roi"] - 2.0 * m["prob_roi_lt_1"])

    return {
        "name": name,
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
        "score": score,
        "priors": priors,
        # keep samples for drill-down
        "roi_samples": res["samples"]["roi"],
        "alive_by_month": res["paths"]["alive_frac_by_month"],
        # keep full res if you want it later (optional; comment out if you want lighter rows)
        "vc_res": res,
    }


def build_company_ranking(
    companies: list[tuple[str, dict]],
    *,
    seed0: int = 1000,
    n_sims: int = 15_000,
    horizon_years: float = 5.0,
    investment: float = 100_000.0,
    pre_money: float = 1_000_000.0,
    macro_shock_sd_annual: float = 0.25,
    sort_by: str = "expected_roi",
    descending: bool = True,
) -> list[dict]:
    rows = []
    for i, (name, priors) in enumerate(companies):
        rows.append(
            simulate_company_metrics(
                name,
                priors,
                seed=seed0 + i,
                n_sims=n_sims,
                horizon_years=horizon_years,
                investment=investment,
                pre_money=pre_money,
                macro_shock_sd_annual=macro_shock_sd_annual,
            )
        )

    rows_sorted = sorted(rows, key=lambda r: r[sort_by], reverse=descending)
    for idx, r in enumerate(rows_sorted, start=1):
        r["rank"] = idx
    return rows_sorted


def print_top(rows: list[dict], k: int = 10) -> None:
    print(f"=== Top {k} companies (current sort) ===")
    for r in rows[:k]:
        print(
            f"{r['rank']:>2}. {r['name']:<18} | "
            f"E[ROI]={r['expected_roi']:.2f}x | "
            f"Med={r['median_roi']:.2f}x | "
            f"P(loss)={r['p_loss_roi_lt_1']:.2f} | "
            f"P(10x)={r['p_10x']:.2f}"
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
            mu_annual_mean=mu, mu_annual_sd=mu_sd,
            sigma_annual_mean=sig, sigma_annual_sd=sig_sd,
            p_fail_annual_mean=pf, p_fail_annual_strength=pf_strength,
            dilution_mean=dil, dilution_sd=dil_sd,
            exit_sigma_mean=exs, exit_sigma_sd=exs_sd,
        )
        companies.append((f"Company_{i+1:02d}", priors))
    return companies
