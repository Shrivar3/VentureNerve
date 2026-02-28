from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

from .portfolio import investor_score, simulate_portfolio_roi
from .vc_simulator import run_vc_return_simulator_uncertain


# ============================================================
# PORTFOLIO BUILDER
# - Evaluates startups (Monte Carlo)
# - Selects a subset (top-k by score)
# - Optimises weights to maximise an "optimal metric" (objective)
#
# Supported objectives (same as investor_score):
#   - "expected_roi"
#   - "expected_log"
#   - "prob_target"
#   - "prob_10x"
#
# Weight optimisation methods:
#   - "equal"        : equal weights
#   - "grid"         : grid search (only feasible for k<=3)
#   - "dirichlet"    : random search over weights via Dirichlet samples (recommended)
#
# Tickets:
#   - weights -> tickets = weights * budget
#   - enforce min_ticket by bumping then renormalising to budget
# ============================================================


@dataclass(frozen=True)
class StartupSpec:
    name: str
    priors: Dict[str, Any]
    # Optional per-startup overrides (rarely needed)
    pre_money: Optional[float] = None


def _normalise_weights(w: np.ndarray) -> np.ndarray:
    w = np.asarray(w, dtype=float)
    w = np.maximum(w, 0.0)
    s = float(w.sum())
    return w / (s + 1e-12)


def _tickets_from_weights(weights: np.ndarray, budget: float, min_ticket: float) -> np.ndarray:
    w = _normalise_weights(weights)
    tickets = w * float(budget)
    # Enforce min ticket: bump small tickets, then rescale to budget
    tickets = np.maximum(tickets, float(min_ticket))
    tickets = tickets * (float(budget) / (float(tickets.sum()) + 1e-12))
    # Convert back to weights implied by tickets (to keep consistency)
    w2 = tickets / (float(budget) + 1e-12)
    return _normalise_weights(w2)  # final weights consistent with min_ticket


def _choose_k_by_metric(
    evaluated: List[Dict[str, Any]],
    *,
    k: int,
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
) -> List[Dict[str, Any]]:
    scored = []
    for item in evaluated:
        roi = np.asarray(item["res"]["samples"]["roi"], dtype=float)
        sc = investor_score(
            roi,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )
        scored.append({**item, "score": float(sc)})

    scored.sort(key=lambda d: d["score"], reverse=True)
    k_eff = max(1, min(int(k), len(scored)))
    return scored[:k_eff]


def _optimise_weights_equal(k: int) -> np.ndarray:
    return np.ones(int(k), dtype=float) / float(k)


def _optimise_weights_grid(
    roi_mat: np.ndarray,
    *,
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
    step: float = 0.1,
) -> Tuple[np.ndarray, float]:
    """
    Exact-ish grid optimisation for k<=3.
    Returns (best_weights, best_score).
    """
    k = roi_mat.shape[1]
    if k > 3:
        raise ValueError("grid optimisation supports k<=3 only. Use method='dirichlet'.")

    grid = np.arange(0, 1 + 1e-9, float(step))
    best_sc = -np.inf
    best_w = None

    if k == 1:
        w = np.array([1.0])
        port_roi = simulate_portfolio_roi(roi_mat, w)
        best_sc = investor_score(
            port_roi,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )
        best_w = w

    elif k == 2:
        for w0 in grid:
            w = np.array([w0, 1.0 - w0], dtype=float)
            port_roi = simulate_portfolio_roi(roi_mat, w)
            sc = investor_score(
                port_roi,
                objective=objective,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )
            if sc > best_sc:
                best_sc = float(sc)
                best_w = w

    elif k == 3:
        for w0 in grid:
            for w1 in grid:
                w2 = 1.0 - w0 - w1
                if w2 < -1e-9:
                    continue
                w = np.array([w0, w1, max(0.0, w2)], dtype=float)
                w = _normalise_weights(w)
                port_roi = simulate_portfolio_roi(roi_mat, w)
                sc = investor_score(
                    port_roi,
                    objective=objective,
                    target_roi=target_roi,
                    risk_penalty=risk_penalty,
                    loss_penalty=loss_penalty,
                )
                if sc > best_sc:
                    best_sc = float(sc)
                    best_w = w

    if best_w is None:
        best_w = _optimise_weights_equal(k)
        best_sc = float(
            investor_score(
                simulate_portfolio_roi(roi_mat, best_w),
                objective=objective,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )
        )
    return best_w, float(best_sc)


def _optimise_weights_dirichlet(
    roi_mat: np.ndarray,
    *,
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
    n_draws: int = 10_000,
    alpha: float = 1.0,
    seed: int = 0,
) -> Tuple[np.ndarray, float]:
    """
    Random search over weights with Dirichlet(alpha,...,alpha).
    Returns (best_weights, best_score).
    """
    rng = np.random.default_rng(seed)
    k = roi_mat.shape[1]

    best_sc = -np.inf
    best_w = None

    # Include equal weights as a baseline candidate
    w0 = _optimise_weights_equal(k)
    sc0 = investor_score(
        simulate_portfolio_roi(roi_mat, w0),
        objective=objective,
        target_roi=target_roi,
        risk_penalty=risk_penalty,
        loss_penalty=loss_penalty,
    )
    best_sc = float(sc0)
    best_w = w0

    # Sample weights
    A = np.full(k, float(alpha), dtype=float)
    for _ in range(int(n_draws)):
        w = rng.dirichlet(A)
        port_roi = simulate_portfolio_roi(roi_mat, w)
        sc = investor_score(
            port_roi,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )
        if sc > best_sc:
            best_sc = float(sc)
            best_w = w

    return best_w, float(best_sc)


def _portfolio_metrics(roi: np.ndarray) -> Dict[str, Any]:
    roi = np.asarray(roi, dtype=float)
    return {
        "prob_roi_lt_1": float(np.mean(roi < 1.0)),
        "prob_total_loss": float(np.mean(roi == 0.0)),
        "prob_3x": float(np.mean(roi >= 3.0)),
        "prob_10x": float(np.mean(roi >= 10.0)),
        "expected_roi": float(np.mean(roi)),
        "median_roi": float(np.median(roi)),
        "roi_percentiles": {q: float(np.percentile(roi, q)) for q in (5, 10, 25, 50, 75, 90, 95)},
    }


def _evaluate_startups(
    startups: Sequence[StartupSpec],
    *,
    seed0: int,
    n_sims: int,
    horizon_years: float,
    investment: float,
    pre_money_default: float,
    macro_shock_sd_annual: float,
    store_valuation_path: bool,
) -> List[Dict[str, Any]]:
    evaluated: List[Dict[str, Any]] = []
    for i, s in enumerate(startups):
        pre_money = float(s.pre_money) if s.pre_money is not None else float(pre_money_default)
        res = run_vc_return_simulator_uncertain(
            seed=int(seed0 + i),
            n_sims=int(n_sims),
            horizon_years=float(horizon_years),
            investment=float(investment),
            pre_money=pre_money,
            priors=dict(s.priors),
            macro_shock_sd_annual=float(macro_shock_sd_annual),
            store_valuation_path=bool(store_valuation_path),
        )
        evaluated.append({"name": s.name, "priors": dict(s.priors), "res": res})
    return evaluated


def build_portfolio(
    startups: Sequence[StartupSpec],
    *,
    # simulation settings (per startup)
    seed: int = 0,
    n_sims: int = 20_000,
    horizon_years: float = 5.0,
    investment: float = 100_000.0,
    pre_money_default: float = 1_000_000.0,
    macro_shock_sd_annual: float = 0.25,
    store_valuation_path: bool = False,
    # portfolio settings
    budget: float = 500_000.0,
    k: int = 3,
    min_ticket: float = 100_000.0,
    # "optimal metric" settings
    objective: str = "auto",
    candidate_objectives: Sequence[str] = ("expected_roi", "expected_log", "prob_target", "prob_10x"),
    target_roi: float = 2.0,
    risk_penalty: float = 0.15,
    loss_penalty: float = 0.80,
    # weight optimisation
    weight_method: str = "dirichlet",          # "equal" | "grid" | "dirichlet"
    weight_grid_step: float = 0.1,             # for grid
    weight_dirichlet_draws: int = 10_000,      # for dirichlet
    weight_dirichlet_alpha: float = 1.0,       # <1 encourages sparse weights; >1 encourages equal-ish
) -> Dict[str, Any]:
    """
    End-to-end build:
      1) Run MC for each startup
      2) If objective="auto", pick the objective that yields the best optimised portfolio score
      3) Pick top-k startups under that objective
      4) Optimise weights under that objective
      5) Enforce min_ticket and return a UI-ready result dict

    Returns:
      {
        "objective_used": ...,
        "portfolio_score": ...,
        "selected": [{name, priors, weight, ticket, single_metrics, single_score}],
        "portfolio_metrics": ...,
        "portfolio_samples": {"roi": ...},
        "debug": {...}
      }
    """
    startups = list(startups)
    if len(startups) == 0:
        raise ValueError("startups must be a non-empty list of StartupSpec.")

    # Enforce feasibility: k cannot exceed budget//min_ticket
    max_k_by_budget = int(float(budget) // float(min_ticket))
    if max_k_by_budget <= 0:
        raise ValueError("Budget is smaller than min_ticket; increase budget or reduce min_ticket.")
    k_eff = max(1, min(int(k), max_k_by_budget, len(startups)))

    # 1) Evaluate
    evaluated = _evaluate_startups(
        startups,
        seed0=int(seed),
        n_sims=int(n_sims),
        horizon_years=float(horizon_years),
        investment=float(investment),
        pre_money_default=float(pre_money_default),
        macro_shock_sd_annual=float(macro_shock_sd_annual),
        store_valuation_path=bool(store_valuation_path),
    )

    # Helper to build and score a portfolio under a given objective
    def build_under_objective(obj: str) -> Dict[str, Any]:
        chosen = _choose_k_by_metric(
            evaluated,
            k=k_eff,
            objective=obj,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )

        # Align sims across chosen
        n_s = min(len(c["res"]["samples"]["roi"]) for c in chosen)
        roi_mat = np.column_stack([np.asarray(c["res"]["samples"]["roi"][:n_s], dtype=float) for c in chosen])

        # Optimise weights
        if weight_method == "equal":
            w = _optimise_weights_equal(len(chosen))
            best_sc = investor_score(
                simulate_portfolio_roi(roi_mat, w),
                objective=obj,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )
            w_opt = w
            port_sc = float(best_sc)

        elif weight_method == "grid":
            w_opt, port_sc = _optimise_weights_grid(
                roi_mat,
                objective=obj,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
                step=weight_grid_step,
            )

        elif weight_method == "dirichlet":
            w_opt, port_sc = _optimise_weights_dirichlet(
                roi_mat,
                objective=obj,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
                n_draws=weight_dirichlet_draws,
                alpha=weight_dirichlet_alpha,
                seed=int(seed) + 12345,
            )
        else:
            raise ValueError("weight_method must be one of: 'equal', 'grid', 'dirichlet'.")

        # Enforce min_ticket in weights/tickets
        w_final = _tickets_from_weights(w_opt, float(budget), float(min_ticket))
        port_roi = simulate_portfolio_roi(roi_mat, w_final)

        tickets = w_final * float(budget)
        pm = _portfolio_metrics(port_roi)

        # Also keep single-startup scores under this objective (useful for UI/debug)
        selected_out = []
        for i, c in enumerate(chosen):
            roi_i = np.asarray(c["res"]["samples"]["roi"], dtype=float)
            single_sc = investor_score(
                roi_i,
                objective=obj,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )
            selected_out.append(
                {
                    "name": c["name"],
                    "priors": c.get("priors", {}),
                    "weight": float(w_final[i]),
                    "ticket": float(tickets[i]),
                    "single_score": float(single_sc),
                    "single_metrics": c["res"]["metrics"],
                }
            )

        return {
            "objective_used": obj,
            "portfolio_score": float(port_sc),
            "selected": selected_out,
            "portfolio_metrics": pm,
            "portfolio_samples": {"roi": port_roi},
            "debug": {
                "k_eff": int(k_eff),
                "n_sims_used_per_asset": int(n_s),
                "weight_method": weight_method,
                "weights_raw": np.asarray(w_opt, dtype=float),
                "weights_final": np.asarray(w_final, dtype=float),
            },
        }

    # 2) Choose objective (auto) or build directly
    if objective != "auto":
        if objective not in set(candidate_objectives) | {"expected_roi", "expected_log", "prob_target", "prob_10x"}:
            raise ValueError("Unknown objective. Use 'auto' or one of: expected_roi, expected_log, prob_target, prob_10x.")
        out = build_under_objective(objective)
        out["debug"]["objective_search"] = None
        return out

    # Auto: try all candidate objectives and take the one with best portfolio_score
    tried = []
    best = None
    for obj in candidate_objectives:
        out_obj = build_under_objective(obj)
        tried.append(
            {
                "objective": obj,
                "portfolio_score": out_obj["portfolio_score"],
                "expected_roi": out_obj["portfolio_metrics"]["expected_roi"],
                "prob_loss": out_obj["portfolio_metrics"]["prob_roi_lt_1"],
                "prob_10x": out_obj["portfolio_metrics"]["prob_10x"],
            }
        )
        if best is None or out_obj["portfolio_score"] > best["portfolio_score"]:
            best = out_obj

    assert best is not None
    best["debug"]["objective_search"] = tried
    best["objective_used"] = best["objective_used"]
    return best
