import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import AIChatbot from "../components/chatbot/AIChatbot";
import { FlaskConical, TrendingUp, ShieldAlert, BarChart3, RefreshCw, ChevronRight } from "lucide-react";

// --- Mini Monte Carlo simulation (runs in-browser) ---
function runMonteCarlo(n = 2000) {
  const results = [];
  // Startup parameters (NovaHealth-like example)
  const baseMRR = 150000;        // $150k MRR
  const growthMean = 0.12;       // 12% monthly growth mean
  const growthStd = 0.08;        // growth volatility
  const burnRate = 200000;       // $200k/mo burn
  const initialCash = 4400000;   // $4.4M cash

  for (let i = 0; i < n; i++) {
    let cash = initialCash;
    let mrr = baseMRR;
    let distressed = false;
    const months = 12;

    for (let m = 0; m < months; m++) {
      // Box-Muller for normal random
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const growth = growthMean + growthStd * z;
      mrr = mrr * (1 + growth);
      cash = cash + mrr - burnRate;
      if (cash <= 0) { distressed = true; break; }
    }

    // Compute IRR approximation: terminal ARR multiple / investment
    const terminalARR = mrr * 12;
    const investmentCost = 1000000; // $1M invested
    const multiple = distressed ? 0 : Math.max(0, terminalARR * 8 / investmentCost); // 8x ARR multiple
    const irr = distressed ? -1 : Math.pow(multiple, 1 / 3) - 1; // 3-year IRR approx

    results.push({ irr, distressed, multiple });
  }

  const pd = results.filter((r) => r.distressed).length / n;
  const irrs = results.filter((r) => !r.distressed).map((r) => r.irr);
  const meanIRR = irrs.reduce((a, b) => a + b, 0) / (irrs.length || 1);
  const rar = meanIRR * (1 - pd);

  // Histogram buckets
  const buckets = Array.from({ length: 12 }, (_, i) => ({
    label: `${Math.round((i - 2) * 30)}%`,
    min: (i - 2) * 0.3,
    max: (i - 1) * 0.3,
    count: 0,
  }));
  irrs.forEach((irr) => {
    const idx = Math.min(11, Math.max(0, Math.floor((irr + 0.6) / 0.3) + 2));
    if (buckets[idx]) buckets[idx].count++;
  });

  return { pd, meanIRR, rar, buckets, n, distressedCount: results.filter(r => r.distressed).length };
}

function MiniHistogram({ buckets, total }) {
  const max = Math.max(...buckets.map((b) => b.count));
  return (
    <div className="flex items-end gap-1 h-24">
      {buckets.map((b, i) => {
        const pct = max > 0 ? (b.count / max) * 100 : 0;
        const isPositive = b.min >= 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-sm transition-all duration-500 ${isPositive ? "bg-cyan-500/70" : "bg-rose-500/50"}`}
              style={{ height: `${pct}%`, minHeight: b.count > 0 ? "2px" : "0" }}
              title={`${b.label}: ${b.count} simulations`}
            />
          </div>
        );
      })}
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-center">
      <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-7">
      <h2 className="text-sm font-bold flex items-center gap-2 mb-5 text-white">
        <Icon className="w-4 h-4 text-cyan-400" /> {title}
      </h2>
      {children}
    </div>
  );
}

const steps = [
  {
    n: "01",
    title: "Define Startup Parameters",
    desc: "For each startup we calibrate: starting MRR, monthly growth rate distribution (μ, σ), monthly burn rate, and initial cash balance from their financial data.",
  },
  {
    n: "02",
    title: "Sample 10,000 Growth Paths",
    desc: "Each simulation draws a random growth rate each month from a normal distribution N(μ, σ²). Cash balance evolves as: Cash(t+1) = Cash(t) + MRR(t) − Burn.",
  },
  {
    n: "03",
    title: "Flag Distress Events",
    desc: "A simulation is marked distressed if cash balance hits ≤ 0 at any point in the 12-month window. The fraction of distressed paths is the 12-Month PD.",
  },
  {
    n: "04",
    title: "Calculate IRR Distribution",
    desc: "For surviving paths, terminal ARR is projected at month 12. IRR is approximated using a sector ARR multiple (e.g. 8× for SaaS) and a 3-year investment horizon.",
  },
  {
    n: "05",
    title: "Compute RAR Score",
    desc: "Risk-Adjusted Return = Mean Expected IRR × (1 − PD). This single number rewards high IRR startups while penalising those with elevated distress risk.",
  },
];

export default function Methodology() {
  const [simResult, setSimResult] = useState(null);
  const [running, setRunning] = useState(false);
  const hasRun = useRef(false);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setSimResult(runMonteCarlo(2000));
      setRunning(false);
    }, 80);
  };

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      run();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex">
      <Sidebar currentPage="Methodology" />

      <main className="flex-1 lg:ml-60 pb-24 lg:pb-0">
        {/* Header */}
        <div className="border-b border-white/5 px-6 md:px-10 py-6">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Platform Docs</p>
          <h1 className="text-2xl font-black tracking-tight">Scoring Methodology</h1>
          <p className="text-white/40 text-sm mt-1">
            How VentureNerve uses Monte Carlo simulation to produce risk-adjusted return scores.
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Intro */}
          <div className="bg-gradient-to-br from-cyan-500/8 to-blue-600/8 border border-cyan-500/15 rounded-2xl p-7">
            <h2 className="text-lg font-black mb-3">The Core Idea</h2>
            <p className="text-white/55 text-sm leading-relaxed">
              Traditional VC due diligence relies on a single best-guess forecast. VentureNerve instead runs{" "}
              <span className="text-cyan-400 font-bold">10,000 independent simulations</span> per startup, each sampling
              a different future. This gives us a full probability distribution over outcomes — not just a point estimate.
              From that distribution we derive three key numbers:{" "}
              <span className="text-white font-semibold">Expected IRR</span>,{" "}
              <span className="text-white font-semibold">12-Month Distress Probability (PD)</span>, and the composite{" "}
              <span className="text-cyan-400 font-semibold">Risk-Adjusted Return (RAR)</span>.
            </p>
          </div>

          {/* Formula */}
          <Section icon={TrendingUp} title="The RAR Formula">
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="bg-[#0B0D18] border border-white/10 rounded-2xl px-8 py-6 text-center w-full">
                <p className="text-2xl font-black text-cyan-400 tracking-tight font-mono">
                  RAR = E[IRR] × (1 − PD)
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 w-full text-sm">
                {[
                  { term: "E[IRR]", color: "text-cyan-400", def: "Expected Internal Rate of Return — the mean IRR across all non-distressed simulation paths." },
                  { term: "PD", color: "text-rose-400", def: "12-Month Probability of Distress — fraction of simulations where cash hits zero within 12 months." },
                  { term: "(1 − PD)", color: "text-emerald-400", def: "Survival probability. Higher PD shrinks the RAR, penalising risky startups regardless of headline IRR." },
                ].map(({ term, color, def }) => (
                  <div key={term} className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                    <p className={`font-black text-xl font-mono mb-2 ${color}`}>{term}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{def}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Process Steps */}
          <Section icon={FlaskConical} title="Monte Carlo Process — Step by Step">
            <div className="space-y-4">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-black text-cyan-400">
                    {s.n}
                  </div>
                  <div className="pb-4 border-b border-white/5 flex-1 last:border-0 last:pb-0">
                    <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Live Simulation */}
          <Section icon={BarChart3} title="Live Example — NovaHealth AI (Illustrative)">
            <p className="text-xs text-white/35 mb-5 leading-relaxed">
              This runs a real Monte Carlo simulation in your browser using NovaHealth's illustrative parameters:
              $150k starting MRR, 12% mean monthly growth (σ=8%), $200k/mo burn, $4.4M cash.
            </p>

            {simResult ? (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <StatBadge
                    label="Mean Expected IRR"
                    value={`${Math.round(simResult.meanIRR * 100)}%`}
                    color="text-cyan-400"
                  />
                  <StatBadge
                    label="12M Distress PD"
                    value={`${(simResult.pd * 100).toFixed(1)}%`}
                    color={simResult.pd < 0.12 ? "text-emerald-400" : "text-amber-400"}
                  />
                  <StatBadge
                    label="RAR Score"
                    value={`${(simResult.rar * 100).toFixed(1)}%`}
                    color="text-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-white/30 uppercase tracking-widest">IRR Distribution ({simResult.n.toLocaleString()} simulations)</p>
                    <p className="text-xs text-rose-400/70">{simResult.distressedCount} distressed paths excluded</p>
                  </div>
                  <div className="bg-[#0B0D18] border border-white/8 rounded-xl p-4">
                    <MiniHistogram buckets={simResult.buckets} total={simResult.n} />
                    <div className="flex justify-between text-[10px] text-white/20 mt-2 px-1">
                      <span>← Low IRR</span>
                      <span className="text-white/30">IRR Outcome Distribution</span>
                      <span>High IRR →</span>
                    </div>
                    <div className="flex gap-3 mt-3 text-[10px]">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/70 inline-block" />Positive IRR paths</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/50 inline-block" />Negative IRR paths</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-xs text-white/35 leading-relaxed">
                  <p className="font-semibold text-white/55 mb-1">How to read this:</p>
                  The histogram shows how IRR outcomes are distributed across {simResult.n.toLocaleString()} simulated futures.
                  Bars in <span className="text-cyan-400">cyan</span> represent profitable exit scenarios;{" "}
                  <span className="text-rose-400">rose</span> bars are negative-return paths (but distinct from distress).
                  The taller and further right the distribution, the more consistently attractive the investment.
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-white/30 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Running simulation...
              </div>
            )}

            <button
              onClick={run}
              disabled={running}
              className="mt-5 flex items-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] text-white/60 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
              Re-run Simulation
            </button>
          </Section>

          {/* Other metrics */}
          <Section icon={ShieldAlert} title="Additional Risk Metrics">
            <div className="space-y-4">
              {[
                {
                  name: "Fragility Score",
                  range: "0 – 100 (lower is better)",
                  desc: "A composite index measuring a startup's sensitivity to macro shocks. Inputs include cash runway (weighted 40%), sector volatility (30%), and team/customer concentration (30%). Calibrated against historical distress data from 2018–2024.",
                },
                {
                  name: "Revenue Concentration",
                  range: "% of ARR from top customer",
                  desc: "High concentration (>50%) indicates key-customer risk. If that customer churns, ARR could drop materially, directly inflating the PD in our simulation via lower projected MRR.",
                },
                {
                  name: "Stress Test Scenarios",
                  range: "Base / Stress / Severe",
                  desc: "We re-run simulations under three macro regimes. Stress: growth mean cut by 40%, burn +20%. Severe: growth mean cut by 75%, burn +40%, sector-specific shock multiplier applied. The scenario IRRs and PDs shown on each startup profile come directly from these runs.",
                },
              ].map((m) => (
                <div key={m.name} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <p className="text-sm font-bold">{m.name}</p>
                    <span className="text-[10px] bg-white/[0.04] border border-white/8 text-white/30 px-2 py-0.5 rounded-full">{m.range}</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed ml-5">{m.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Disclaimer */}
          <div className="text-xs text-white/20 leading-relaxed border border-white/5 rounded-xl p-5">
            <span className="font-semibold text-white/35">Disclaimer:</span> All metrics shown are illustrative and based on mock data for demonstration purposes only. VentureNerve does not provide financial, investment, or legal advice. Past simulation performance does not guarantee future results.
          </div>
        </div>
      </main>

      <MobileNav currentPage="Methodology" />
      <AIChatbot />
    </div>
  );
}
