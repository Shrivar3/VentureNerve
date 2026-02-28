import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import AIChatbot from "../components/chatbot/AIChatbot";
import { STARTUPS, computeRAR } from "../components/mockData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import {
  Briefcase, ChevronLeft, ChevronRight, RefreshCw, TrendingUp,
  ShieldCheck, PieChart, Sparkles, ArrowRight, SlidersHorizontal
} from "lucide-react";

const RISK_LABELS = ["Conservative", "Moderate", "Balanced", "Growth", "Aggressive"];

function buildPortfolio(startups, { minIRR, maxPD, risk }) {
  // Filter by investor profile first
  const eligible = startups.filter(s => s.expectedIRR >= minIRR && s.pd12m <= maxPD);
  const pool = eligible.length >= 5 ? eligible : startups; // fallback to all if too few

  // Risk tolerance adjusts sorting: higher risk = weight IRR more; lower risk = weight PD safety more
  const riskFactor = risk / 5; // 0.2 to 1.0
  const scored = pool
    .map(s => ({
      ...s,
      rar: computeRAR(s),
      score: s.expectedIRR * riskFactor + (1 - s.pd12m) * (1 - riskFactor * 0.5),
    }))
    .sort((a, b) => b.score - a.score);

  // Pick top 5 with sector diversification
  const selected = [];
  const sectors = new Set();
  for (const s of scored) {
    if (selected.length >= 5) break;
    if (!sectors.has(s.sector)) {
      selected.push(s);
      sectors.add(s.sector);
    }
  }
  for (const s of scored) {
    if (selected.length >= 5) break;
    if (!selected.find(x => x.id === s.id)) selected.push(s);
  }

  // Weight: higher risk tolerance → tilt toward higher RAR; lower → tilt toward lower PD
  const rawWeights = selected.map(s => {
    const safetyWeight = 1 / (s.pd12m + 0.05);
    const returnWeight = s.expectedIRR;
    return safetyWeight * (1 - riskFactor * 0.4) + returnWeight * riskFactor * 5;
  });
  const total = rawWeights.reduce((a, b) => a + b, 0);
  return selected.map((s, i) => ({ ...s, weight: rawWeights[i] / total }));
}

function runPortfolioMC(portfolio, n = 1500) {
  const paths = [];
  for (let sim = 0; sim < n; sim++) {
    let value = 1.0;
    const yearlyValues = [1.0];
    for (let year = 1; year <= 5; year++) {
      let yearReturn = 0;
      for (const holding of portfolio) {
        const u1 = Math.random(), u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const annualIRR = holding.expectedIRR + 0.15 * z;
        const distressed = Math.random() < holding.pd12m * (year / 2);
        const contrib = distressed ? -holding.weight * 0.6 : holding.weight * annualIRR;
        yearReturn += contrib;
      }
      value = value * (1 + yearReturn);
      yearlyValues.push(Math.max(0, value));
    }
    paths.push(yearlyValues);
  }

  const getPercentile = (arr, p) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * p)];
  };

  const chartData = [0, 1, 2, 3, 4, 5].map(year => {
    const vals = paths.map(p => p[year]);
    return {
      year: year === 0 ? "Now" : `Y${year}`,
      p10: +(getPercentile(vals, 0.10) * 100).toFixed(1),
      p25: +(getPercentile(vals, 0.25) * 100).toFixed(1),
      p50: +(getPercentile(vals, 0.50) * 100).toFixed(1),
      p75: +(getPercentile(vals, 0.75) * 100).toFixed(1),
      p90: +(getPercentile(vals, 0.90) * 100).toFixed(1),
    };
  });

  const pd = paths.filter(p => p[5] < 0.5).length / n;
  return { chartData, pd, n };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E1020] border border-white/10 rounded-xl p-3 text-xs space-y-1">
      <p className="text-white/50 font-semibold mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-white">{p.value}¢</span>
        </div>
      ))}
      <p className="text-white/25 pt-1">per $1 invested</p>
    </div>
  );
}

function HoldingCard({ holding, index, total }) {
  return (
    <div className="w-full flex-shrink-0 px-2">
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 h-full">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${holding.color} flex items-center justify-center text-white font-black text-lg shadow-xl flex-shrink-0`}>
            {holding.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-black text-lg">{holding.name}</h3>
              <span className="text-xs bg-white/[0.06] border border-white/10 text-white/50 px-2 py-0.5 rounded-full">{holding.stage}</span>
            </div>
            <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{holding.sector}</span>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-white/30 uppercase">Allocation</p>
            <p className="text-2xl font-black text-cyan-400">{(holding.weight * 100).toFixed(0)}%</p>
          </div>
        </div>

        <p className="text-xs text-white/40 leading-relaxed mb-5">{holding.description}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Expected IRR", value: `${Math.round(holding.expectedIRR * 100)}%`, color: "text-cyan-400" },
            { label: "12M PD", value: `${Math.round(holding.pd12m * 100)}%`, color: holding.pd12m < 0.12 ? "text-emerald-400" : "text-amber-400" },
            { label: "RAR", value: `${(holding.rar * 100).toFixed(1)}%`, color: "text-cyan-300" },
          ].map(m => (
            <div key={m.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-white/25 uppercase tracking-wide">{m.label}</p>
              <p className={`font-black text-sm mt-0.5 ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <Link
          to={createPageUrl("StartupDetail") + "?id=" + holding.id}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          View Full Profile <ArrowRight className="w-3 h-3" />
        </Link>

        <p className="text-[10px] text-white/20 mt-3 text-center">{index + 1} of {total}</p>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const params = new URLSearchParams(window.location.search);
  const minIRR = parseFloat(params.get("minIRR") || "0.25");
  const maxPD = parseFloat(params.get("maxPD") || "0.20");
  const risk = parseInt(params.get("risk") || "3");

  const portfolio = useMemo(() => buildPortfolio(STARTUPS, { minIRR, maxPD, risk }), [minIRR, maxPD, risk]);
  const [mcResult, setMcResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [slide, setSlide] = useState(0);
  const hasRun = useRef(false);

  const runMC = () => {
    setRunning(true);
    setTimeout(() => {
      setMcResult(runPortfolioMC(portfolio));
      setRunning(false);
    }, 80);
  };

  useEffect(() => {
    if (!hasRun.current) { hasRun.current = true; runMC(); }
  }, []);

  const weightedIRR = portfolio.reduce((acc, h) => acc + h.weight * h.expectedIRR, 0);
  const weightedPD = portfolio.reduce((acc, h) => acc + h.weight * h.pd12m, 0);
  const portfolioRAR = weightedIRR * (1 - weightedPD);

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex">
      <Sidebar currentPage="Portfolio" />

      <main className="flex-1 lg:ml-60 pb-24 lg:pb-0">
        <div className="border-b border-white/5 px-6 md:px-10 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Personalized</p>
            <h1 className="text-2xl font-black tracking-tight">Your Optimal Portfolio</h1>
            <p className="text-white/40 text-sm mt-1">5 picks tailored to your investor profile.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Profile chips */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-white/[0.04] border border-white/8 text-white/50 px-3 py-1.5 rounded-full">
                Min IRR ≥ {Math.round(minIRR * 100)}%
              </span>
              <span className="text-xs bg-white/[0.04] border border-white/8 text-white/50 px-3 py-1.5 rounded-full">
                Max PD ≤ {Math.round(maxPD * 100)}%
              </span>
              <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-full">
                {RISK_LABELS[risk - 1]}
              </span>
            </div>
            <Link
              to={createPageUrl("InvestorProfile")}
              className="flex items-center gap-1.5 text-xs bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, label: "Weighted IRR", value: `${Math.round(weightedIRR * 100)}%`, color: "text-cyan-400" },
              { icon: ShieldCheck, label: "Weighted PD", value: `${(weightedPD * 100).toFixed(1)}%`, color: weightedPD < 0.12 ? "text-emerald-400" : "text-amber-400" },
              { icon: PieChart, label: "Portfolio RAR", value: `${(portfolioRAR * 100).toFixed(1)}%`, color: "text-cyan-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Carousel */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" /> Portfolio Holdings
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSlide(s => Math.max(0, s - 1))}
                  disabled={slide === 0}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/8 flex items-center justify-center hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {portfolio.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${i === slide ? "bg-cyan-400 w-4" : "bg-white/20 w-1.5"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setSlide(s => Math.min(portfolio.length - 1, s + 1))}
                  disabled={slide === portfolio.length - 1}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/8 flex items-center justify-center hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300"
                style={{ transform: `translateX(-${slide * 100}%)` }}
              >
                {portfolio.map((holding, i) => (
                  <HoldingCard key={holding.id} holding={holding} index={i} total={portfolio.length} />
                ))}
              </div>
            </div>
          </div>

          {/* Allocation bar */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold mb-4">Allocation Breakdown</h2>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              {portfolio.map(h => (
                <div
                  key={h.id}
                  className={`bg-gradient-to-r ${h.color}`}
                  style={{ width: `${h.weight * 100}%` }}
                  title={`${h.name}: ${(h.weight * 100).toFixed(0)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {portfolio.map(h => (
                <div key={h.id} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-sm bg-gradient-to-br ${h.color}`} />
                  <span className="text-xs text-white/50">{h.name}</span>
                  <span className="text-xs font-bold text-white/70">{(h.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monte Carlo */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Monte Carlo Projection (5-Year)
              </h2>
              <button
                onClick={runMC}
                disabled={running}
                className="flex items-center gap-1.5 text-xs bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${running ? "animate-spin" : ""}`} /> Re-run
              </button>
            </div>
            <p className="text-xs text-white/30 mb-5">
              {mcResult?.n?.toLocaleString()} simulated portfolio paths — P10 (bear) through P90 (bull) scenarios.
            </p>

            {mcResult ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={mcResult.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="year" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}¢`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", paddingTop: "12px" }} />
                    <Line type="monotone" dataKey="p90" name="P90 (Bull)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="p75" name="P75" stroke="#22d3ee" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="p50" name="P50 (Median)" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="p25" name="P25" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="p10" name="P10 (Bear)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Median 5Y Return</p>
                    <p className="text-lg font-black text-violet-400">
                      {mcResult.chartData[5]?.p50 ? `${mcResult.chartData[5].p50}¢` : "—"}
                    </p>
                    <p className="text-[10px] text-white/20">per $1 invested</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Portfolio Distress Risk</p>
                    <p className={`text-lg font-black ${mcResult.pd < 0.15 ? "text-emerald-400" : "text-amber-400"}`}>
                      {(mcResult.pd * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-white/20">% paths ending below 50¢</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-white/30">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Running simulation...
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link
              to={createPageUrl("MatchResults") + `?minIRR=${minIRR}&maxPD=${maxPD}&risk=${risk}`}
              className="flex items-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] text-white/60 hover:text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all"
            >
              View All Matches
            </Link>
            <Link
              to={createPageUrl("InvestorProfile")}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-black px-5 py-3 rounded-xl transition-all"
            >
              Adjust My Profile <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <MobileNav currentPage="Portfolio" />
      <AIChatbot />
    </div>
  );
}
