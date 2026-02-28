import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import { ArrowRight, Info } from "lucide-react";
import AIChatbot from "../components/chatbot/AIChatbot";

function Slider({ label, min, max, step, value, onChange, format, hint }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-white/80">{label}</label>
          {hint && (
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-white/25 hover:text-white/60 cursor-pointer transition-colors" />
              <div className="absolute left-6 top-0 w-56 bg-[#1A1D2E] border border-white/10 rounded-xl p-3 text-xs text-white/50 leading-relaxed invisible group-hover:visible z-50 shadow-2xl">
                {hint}
              </div>
            </div>
          )}
        </div>
        <span className="text-sm font-black text-cyan-400 tabular-nums">{format(value)}</span>
      </div>
      <div className="relative h-2 bg-white/[0.06] rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)] pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-white/20">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

const RISK_LABELS = ["Conservative", "Moderate", "Balanced", "Growth", "Aggressive"];

export default function InvestorProfile() {
  const navigate = useNavigate();
  const [minIRR, setMinIRR] = useState(0.25);
  const [maxPD, setMaxPD] = useState(0.20);
  const [riskTolerance, setRiskTolerance] = useState(3);

  const handleFind = () => {
    const params = new URLSearchParams({
      minIRR: minIRR.toString(),
      maxPD: maxPD.toString(),
      risk: riskTolerance.toString(),
    });
    navigate(createPageUrl("MatchResults") + "?" + params.toString());
  };

  const handlePortfolio = () => {
    const params = new URLSearchParams({
      minIRR: minIRR.toString(),
      maxPD: maxPD.toString(),
      risk: riskTolerance.toString(),
    });
    navigate(createPageUrl("Portfolio") + "?" + params.toString());
  };

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex">
      <Sidebar currentPage="InvestorProfile" />

      <main className="flex-1 lg:ml-60 pb-24 lg:pb-0">
        {/* Header */}
        <div className="border-b border-white/5 px-6 md:px-10 py-6">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Step 1 of 2</p>
          <h1 className="text-2xl font-black tracking-tight">Your Investor Profile</h1>
          <p className="text-white/40 text-sm mt-1">Define your return requirements and risk appetite.</p>
        </div>

        <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 space-y-10">
          {/* Return Requirements */}
          <section>
            <h2 className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-6">Return Requirements</h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-7 space-y-8">
              <Slider
                label="Minimum IRR Target"
                min={0.05}
                max={0.70}
                step={0.01}
                value={minIRR}
                onChange={setMinIRR}
                format={(v) => `${Math.round(v * 100)}%`}
                hint="The lowest acceptable internal rate of return for any investment."
              />
            </div>
          </section>

          {/* Risk Constraints */}
          <section>
            <h2 className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-6">Risk Constraints</h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-7 space-y-8">
              <Slider
                label="Max 12-Month Distress Probability"
                min={0.02}
                max={0.50}
                step={0.01}
                value={maxPD}
                onChange={setMaxPD}
                format={(v) => `${Math.round(v * 100)}%`}
                hint="Maximum tolerable probability that a startup enters financial distress within 12 months."
              />
            </div>
          </section>

          {/* Risk Tolerance */}
          <section>
            <h2 className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-6">Risk Appetite</h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-7 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white/80">Risk Tolerance</label>
                <span className="text-sm font-black text-cyan-400">{RISK_LABELS[riskTolerance - 1]}</span>
              </div>
              <div className="flex gap-2">
                {RISK_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setRiskTolerance(i + 1)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                      riskTolerance === i + 1
                        ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                        : "bg-white/[0.03] border border-white/5 text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                This influences how heavily we weight upside potential vs. downside protection in our matching algorithm.
              </p>
            </div>
          </section>

          {/* RAR Preview */}
          <div className="bg-gradient-to-br from-cyan-500/8 to-blue-600/8 border border-cyan-500/15 rounded-2xl p-6">
            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-3">Your Filter Summary</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Min IRR", value: `≥ ${Math.round(minIRR * 100)}%` },
                { label: "Max PD", value: `≤ ${Math.round(maxPD * 100)}%` },
                { label: "Risk Style", value: RISK_LABELS[riskTolerance - 1] },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xs text-white/35 mb-1">{item.label}</p>
                  <p className="text-lg font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleFind}
              className="flex-1 flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl text-base transition-all shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]"
            >
              Find My Matches <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handlePortfolio}
              className="flex-1 flex items-center justify-center gap-3 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white font-black py-4 rounded-xl text-base transition-all"
            >
              Build My Portfolio <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      <MobileNav currentPage="InvestorProfile" />
      <AIChatbot />
    </div>
  );
}
