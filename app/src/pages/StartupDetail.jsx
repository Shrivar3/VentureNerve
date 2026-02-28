import { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import MetricCard from "../components/ui/MetricCard";
import StressTestChart from "../components/charts/StressTestChart";
import { STARTUPS, computeRAR } from "../components/mockData";
import { ArrowLeft, TrendingUp, Shield, Activity, Mail, Linkedin, Globe, Phone, MapPin, User } from "lucide-react";
import AIChatbot from "../components/chatbot/AIChatbot";

function ScoreBar({ value, max = 100, label, low = 25, high = 60 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value <= low ? "from-emerald-500 to-teal-500" : value <= high ? "from-amber-500 to-yellow-500" : "from-rose-500 to-red-600";
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-white/40">{label}</span>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function StartupDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const startup = useMemo(() => STARTUPS.find((s) => s.id === id), [id]);

  if (!startup) {
    return (
      <div className="min-h-screen bg-[#07080F] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Startup not found.</p>
          <Link to={createPageUrl("MatchResults")} className="text-cyan-400 hover:underline text-sm">
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const rar = computeRAR(startup);
  const irrIntent = startup.expectedIRR >= 0.40 ? "good" : startup.expectedIRR >= 0.25 ? "warn" : "bad";
  const pdIntent = startup.pd12m <= 0.10 ? "good" : startup.pd12m <= 0.20 ? "warn" : "bad";

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex">
      <Sidebar currentPage="MatchResults" />

      <main className="flex-1 lg:ml-60 pb-24 lg:pb-0">
        {/* Header */}
        <div className="border-b border-white/5 px-6 md:px-10 py-5 flex items-center gap-4">
          <Link
            to={createPageUrl("MatchResults")}
            className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-white/10">/</span>
          <span className="text-sm text-white/50">{startup.name}</span>
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
          {/* Hero card */}
          <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-8">
            <div className={`absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${startup.color} opacity-[0.07] blur-3xl pointer-events-none`} />
            <div className="relative flex flex-wrap items-start gap-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${startup.color} flex items-center justify-center text-white font-black text-xl shadow-2xl`}>
                {startup.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black tracking-tight">{startup.name}</h1>
                  <span className="text-xs bg-white/[0.06] border border-white/10 text-white/50 px-3 py-1 rounded-full font-semibold">{startup.stage}</span>
                  <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-semibold">{startup.sector}</span>
                </div>
                <p className="text-white/45 text-sm leading-relaxed max-w-xl">{startup.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {startup.tags.map((t) => (
                    <span key={t} className="text-xs text-white/30 bg-white/[0.04] border border-white/8 px-2.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              {/* RAR Badge */}
              <div className="text-center bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-6 py-5">
                <p className="text-xs text-cyan-400/70 uppercase tracking-widest mb-1">RAR Score</p>
                <p className="text-4xl font-black text-cyan-400">{(rar * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-white/25 mt-1">IRR × (1 − PD)</p>
              </div>
            </div>
          </div>

          {/* Key metrics grid */}
          <div>
            <h2 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-4">Key Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Expected IRR"
                value={`${Math.round(startup.expectedIRR * 100)}%`}
                sub="Internal Rate of Return"
                highlight
                intent={irrIntent}
              />
              <MetricCard
                label="12M Distress PD"
                value={`${Math.round(startup.pd12m * 100)}%`}
                sub="Probability of Distress"
                highlight
                intent={pdIntent}
              />
              <MetricCard
                label="ARR Growth"
                value={`${startup.arrGrowth}%`}
                sub="Year-over-Year"
                highlight
                intent={startup.arrGrowth >= 150 ? "good" : startup.arrGrowth >= 80 ? "warn" : "bad"}
              />
              <MetricCard
                label="Cash Runway"
                value={`${startup.runway}mo`}
                sub="Months remaining"
                highlight
                intent={startup.runway >= 24 ? "good" : startup.runway >= 14 ? "warn" : "bad"}
              />
            </div>
          </div>

          {/* Risk Profile */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" /> Risk Profile
              </h2>
              <ScoreBar
                label="Fragility Score (lower = better)"
                value={startup.fragilityScore}
                max={100}
                low={25}
                high={50}
              />
              <ScoreBar
                label="Revenue Concentration (% from top customer)"
                value={startup.revenueConcentration}
                max={100}
                low={30}
                high={55}
              />
              <div className="pt-2 border-t border-white/5 text-xs text-white/30 leading-relaxed space-y-1">
                <p>
                  <span className="text-emerald-400 font-semibold">Fragility score</span> measures sensitivity to macro shocks across cash runway, sector volatility, and team concentration.
                </p>
                <p>
                  <span className="text-amber-400 font-semibold">Revenue concentration</span> above 50% signals key-customer risk.
                </p>
              </div>
            </div>

            {/* Scenario legend */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-cyan-400" /> Scenario Snapshot
              </h2>
              <div className="space-y-3">
                {[
                  { scenario: "Base", data: startup.stressTest.base, desc: "Current trajectory" },
                  { scenario: "Stress", data: startup.stressTest.stress, desc: "Macro headwinds, funding crunch" },
                  { scenario: "Severe", data: startup.stressTest.severe, desc: "Recession + sector downturn" },
                ].map(({ scenario, data, desc }) => (
                  <div key={scenario} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-bold">{scenario}</p>
                      <p className="text-xs text-white/30">{desc}</p>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[10px] text-white/25 uppercase">IRR</p>
                        <p className={`text-sm font-black ${data.irr >= 0.20 ? "text-cyan-400" : data.irr >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                          {data.irr >= 0 ? "+" : ""}{Math.round(data.irr * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/25 uppercase">PD</p>
                        <p className={`text-sm font-black ${data.pd <= 0.15 ? "text-emerald-400" : data.pd <= 0.35 ? "text-amber-400" : "text-rose-400"}`}>
                          {Math.round(data.pd * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stress Test Chart */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Stress-Test Chart
            </h2>
            <p className="text-xs text-white/30 mb-6">
              IRR and Probability of Distress across Base, Stress, and Severe scenarios.
            </p>
            <StressTestChart stressTest={startup.stressTest} />
          </div>

          {/* Contact Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-cyan-400" /> Contact & Reach Out
            </h2>
            <div className="flex flex-wrap items-start gap-6">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${startup.color} flex items-center justify-center text-white font-black text-lg shadow-xl flex-shrink-0`}>
                {startup.contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-lg">{startup.contact.name}</p>
                <p className="text-xs text-white/40 mb-4">{startup.contact.role} · {startup.name}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: Mail, label: startup.contact.email, href: `mailto:${startup.contact.email}` },
                    { icon: Phone, label: startup.contact.phone, href: `tel:${startup.contact.phone}` },
                    { icon: Globe, label: startup.contact.website, href: startup.contact.website },
                    { icon: MapPin, label: startup.contact.location, href: null },
                  ].map(({ icon: Icon, label, href }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-white/55 hover:text-cyan-400 transition-colors truncate">
                          {label}
                        </a>
                      ) : (
                        <span className="text-xs text-white/40 truncate">{label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <a
                  href={`mailto:${startup.contact.email}?subject=Investment Inquiry — ${startup.name}`}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </a>
                <a
                  href={startup.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] text-white/70 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* Back CTA */}
          <Link
            to={createPageUrl("MatchResults")}
            className="flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all matches
          </Link>
        </div>
      </main>

      <MobileNav currentPage="MatchResults" />
      <AIChatbot />
    </div>
  );
}
