from __future__ import annotations

import numpy as np

from .vc_simulator import run_vc_return_simulator_uncertain
from .investor_metrics import attach_rar_metrics


def evaluate_startup(
    name: str,
    *,
    seed: int,
    n_sims: int,
    horizon_years: float,
    investment: float,
    pre_money: float,
    priors: dict,
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
    # Ensure RAR-related metrics are attached into res["metrics"]
    attach_rar_metrics(res)
    return {"name": name, "res": res}


def _roi_to_irr(roi: np.ndarray, years: float) -> np.ndarray:
    roi = np.asarray(roi, dtype=float)
    years = float(years)
    # Convention: ROI<=0 -> IRR = -1
    return np.where(roi <= 0, -1.0, roi ** (1.0 / max(years, 1e-12)) - 1.0)


def investor_score(
    roi_samples: np.ndarray,
    *,
    objective: str = "rar",  # "rar" | "expected_roi" | "expected_log" | "prob_target" | "prob_10x"
    target_roi: float = 2.0,
    risk_penalty: float = 0.15,
    loss_penalty: float = 0.80,
    # RAR needs a time horizon and a default probability
    horizon_years: float | None = None,
    pd_12m: float | None = None,
) -> float:
    """
    Returns scalar score (higher is better).

    RAR definition:
      RAR = E[IRR] * (1 - PD_12m)

    For portfolio weighting/search we score the *portfolio ROI distribution*,
    convert to IRR using horizon_years, and use a supplied pd_12m (recommended).
    If pd_12m is missing, we fall back to P(ROI==0) as a crude proxy.

    Other objectives remain ROI-based:
      expected_roi : E[ROI] - loss_penalty*P(ROI<1) - risk_penalty*std(ROI)
      expected_log : E[log(ROI+eps)] - loss_penalty*P(ROI<1) - risk_penalty*std(log(ROI+eps))
      prob_target  : P(ROI>=target_roi) - loss_penalty*P(ROI<1)
      prob_10x     : P(ROI>=10) - loss_penalty*P(ROI<1)
    """
    roi = np.asarray(roi_samples, dtype=float)
    eps = 1e-12
    p_loss = float(np.mean(roi < 1.0))

    if objective == "rar":
        if horizon_years is None:
            raise ValueError("objective='rar' requires horizon_years.")
        irr = _roi_to_irr(roi, float(horizon_years))
        e_irr = float(np.mean(irr))
        pd = float(pd_12m) if pd_12m is not None else float(np.mean(roi == 0.0))
        rar = e_irr * (1.0 - pd)
        # risk_penalty here dampens volatility in IRR (keeps weights sensible)
        return float(rar - float(risk_penalty) * float(np.std(irr)))

    if objective == "expected_roi":
        return float(roi.mean() - loss_penalty * p_loss - risk_penalty * roi.std())

    if objective == "expected_log":
        z = np.log(roi + eps)
        return float(z.mean() - loss_penalty * p_loss - risk_penalty * z.std())

    if objective == "prob_target":
        return float(np.mean(roi >= float(target_roi)) - loss_penalty * p_loss)

    if objective == "prob_10x":
        return float(np.mean(roi >= 10.0) - loss_penalty * p_loss)

    raise ValueError(f"Unknown objective: {objective}")


def simulate_portfolio_roi(roi_matrix: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """
    roi_matrix: (n_sims, n_assets) ROI samples per startup
    weights:    (n_assets,) sum to 1
    Portfolio ROI = sum_i w_i * ROI_i
    """
    w = np.asarray(weights, dtype=float)
    w = w / (w.sum() + 1e-12)
    return roi_matrix @ w


def _portfolio_pd_12m_from_assets(pd_12m_assets: np.ndarray, weights: np.ndarray) -> float:
    """
    Portfolio PD_12m proxy = weighted average of constituent PD_12m.
    This matches a "capital-weighted distress probability" interpretation.
    """
    pd = np.asarray(pd_12m_assets, dtype=float)
    w = np.asarray(weights, dtype=float)
    w = w / (w.sum() + 1e-12)
    return float(np.clip((pd * w).sum(), 0.0, 1.0))


def recommend_portfolio(
    evaluated: list[dict],
    *,
    budget: float = 500_000.0,
    k: int = 3,
    min_ticket: float = 100_000.0,
    objective: str = "rar",
    target_roi: float = 2.0,
    risk_penalty: float = 0.15,
    loss_penalty: float = 0.80,
    optimise_weights: bool = False,
    weight_grid_step: float = 0.1,
) -> dict:
    # Ensure each res has rar metrics
    for item in evaluated:
        attach_rar_metrics(item["res"])

    # Horizon for IRR conversion (assume consistent across evaluated list)
    horizon_years = float(evaluated[0]["res"]["config"]["horizon_years"])

    # 1) Score startups
    scored = []
    for item in evaluated:
        res = item["res"]
        roi = np.asarray(res["samples"]["roi"], dtype=float)
        m = res["metrics"]

        if objective == "rar":
            # Use attached RAR, lightly regularise by IRR volatility
            pd_12m = float(m.get("pd_12m", np.nan))
            if not np.isfinite(pd_12m):
                pd_12m = float(np.mean(roi == 0.0))
            irr = np.asarray(res["samples"].get("irr", _roi_to_irr(roi, horizon_years)), dtype=float)
            rar = float(m.get("rar", np.mean(irr) * (1.0 - pd_12m)))
            score = float(rar - float(risk_penalty) * float(np.std(irr)))
        else:
            score = investor_score(
                roi,
                objective=objective,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )

        scored.append(
            {
                "name": item["name"],
                "roi": roi,
                "score": float(score),
                "single_metrics": m,
            }
        )
    scored.sort(key=lambda d: d["score"], reverse=True)

    # 2) Pick top-K subject to budget/min ticket
    max_k_by_budget = int(budget // min_ticket)
    k_eff = max(1, min(k, max_k_by_budget, len(scored)))
    chosen = scored[:k_eff]

    # 3) Align sims count
    n_sims = min(len(c["roi"]) for c in chosen)
    roi_mat = np.column_stack([c["roi"][:n_sims] for c in chosen])

    # Precompute asset PD_12m for portfolio PD proxy
    pd_assets = np.array([float(c["single_metrics"].get("pd_12m", 0.0)) for c in chosen], dtype=float)
    pd_assets = np.clip(pd_assets, 0.0, 1.0)

    # 4) Weights (equal by default; optional grid optimisation for K<=3)
    if (not optimise_weights) or (k_eff > 3):
        weights = np.ones(k_eff) / k_eff
    else:
        step = float(weight_grid_step)
        grid = np.arange(0, 1 + 1e-9, step)

        best_score, best_w = -np.inf, None

        def portfolio_score_for_w(w: np.ndarray) -> float:
            port_roi = simulate_portfolio_roi(roi_mat, w)
            if objective == "rar":
                pd_port = _portfolio_pd_12m_from_assets(pd_assets, w)
                return float(
                    investor_score(
                        port_roi,
                        objective="rar",
                        risk_penalty=risk_penalty,
                        horizon_years=horizon_years,
                        pd_12m=pd_port,
                    )
                )
            return float(
                investor_score(
                    port_roi,
                    objective=objective,
                    target_roi=target_roi,
                    risk_penalty=risk_penalty,
                    loss_penalty=loss_penalty,
                )
            )

        if k_eff == 2:
            for w0 in grid:
                w = np.array([w0, 1 - w0], dtype=float)
                sc = portfolio_score_for_w(w)
                if sc > best_score:
                    best_score, best_w = float(sc), w

        elif k_eff == 3:
            for w0 in grid:
                for w1 in grid:
                    w2 = 1 - w0 - w1
                    if w2 < -1e-9:
                        continue
                    w = np.array([w0, w1, max(0.0, w2)], dtype=float)
                    if w.sum() <= 0:
                        continue
                    w = w / w.sum()
                    sc = portfolio_score_for_w(w)
                    if sc > best_score:
                        best_score, best_w = float(sc), w

        weights = best_w if best_w is not None else (np.ones(k_eff) / k_eff)

    # 5) Portfolio ROI distribution + metrics (ROI + IRR + RAR)
    port_roi = simulate_portfolio_roi(roi_mat, weights)
    port_irr = _roi_to_irr(port_roi, horizon_years)

    pd_port_12m = _portfolio_pd_12m_from_assets(pd_assets, weights)
    rar_port = float(np.mean(port_irr)) * (1.0 - float(pd_port_12m))

    pm = {
        # ROI metrics
        "prob_roi_lt_1": float(np.mean(port_roi < 1.0)),
        "prob_total_loss": float(np.mean(port_roi == 0.0)),
        "prob_3x": float(np.mean(port_roi >= 3.0)),
        "prob_10x": float(np.mean(port_roi >= 10.0)),
        "expected_roi": float(np.mean(port_roi)),
        "median_roi": float(np.median(port_roi)),
        "roi_percentiles": {q: float(np.percentile(port_roi, q)) for q in (5, 10, 25, 50, 75, 90, 95)},
        # IRR metrics
        "expected_irr": float(np.mean(port_irr)),
        "median_irr": float(np.median(port_irr)),
        "irr_percentiles": {q: float(np.percentile(port_irr, q)) for q in (5, 10, 25, 50, 75, 90, 95)},
        # Dashboard-style headline
        "pd_12m": float(pd_port_12m),
        "rar": float(rar_port),
    }

    # 6) Ticket sizes
    tickets = weights * budget
    tickets = np.maximum(tickets, min_ticket)
    tickets = tickets * (budget / tickets.sum())

    return {
        "objective": objective,
        "target_roi": target_roi,
        "risk_penalty": risk_penalty,
        "loss_penalty": loss_penalty,
        "budget": float(budget),
        "min_ticket": float(min_ticket),
        "selected": [
            {
                "name": chosen[i]["name"],
                "weight": float(weights[i]),
                "ticket": float(tickets[i]),
                "score": float(chosen[i]["score"]),
                "single_metrics": chosen[i]["single_metrics"],
            }
            for i in range(k_eff)
        ],
        "portfolio_metrics": pm,
        "portfolio_samples": {"roi": port_roi, "irr": port_irr},
    }
