from __future__ import annotations

import numpy as np


def plot_startup_mrr_fanchart(res: dict):
    """
    Fan chart for MRR percentiles (10/50/90) + target line.
    Returns a Plotly Figure.
    """
    import plotly.graph_objects as go

    months = int(res["config"]["months"])
    t = np.arange(months + 1)

    mrr_p10, mrr_p50, mrr_p90 = res["percentiles"]["mrr"]
    target = float(res["config"]["target_mrr"])

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=t, y=mrr_p50, mode="lines", name="Median"))
    fig.add_trace(go.Scatter(x=t, y=mrr_p90, mode="lines", line=dict(width=0), showlegend=False))
    fig.add_trace(
        go.Scatter(
            x=t,
            y=mrr_p10,
            mode="lines",
            fill="tonexty",
            name="10–90 percentile",
        )
    )
    fig.add_hline(y=target, annotation_text="Target MRR", annotation_position="top left")
    fig.update_layout(
        title="MRR fan chart",
        xaxis_title="Month",
        yaxis_title="MRR",
    )
    return fig


def plot_uncertain_results_nice(res: dict, *, roi_zoom_max: float = 10.0):
    """
    ROI-first visuals. Returns 4 Plotly figures:
      1) Outcome probability bars
      2) ROI histogram zoomed
      3) Expected-value contribution bars
      4) Survival curve
    """
    import plotly.graph_objects as go

    roi = np.asarray(res["samples"]["roi"], dtype=float)
    alive = np.asarray(res["paths"]["alive_frac_by_month"], dtype=float)
    months = len(alive) - 1
    t = np.arange(months + 1)

    probs = {
        "Lose money (<1x)": float(np.mean(roi < 1.0)),
        "Break-even (≥1x)": float(np.mean(roi >= 1.0)),
        "Good (≥3x)": float(np.mean(roi >= 3.0)),
        "Excellent (≥10x)": float(np.mean(roi >= 10.0)),
    }
    fig_probs = go.Figure()
    fig_probs.add_trace(
        go.Bar(
            x=list(probs.keys()),
            y=list(probs.values()),
            text=[f"{100*p:.1f}%" for p in probs.values()],
            textposition="outside",
        )
    )
    fig_probs.update_layout(
        title="Outcome probabilities (single startup)",
        yaxis_title="Probability",
        yaxis=dict(range=[0, 1]),
    )

    roi_zoom = roi[(roi >= 0.0) & (roi <= float(roi_zoom_max))]
    fig_roi = go.Figure()
    fig_roi.add_trace(go.Histogram(x=roi_zoom, nbinsx=90))
    fig_roi.update_layout(
        title=f"ROI distribution (zoomed: 0× to {roi_zoom_max:.0f}×)",
        xaxis_title="ROI multiple (payout / investment)",
        yaxis_title="Count",
    )
    for x, name in [(1, "1x"), (3, "3x"), (10, "10x")]:
        if x <= roi_zoom_max:
            fig_roi.add_vline(x=x, annotation_text=name, annotation_position="top")

    mean_roi = float(np.mean(roi) + 1e-12)
    bins = [
        ("Loss (<1x)", roi < 1.0),
        ("1–3x", (roi >= 1.0) & (roi < 3.0)),
        ("3–10x", (roi >= 3.0) & (roi < 10.0)),
        ("10x+", roi >= 10.0),
    ]
    contrib = [float(np.mean(roi * mask) / mean_roi) for _, mask in bins]

    fig_contrib = go.Figure()
    fig_contrib.add_trace(
        go.Bar(
            x=[b[0] for b in bins],
            y=contrib,
            text=[f"{100*c:.1f}%" for c in contrib],
            textposition="outside",
        )
    )
    fig_contrib.update_layout(
        title="Where the expected return comes from",
        yaxis_title="Fraction of expected ROI",
        yaxis=dict(range=[0, 1]),
    )

    fig_surv = go.Figure()
    fig_surv.add_trace(go.Scatter(x=t, y=alive, mode="lines", name="P(alive)"))
    fig_surv.update_layout(
        title="Survival curve: probability startup has NOT failed by month t",
        xaxis_title="Month",
        yaxis_title="P(alive)",
        yaxis=dict(range=[0, 1]),
    )

    return fig_probs, fig_roi, fig_contrib, fig_surv


def plot_roi_probability_bars(port: dict):
    import plotly.graph_objects as go

    roi = np.asarray(port["portfolio_samples"]["roi"], dtype=float)
    probs = {
        "Lose money (<1x)": float(np.mean(roi < 1)),
        "Break-even (≥1x)": float(np.mean(roi >= 1)),
        "Good (≥3x)": float(np.mean(roi >= 3)),
        "Excellent (≥10x)": float(np.mean(roi >= 10)),
    }

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=list(probs.keys()),
            y=list(probs.values()),
            text=[f"{100*p:.1f}%" for p in probs.values()],
            textposition="outside",
        )
    )
    fig.update_layout(
        title="Outcome probabilities (portfolio)",
        yaxis_title="Probability",
        yaxis=dict(range=[0, 1]),
    )
    return fig


def plot_roi_zoom(port: dict, *, xmax: float = 10.0, nbins: int = 80):
    import plotly.graph_objects as go

    roi = np.asarray(port["portfolio_samples"]["roi"], dtype=float)
    roi_zoom = roi[(roi >= 0) & (roi <= float(xmax))]

    fig = go.Figure()
    fig.add_trace(go.Histogram(x=roi_zoom, nbinsx=int(nbins)))
    fig.update_layout(
        title=f"ROI distribution (zoomed: 0× to {xmax:.0f}×)",
        xaxis_title="ROI multiple",
        yaxis_title="Count",
    )
    for x, name in [(1, "1x"), (3, "3x"), (10, "10x")]:
        if x <= xmax:
            fig.add_vline(x=x, annotation_text=name, annotation_position="top")
    return fig


def plot_value_contribution(port: dict):
    import plotly.graph_objects as go

    roi = np.asarray(port["portfolio_samples"]["roi"], dtype=float)
    mean_roi = float(np.mean(roi) + 1e-12)

    bins = [
        ("Loss (<1x)", roi < 1),
        ("1–3x", (roi >= 1) & (roi < 3)),
        ("3–10x", (roi >= 3) & (roi < 10)),
        ("10x+", roi >= 10),
    ]

    contrib = [float(np.mean(roi * mask) / mean_roi) for _, mask in bins]

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=[b[0] for b in bins],
            y=contrib,
            text=[f"{100*c:.1f}%" for c in contrib],
            textposition="outside",
        )
    )
    fig.update_layout(
        title="Where the expected return comes from",
        yaxis_title="Fraction of expected ROI",
        yaxis=dict(range=[0, 1]),
    )
    return fig
