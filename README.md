# VC Portfolio Simulator

Link to website: https://venture-nerve-match.base44.app/

A Monte Carlo–based venture capital portfolio optimisation engine.

This project simulates startup outcomes under parameter uncertainty, evaluates expected returns and risk, and builds an optimised portfolio based on a chosen investor objective.

It is designed for investor tooling prototypes and decision-support systems where transparency, flexibility, and scenario analysis are critical.

---

## What This Does

This engine:

1. Simulates startup valuation paths using stochastic growth, failure risk, dilution, and exit uncertainty.
2. Generates ROI distributions for each startup.
3. Scores startups under multiple investor objectives.
4. Selects the top-k startups subject to budget constraints.
5. Optimises portfolio weights via stochastic search.
6. Outputs portfolio metrics and allocation decisions.

---

## Core Model

Each startup is simulated using:

- Annual growth rate (μ)
- Volatility (σ)
- Annual failure probability
- Dilution assumptions
- Exit valuation tail (lognormal multiplier)
- Optional macro shock correlation

The model produces:

- ROI distribution
- IRR distribution
- Expected payout
- Probability of total loss
- Probability of 3x, 10x outcomes
- Survival curve
- Percentile breakdown

---

## Portfolio Optimisation

Supported investor objectives:

- `"expected_roi"`
- `"expected_log"`
- `"prob_target"`
- `"prob_10x"`
- `"auto"` (tries all and selects the best)

Portfolio constraints:

- Budget limit
- Minimum ticket size
- Top-k selection
- Weight optimisation via Dirichlet random search

---

## Example Usage

```python
startups = [
    StartupSpec("SaaS_Stable", dict(
        mu_annual_mean=0.45,
        mu_annual_sd=0.20,
        p_fail_annual_mean=0.15,
        p_fail_annual_strength=35,
        sigma_annual_mean=0.70,
        sigma_annual_sd=0.20,
        dilution_mean=0.30,
        dilution_sd=0.10,
        exit_sigma_mean=0.60,
        exit_sigma_sd=0.15,
    )),
    StartupSpec("DeepTech_LongShot", dict(
        mu_annual_mean=0.90,
        mu_annual_sd=0.40,
        p_fail_annual_mean=0.35,
        p_fail_annual_strength=18,
        sigma_annual_mean=1.10,
        sigma_annual_sd=0.35,
        dilution_mean=0.55,
        dilution_sd=0.20,
        exit_sigma_mean=1.10,
        exit_sigma_sd=0.30,
    )),
]

portfolio = build_portfolio(
    startups,
    objective="auto",
    budget=500_000,
    k=2,
    min_ticket=100_000,
)

print(portfolio["selected"])
```

---

## Output Structure

The portfolio builder returns:

```python
{
    "objective_used": ...,
    "portfolio_score": ...,
    "selected": [
        {
            "name": ...,
            "weight": ...,
            "ticket": ...,
            "single_score": ...,
            "single_metrics": ...
        }
    ],
    "portfolio_metrics": {
        "expected_roi": ...,
        "median_roi": ...,
        "prob_roi_lt_1": ...,
        "prob_10x": ...
    },
    "portfolio_samples": {"roi": ...},
    "debug": {...}
}
```

---

## Designed For

- VC fund modelling
- Angel investment decision support
- Startup scenario analysis
- Portfolio theory experimentation
- Risk-adjusted return optimisation

---

## Tuning Levers

You can control:

- `risk_penalty`
- `loss_penalty`
- `target_roi`
- `weight_dirichlet_alpha`
- `weight_dirichlet_draws`
- `macro_shock_sd_annual`
- Simulation size (`n_sims`)

Lower alpha (<1) → concentrated portfolios  
Higher alpha (>1) → more diversified portfolios  

---

## Methodology Notes

- Monthly valuation evolution with geometric growth
- Failure as Bernoulli monthly hazard derived from annual probability
- Exit modelled via lognormal multiplier
- Portfolio ROI = weighted linear combination of startup ROI samples
- Optimisation performed via stochastic weight search

This is a simulation framework, not financial advice.

---

## Roadmap

Potential extensions:

- Correlated startup returns
- Sector factor modelling
- Bayesian prior calibration from real data
- Live API integration

---

Built for quantitative decision-making under uncertainty.
