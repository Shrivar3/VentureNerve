import { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import { STARTUPS, rankStartups } from "../components/mockData";
import { ArrowRight, Trophy, SlidersHorizontal, AlertTriangle } from "lucide-react";
import AIChatbot from "../components/chatbot/AIChatbot";

const rankColors = ["from-amber-400 to-yellow-600", "from-slate-300 to-slate-500", "from-amber-700 to-amber-900"];
const rankLabels = ["#1 Best Match", "#2 Strong Match", "#3 Good Match"];

function RarBar({ value, max }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function MatchResults() {
  const params = new URLSearchParams(window.location.search);
  const minIRR = parseFloat(params.get("minIRR") || "0.25");
  const maxPD = parseFloat(params.get("maxPD") || "0.20");
  const risk = parseInt(params.get("risk") || "3");

  const ranked = useMemo(() => rankStartups(STARTUPS, { minIRR, maxPD, risk }), [minIRR, maxPD]);
  const top3 = ranked.slice(0, 3);
  const maxRAR = top3.length > 0 ? top3[0].rar : 1;

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex">
      <Sidebar currentPage="MatchResults" />

      <main className="flex-1 lg:ml-60 pb-24 lg:pb-0">
        {/* Header */}
        <div className="border-b border-white/5 px-6 md:px-10 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Step 2 of 2</p>
            <h1 className="text-2xl font-black tracking-tight">Your Top Matches</h1>
            <p className="text-white/40 text-sm mt-1">
              Ranked by Risk-Adjusted Return — IRR × (1 − PD)
            </p>
          </div>
          <Link
            to={createPageUrl("InvestorProfile")}
            className="flex items-center gap-2 bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] text-white/60 hover:text-white text-sm px-4 py-2 rounded-lg transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" /> Adjust Profile
          </Link>
        </div>

        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { label: "Min IRR", val: `≥ ${Math.round(minIRR * 100)}%` },
              { label: "Max PD", val: `≤ ${Math.round(maxPD * 100)}%` },
              { label: "Matches", val: `${ranked.length} of ${STARTUPS.length}` },
            ].map((c) => (
              <span key={c.label} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/8 text-xs text-white/50 px-3 py-1.5 rounded-full">
                <span className="text-white/25">{c.label}:</span>
                <span className="font-semibold text-white/70">{c.val}</span>
              </span>
            ))}
          </div>

          {/* No results */}
          {top3.length === 0 && (
            <div className="text-center py-24 border border-white/5 rounded-2xl bg-white/[0.02]">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No matches found</h3>
              <p className="text-white/40 text-sm mb-6">Try relaxing your IRR floor or raising your PD ceiling.</p>
              <Link
                to={createPageUrl("InvestorProfile")}
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl text-sm"
              >
                Adjust My Profile
              </Link>
            </div>
          )}

          {/* Match cards */}
          <div className="space-y-4">
            {top3.map((startup, idx) => (
              <Link
                key={startup.id}
                to={createPageUrl("StartupDetail") + "?id=" + startup.id}
                className="block group"
              >
                <div className="bg-white/[0.03] border border-white/5 hover:border-cyan-500/25 hover:bg-white/[0.05] rounded-2xl p-6 transition-all">
                  <div className="flex items-start gap-5">
                    {/* Rank badge */}
                    <div className="flex-shrink-0 text-center">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rankColors[idx]} flex items-center justify-center`}>
                        {idx === 0 ? <Trophy className="w-5 h-5 text-black" /> : <span className="text-sm font-black text-black">{idx + 1}</span>}
                      </div>
                    </div>

                    {/* Logo + name */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${startup.color} flex items-center justify-center text-white font-black text-sm`}>
                        {startup.logo}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className="font-black text-lg leading-tight">{startup.name}</h3>
                          <p className="text-xs text-white/35 mt-0.5">{startup.stage} · {startup.sector}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white/30 mb-0.5">RAR Score</p>
                          <p className="text-xl font-black text-cyan-400">{(startup.rar * 100).toFixed(1)}%</p>
                        </div>
                      </div>

                      <RarBar value={startup.rar} max={maxRAR} />

                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {[
                          { label: "Expected IRR", value: `${Math.round(startup.expectedIRR * 100)}%` },
                          { label: "12M Distress PD", value: `${Math.round(startup.pd12m * 100)}%` },
                          { label: "ARR Growth", value: `${startup.arrGrowth}%` },
                        ].map((m) => (
                          <div key={m.label} className="bg-white/[0.03] rounded-xl px-3 py-2.5 text-center">
                            <p className="text-[10px] text-white/30 uppercase tracking-wide">{m.label}</p>
                            <p className="font-black text-sm text-white mt-0.5">{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Tags + CTA */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                        <div className="flex flex-wrap gap-1.5">
                          {startup.tags.map((t) => (
                            <span key={t} className="text-[10px] text-white/40 bg-white/[0.04] border border-white/8 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold group-hover:gap-2.5 transition-all">
                          View Detail <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rank label */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/20">{rankLabels[idx]} — {startup.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Other startups that didn't qualify */}
          {ranked.length < STARTUPS.length && (
            <div className="mt-8 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
              <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-3">Outside Your Filters</p>
              <div className="space-y-2">
                {STARTUPS.filter((s) => !ranked.find((r) => r.id === s.id)).map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white text-[10px] font-black`}>
                        {s.logo}
                      </div>
                      <span className="text-sm text-white/40">{s.name}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-white/25">
                      <span>IRR {Math.round(s.expectedIRR * 100)}%</span>
                      <span>PD {Math.round(s.pd12m * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileNav currentPage="MatchResults" />
      <AIChatbot />
    </div>
  );
}
