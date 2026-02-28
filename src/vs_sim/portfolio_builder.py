from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

from .portfolio import investor_score, simulate_portfolio_roi
from .vc_simulator import run_vc_return_simulator_uncertain
from .investor_metrics import attach_rar_metrics


# ============================================================
# PORTFOLIO BUILDER (RAR-FIRST)
#
# Base metric:
#   RAR = E[IRR] * (1 - PD_12m)
# where:
#   - E[IRR] is the mean IRR (per-startup) from simulator samples
#   - PD_12m = 1 - P(alive at month 12) from the survival curve
#
# Behaviour:
#   - Selection: top-k by the chosen objective (default objective="rar")
#   - Weight optimisation: maximises the chosen objective (default uses RAR)
#
# Supported objectives:
#   - "rar"          : portfolio RAR (default)
#   - "expected_roi" : ROI-based investor_score objective
#   - "expected_log"
#   - "prob_target"
#   - "prob_10x"
#
# Weight optimisation methods:
#   - "equal"
#   - "grid"       (k<=3)
#   - "dirichlet"  (recommended)
# ============================================================


@dataclass(frozen=True)
class StartupSpec:
    name: str
    priors: Dict[str, Any]
    pre_money: Optional[float] = None


def _normalise_weights(w: np.ndarray) -> np.ndarray:
    w = np.asarray(w, dtype=float)
    w = np.maximum(w, 0.0)
    s = float(w.sum())
    return w / (s + 1e-12)


def _tickets_from_weights(weights: np.ndarray, budget: float, min_ticket: float) -> np.ndarray:
    w = _normalise_weights(weights)
    tickets = w * float(budget)
    tickets = np.maximum(tickets, float(min_ticket))
    tickets = tickets * (float(budget) / (float(tickets.sum()) + 1e-12))
    w2 = tickets / (float(budget) + 1e-12)
    return _normalise_weights(w2)


def _roi_to_irr(roi: np.ndarray, years: float) -> np.ndarray:
    roi = np.asarray(roi, dtype=float)
    years = float(years)
    return np.where(roi <= 0.0, -1.0, np.power(roi, 1.0 / max(years, 1e-12)) - 1.0)


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
            pre_money=float(pre_money),
            priors=dict(s.priors),
            macro_shock_sd_annual=float(macro_shock_sd_annual),
            store_valuation_path=bool(store_valuation_path),
        )
        evaluated.append({"name": s.name, "priors": dict(s.priors), "res": res})
    return evaluated


def _single_score(item: Dict[str, Any], *, objective: str, target_roi: float, risk_penalty: float, loss_penalty: float) -> float:
    """
    Score a single startup under an objective.
    - For objective="rar": use attach_rar_metrics(res)["rar"].
    - Otherwise: use investor_score on ROI samples.
    """
    if objective == "rar":
        return float(attach_rar_metrics(item["res"])["rar"])

    roi = np.asarray(item["res"]["samples"]["roi"], dtype=float)
    return float(
        investor_score(
            roi,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )
    )


def _choose_k_by_metric(
    evaluated: List[Dict[str, Any]],
    *,
    k: int,
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
) -> List[Dict[str, Any]]:
    scored: List[Dict[str, Any]] = []
    for item in evaluated:
        sc = _single_score(
            item,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )
        scored.append({**item, "score": float(sc)})

    scored.sort(key=lambda d: d["score"], reverse=True)
    k_eff = max(1, min(int(k), len(scored)))
    return scored[:k_eff]


def _objective_value_for_portfolio(
    *,
    port_roi: np.ndarray,
    weights: np.ndarray,
    chosen: Sequence[Dict[str, Any]],
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
) -> float:
    """
    Portfolio objective value under:
      - "rar": RAR_port = E[IRR_port] * (1 - PD_port_12m)
               where PD_port_12m is weight-averaged PD_12m across constituents.
      - otherwise: investor_score(port_roi, ...)
    """
    if objective != "rar":
        return float(
            investor_score(
                port_roi,
                objective=objective,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )
        )

    # PD_port_12m: weighted average of constituent PD_12m
    pds = np.array([attach_rar_metrics(c["res"])["pd_12m"] for c in chosen], dtype=float)
    w = _normalise_weights(weights)
    pd_port = float(np.dot(w, pds))

    # E[IRR_port]: derived from portfolio ROI over horizon
    years = float(chosen[0]["res"]["config"]["horizon_years"])
    irr_port = _roi_to_irr(np.asarray(port_roi, dtype=float), years)
    exp_irr_port = float(np.mean(irr_port))

    return float(exp_irr_port * (1.0 - pd_port))


def _optimise_weights_equal(k: int) -> np.ndarray:
    return np.ones(int(k), dtype=float) / float(k)


def _optimise_weights_grid(
    roi_mat: np.ndarray,
    chosen: Sequence[Dict[str, Any]],
    *,
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
    step: float = 0.1,
) -> Tuple[np.ndarray, float]:
    k = roi_mat.shape[1]
    if k > 3:
        raise ValueError("grid optimisation supports k<=3 only. Use method='dirichlet'.")

    grid = np.arange(0, 1 + 1e-9, float(step))
    best_sc = -np.inf
    best_w: Optional[np.ndarray] = None

    def eval_w(w: np.ndarray) -> float:
        port_roi = simulate_portfolio_roi(roi_mat, w)
        return _objective_value_for_portfolio(
            port_roi=port_roi,
            weights=w,
            chosen=chosen,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )

    if k == 1:
        w = np.array([1.0], dtype=float)
        best_w = w
        best_sc = float(eval_w(w))

    elif k == 2:
        for w0 in grid:
            w = np.array([w0, 1.0 - w0], dtype=float)
            sc = float(eval_w(w))
            if sc > best_sc:
                best_sc, best_w = sc, w

    elif k == 3:
        for w0 in grid:
            for w1 in grid:
                w2 = 1.0 - w0 - w1
                if w2 < -1e-9:
                    continue
                w = np.array([w0, w1, max(0.0, w2)], dtype=float)
                w = _normalise_weights(w)
                sc = float(eval_w(w))
                if sc > best_sc:
                    best_sc, best_w = sc, w

    if best_w is None:
        best_w = _optimise_weights_equal(k)
        best_sc = float(eval_w(best_w))

    return np.asarray(best_w, dtype=float), float(best_sc)


def _optimise_weights_dirichlet(
    roi_mat: np.ndarray,
    chosen: Sequence[Dict[str, Any]],
    *,
    objective: str,
    target_roi: float,
    risk_penalty: float,
    loss_penalty: float,
    n_draws: int = 10_000,
    alpha: float = 1.0,
    seed: int = 0,
) -> Tuple[np.ndarray, float]:
    rng = np.random.default_rng(seed)
    k = roi_mat.shape[1]

    best_sc = -np.inf
    best_w: Optional[np.ndarray] = None

    def eval_w(w: np.ndarray) -> float:
        port_roi = simulate_portfolio_roi(roi_mat, w)
        return _objective_value_for_portfolio(
            port_roi=port_roi,
            weights=w,
            chosen=chosen,
            objective=objective,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )

    # baseline: equal
    w0 = _optimise_weights_equal(k)
    best_w = w0
    best_sc = float(eval_w(w0))

    A = np.full(k, float(alpha), dtype=float)
    for _ in range(int(n_draws)):
        w = rng.dirichlet(A)
        sc = float(eval_w(w))
        if sc > best_sc:
            best_sc, best_w = sc, w

    return np.asarray(best_w, dtype=float), float(best_sc)


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
    # objective
    objective: str = "rar",  # <-- RAR is the base scoring method
    candidate_objectives: Sequence[str] = ("rar", "expected_roi", "expected_log", "prob_target", "prob_10x"),
    target_roi: float = 2.0,
    risk_penalty: float = 0.15,
    loss_penalty: float = 0.80,
    # weight optimisation
    weight_method: str = "dirichlet",          # "equal" | "grid" | "dirichlet"
    weight_grid_step: float = 0.1,
    weight_dirichlet_draws: int = 10_000,
    weight_dirichlet_alpha: float = 1.0,
) -> Dict[str, Any]:
    startups = list(startups)
    if len(startups) == 0:
        raise ValueError("startups must be a non-empty list of StartupSpec.")

    max_k_by_budget = int(float(budget) // float(min_ticket))
    if max_k_by_budget <= 0:
        raise ValueError("Budget is smaller than min_ticket; increase budget or reduce min_ticket.")
    k_eff = max(1, min(int(k), max_k_by_budget, len(startups)))

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

    def build_under_objective(obj: str) -> Dict[str, Any]:
        chosen = _choose_k_by_metric(
            evaluated,
            k=k_eff,
            objective=obj,
            target_roi=target_roi,
            risk_penalty=risk_penalty,
            loss_penalty=loss_penalty,
        )

        n_s = min(len(c["res"]["samples"]["roi"]) for c in chosen)
        roi_mat = np.column_stack([np.asarray(c["res"]["samples"]["roi"][:n_s], dtype=float) for c in chosen])

        # optimise weights
        if weight_method == "equal":
            w_opt = _optimise_weights_equal(len(chosen))
            port_sc = _objective_value_for_portfolio(
                port_roi=simulate_portfolio_roi(roi_mat, w_opt),
                weights=w_opt,
                chosen=chosen,
                objective=obj,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
            )

        elif weight_method == "grid":
            w_opt, port_sc = _optimise_weights_grid(
                roi_mat,
                chosen,
                objective=obj,
                target_roi=target_roi,
                risk_penalty=risk_penalty,
                loss_penalty=loss_penalty,
                step=weight_grid_step,
            )

        elif weight_method == "dirichlet":
            w_opt, port_sc = _optimise_weights_dirichlet(
                roi_mat,
                chosen,
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

        # enforce min_ticket
        w_final = _tickets_from_weights(w_opt, float(budget), float(min_ticket))
        port_roi = simulate_portfolio_roi(roi_mat, w_final)
        tickets = w_final * float(budget)

        pm = _portfolio_metrics(port_roi)

        # Add RAR headline metrics (always included)
        years = float(chosen[0]["res"]["config"]["horizon_years"])
        irr_port = _roi_to_irr(port_roi, years)
        pm["expected_irr"] = float(np.mean(irr_port))

        pds = np.array([attach_rar_metrics(c["res"])["pd_12m"] for c in chosen], dtype=float)
        pm["pd_12m"] = float(np.dot(w_final, pds))
        pm["rar"] = float(pm["expected_irr"] * (1.0 - pm["pd_12m"]))

        selected_out = []
        for i, c in enumerate(chosen):
            rar_pack = attach_rar_metrics(c["res"])
            selected_out.append(
                {
                    "name": c["name"],
                    "priors": c.get("priors", {}),
                    "weight": float(w_final[i]),
                    "ticket": float(tickets[i]),
                    # keep both: base RAR + the objective-specific single score
                    "rar": float(rar_pack["rar"]),
                    "expected_irr": float(rar_pack["expected_irr"]),
                    "pd_12m": float(rar_pack["pd_12m"]),
                    "single_score": float(
                        _single_score(
                            c,
                            objective=obj,
                            target_roi=target_roi,
                            risk_penalty=risk_penalty,
                            loss_penalty=loss_penalty,
                        )
                    ),
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
                "weight_method": str(weight_method),
                "weights_raw": np.asarray(w_opt, dtype=float),
                "weights_final": np.asarray(w_final, dtype=float),
            },
        }

    if objective == "auto":
        tried = []
        best: Optional[Dict[str, Any]] = None
        for obj in candidate_objectives:
            out_obj = build_under_objective(obj)
            tried.append(
                {
                    "objective": obj,
                    "portfolio_score": out_obj["portfolio_score"],
                    "rar": out_obj["portfolio_metrics"]["rar"],
                    "expected_irr": out_obj["portfolio_metrics"]["expected_irr"],
                    "pd_12m": out_obj["portfolio_metrics"]["pd_12m"],
                    "expected_roi": out_obj["portfolio_metrics"]["expected_roi"],
                }
            )
            if best is None or out_obj["portfolio_score"] > best["portfolio_score"]:
                best = out_obj

        assert best is not None
        best["debug"]["objective_search"] = tried
        return best

    if objective not in set(candidate_objectives):
        raise ValueError(f"Unknown objective '{objective}'. Use 'auto' or one of: {candidate_objectives}.")

    out = build_under_objective(objective)
    out["debug"]["objective_search"] = None
    return out
