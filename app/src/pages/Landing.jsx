import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, TrendingUp, Shield, Zap, BarChart2, Users, ChevronRight, Quote, CheckCircle, Lock, Globe } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { label: "Active Startups", value: "2,400+" },
  { label: "Capital Deployed", value: "$1.8B" },
  { label: "Avg. IRR Matched", value: "34%" },
  { label: "Investor Profiles", value: "12,000+" },
];

const features = [
  {
    icon: TrendingUp,
    title: "Risk-Adjusted Returns",
    desc: "We rank every startup by RAR — Expected IRR weighted against real probability of distress. No more gut-feel investing.",
  },
  {
    icon: Shield,
    title: "Distress Probability Scoring",
    desc: "Our 12-month PD model draws on macro signals, cash runway, and sector fragility to surface hidden risks.",
  },
  {
    icon: Zap,
    title: "Real-Time Matching",
    desc: "Set your return floor and risk ceiling. VentureNerve instantly surfaces your top matches from our curated pipeline.",
  },
  {
    icon: BarChart2,
    title: "Stress-Test Visualizations",
    desc: "See how each startup performs under base, stress, and severe scenarios before you commit a single dollar.",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "General Partner, Apex Ventures",
    avatar: "SC",
    color: "from-cyan-400 to-blue-600",
    quote: "VentureNerve cut our deal-screening time by 60%. The RAR score gives us an apples-to-apples comparison we've never had before.",
  },
  {
    name: "Marcus Okafor",
    role: "Family Office CIO, Okafor Capital",
    avatar: "MO",
    color: "from-purple-400 to-violet-600",
    quote: "The stress-test charts alone justify the subscription. We caught two high-PD deals our analysts had flagged as 'strong buys'.",
  },
  {
    name: "Priya Nair",
    role: "Founding Partner, Meridian Fund",
    avatar: "PN",
    color: "from-emerald-400 to-teal-600",
    quote: "Finally a platform that speaks the language of quantitative risk management. Our LP reporting has never been cleaner.",
  },
];

const pricingPlans = [
  {
    name: "Explorer",
    price: "Free",
    desc: "For individuals exploring venture",
    features: ["5 matches per month", "Basic RAR scoring", "Startup summaries"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$299",
    period: "/mo",
    desc: "For active angel investors",
    features: ["Unlimited matches", "Full stress-test charts", "PD model detail", "Export to PDF", "Priority support"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Institutional",
    price: "Custom",
    desc: "For funds & family offices",
    features: ["API access", "White-label reports", "Portfolio analytics", "Dedicated analyst", "SLA guarantee"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const trustedLogos = ["Sequoia", "a16z", "Y Combinator", "Bessemer", "Accel", "Tiger Global"];

export default function Landing() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="min-h-screen bg-[#07080F] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#07080F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">VentureNerve</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
          </div>
          <Link
            to={createPageUrl("InvestorProfile")}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/6 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 30 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              Quantitative Venture Matching
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Invest with{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                precision.
              </span>
              <br />
              Not with hope.
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
              VentureNerve matches investors with high-potential startups using Risk-Adjusted Return
              scores — balancing expected IRR against real probability of distress.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={createPageUrl("InvestorProfile")}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-base transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
              >
                Build My Profile <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how"
                className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-white/70 hover:text-white px-8 py-4 rounded-xl text-base transition-all"
              >
                See How It Works
              </a>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5"
          >
            {stats.map((s) => (
              <div key={s.label} className="bg-[#07080F] px-6 py-6 text-center">
                <div className="text-3xl font-black text-white mb-1">{s.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-12 px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-white/20 uppercase tracking-widest mb-8">Trusted by analysts at leading firms</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
            {trustedLogos.map((name) => (
              <span key={name} className="text-white/20 font-black text-sm tracking-tight hover:text-white/40 transition-colors cursor-default">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* RAR Formula Explainer */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">The Science</p>
            <h2 className="text-4xl font-black tracking-tight">One number that changes everything</h2>
            <p className="text-white/40 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              RAR distills two key dimensions of a venture opportunity into a single comparable score.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 mb-10">
              <div className="text-center">
                <div className="text-5xl font-black text-white mb-2">IRR</div>
                <div className="text-xs text-white/35 uppercase tracking-widest">Expected Return</div>
                <div className="text-xs text-white/20 mt-1">How much you stand to gain</div>
              </div>
              <div className="text-4xl font-black text-white/20">×</div>
              <div className="text-center">
                <div className="text-5xl font-black text-white mb-2">(1 − PD)</div>
                <div className="text-xs text-white/35 uppercase tracking-widest">Survival Probability</div>
                <div className="text-xs text-white/20 mt-1">Likelihood of actually getting there</div>
              </div>
              <div className="text-4xl font-black text-cyan-400">=</div>
              <div className="text-center bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-8 py-5">
                <div className="text-5xl font-black text-cyan-400 mb-2">RAR</div>
                <div className="text-xs text-cyan-400/60 uppercase tracking-widest">Risk-Adjusted Return</div>
                <div className="text-xs text-white/20 mt-1">Your real expected upside</div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 border-t border-white/5 pt-8">
              {[
                { label: "High IRR, Low PD", rar: "Strong ✓", example: "42% × (1−8%) = 38.6%", color: "text-emerald-400" },
                { label: "High IRR, High PD", rar: "Risky ⚠", example: "63% × (1−21%) = 49.8%", color: "text-amber-400" },
                { label: "Moderate IRR, Very Low PD", rar: "Solid ✓", example: "31% × (1−5%) = 29.5%", color: "text-cyan-400" },
              ].map((ex) => (
                <div key={ex.label} className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-xs text-white/35 mb-2">{ex.label}</p>
                  <p className="font-mono text-sm text-white/60">{ex.example}</p>
                  <p className={`text-xs font-bold mt-2 ${ex.color}`}>{ex.rar}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">The Method</p>
            <h2 className="text-4xl font-black tracking-tight">Three steps to your best deal</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Set Your Parameters", desc: "Define your minimum IRR target, maximum distress tolerance, investment horizon, and check size." },
              { step: "02", title: "Our Engine Scores", desc: "We compute RAR = Expected IRR × (1 − PD) for every startup in our pipeline and rank them against your profile." },
              { step: "03", title: "Explore Your Matches", desc: "Dive deep into your top matches with stress-test charts, fragility scores, team profiles, and comparable exits." },
            ].map((item) => (
              <div key={item.step} className="group relative bg-white/[0.03] border border-white/5 hover:border-cyan-500/20 rounded-2xl p-7 transition-all hover:bg-white/[0.05]">
                <div className="text-5xl font-black text-white/5 mb-4 group-hover:text-cyan-500/10 transition-colors">{item.step}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Platform</p>
            <h2 className="text-4xl font-black tracking-tight">Built for serious capital allocators</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-5 bg-white/[0.03] border border-white/5 rounded-2xl p-7 hover:border-white/10 transition-all">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1.5">{f.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Social Proof</p>
            <h2 className="text-4xl font-black tracking-tight">What investors are saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white/[0.03] border border-white/5 rounded-2xl p-7 flex flex-col gap-5 hover:border-white/10 transition-all">
                <Quote className="w-6 h-6 text-cyan-500/40" />
                <p className="text-white/60 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-white/35">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="text-4xl font-black tracking-tight">Simple, transparent pricing</h2>
            <p className="text-white/40 mt-3 text-sm">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 flex flex-col transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-b from-cyan-500/10 to-blue-600/5 border border-cyan-500/25"
                    : "bg-white/[0.03] border border-white/5 hover:border-white/10"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-black px-3 py-1 rounded-full tracking-wide">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-black text-lg mb-1">{plan.name}</h3>
                  <p className="text-xs text-white/35 mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="text-white/35 text-sm">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/55">
                      <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={createPageUrl("InvestorProfile")}
                  className={`w-full text-center py-3 rounded-xl text-sm font-bold transition-all ${
                    plan.highlight
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                      : "bg-white/[0.05] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security/Trust strip */}
      <section className="py-12 px-6 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {[
              { icon: Lock, label: "SOC 2 Type II" },
              { icon: Shield, label: "256-bit Encryption" },
              { icon: Globe, label: "GDPR Compliant" },
              { icon: CheckCircle, label: "SEC Registered" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-white/30 hover:text-white/50 transition-colors">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/15 rounded-3xl p-12">
            <Users className="w-10 h-10 text-cyan-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4">Ready to find your edge?</h2>
            <p className="text-white/50 mb-8 text-lg">Set your investment parameters and let VentureNerve surface your highest-conviction opportunities.</p>
            <Link
              to={createPageUrl("InvestorProfile")}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-base transition-all"
            >
              Build My Investor Profile <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold text-sm">VentureNerve</span>
              </div>
              <p className="text-white/25 text-xs max-w-xs leading-relaxed">Quantitative venture matching for serious capital allocators. Powered by risk-adjusted return science.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-xs text-white/35">
              <div className="space-y-2">
                <p className="font-semibold text-white/50 mb-3">Product</p>
                <a href="#features" className="block hover:text-white/60 transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-white/60 transition-colors">Pricing</a>
                <a href="#how" className="block hover:text-white/60 transition-colors">How It Works</a>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-white/50 mb-3">Company</p>
                <span className="block cursor-default">About</span>
                <span className="block cursor-default">Blog</span>
                <span className="block cursor-default">Careers</span>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-white/50 mb-3">Legal</p>
                <span className="block cursor-default">Privacy</span>
                <span className="block cursor-default">Terms</span>
                <span className="block cursor-default">Disclosures</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-xs">© 2026 VentureNerve, Inc. All rights reserved.</p>
            <p className="text-white/15 text-xs text-center">For illustrative purposes only. Not financial advice. Past performance is not indicative of future results.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
