from __future__ import annotations

import numpy as np

from .vc_simulator import run_vc_return_simulator_uncertain


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
    return {"name": name, "res": res}


def investor_score(
    roi_samples: np.ndarray,
    *,
    objective: str = "expected_roi",   # "expected_roi" | "expected_log" | "prob_target" | "prob_10x"
    target_roi: float = 2.0,
    risk_penalty: float = 0.15,
    loss_penalty: float = 0.80,
) -> float:
    """
    Returns scalar score (higher is better).

    expected_roi : E[ROI] - loss_penalty*P(ROI<1) - risk_penalty*std(ROI)
    expected_log : E[log(ROI+eps)] - loss_penalty*P(ROI<1) - risk_penalty*std(log(ROI+eps))
    prob_target  : P(ROI>=target_roi) - loss_penalty*P(ROI<1)
    prob_10x     : P(ROI>=10) - loss_penalty*P(ROI<1)
    """
    roi = np.asarray(roi_samples, dtype=float)
    eps = 1e-12
    p_loss = float(np.mean(roi < 1.0))

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


def recommend_portfolio(
    evaluated: list[dict],
    *,
    budget: float = 500_000.0,
    k: int = 3,
    min_ticket: float = 100_000.0,
    objective: str = "expected_roi",
    target_roi: float = 2.0,
    risk_penalty: float = 0.15,
    loss_penalty: float = 0.80,
    optimise_weights: bool = False,
    weight_grid_step: float = 0.1,
) -> dict:
    # 1) Score startups
    scored = []
    for item in evaluated:
        roi = item["res"]["samples"]["roi"]
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
                "single_metrics": item["res"]["metrics"],
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

    # 4) Weights (equal by default; optional grid optimisation for K<=3)
    if (not optimise_weights) or (k_eff > 3):
        weights = np.ones(k_eff) / k_eff
    else:
        step = float(weight_grid_step)
        grid = np.arange(0, 1 + 1e-9, step)

        best_score, best_w = -np.inf, None
        if k_eff == 2:
            for w0 in grid:
                w = np.array([w0, 1 - w0])
                port_roi = simulate_portfolio_roi(roi_mat, w)
                sc = investor_score(
                    port_roi,
                    objective=objective,
                    target_roi=target_roi,
                    risk_penalty=risk_penalty,
                    loss_penalty=loss_penalty,
                )
                if sc > best_score:
                    best_score, best_w = float(sc), w
        elif k_eff == 3:
            for w0 in grid:
                for w1 in grid:
                    w2 = 1 - w0 - w1
                    if w2 < -1e-9:
                        continue
                    w = np.array([w0, w1, max(0.0, w2)])
                    if w.sum() <= 0:
                        continue
                    w = w / w.sum()
                    port_roi = simulate_portfolio_roi(roi_mat, w)
                    sc = investor_score(
                        port_roi,
                        objective=objective,
                        target_roi=target_roi,
                        risk_penalty=risk_penalty,
                        loss_penalty=loss_penalty,
                    )
                    if sc > best_score:
                        best_score, best_w = float(sc), w

        weights = best_w if best_w is not None else (np.ones(k_eff) / k_eff)

    # 5) Portfolio ROI distribution + metrics (ROI only)
    port_roi = simulate_portfolio_roi(roi_mat, weights)

    pm = {
        "prob_roi_lt_1": float(np.mean(port_roi < 1.0)),
        "prob_total_loss": float(np.mean(port_roi == 0.0)),
        "prob_3x": float(np.mean(port_roi >= 3.0)),
        "prob_10x": float(np.mean(port_roi >= 10.0)),
        "expected_roi": float(np.mean(port_roi)),
        "median_roi": float(np.median(port_roi)),
        "roi_percentiles": {q: float(np.percentile(port_roi, q)) for q in (5, 10, 25, 50, 75, 90, 95)},
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
        "portfolio_samples": {"roi": port_roi},
    }
