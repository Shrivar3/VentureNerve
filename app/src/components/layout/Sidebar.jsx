import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, SlidersHorizontal, Target, Zap, FlaskConical, Briefcase } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", page: "Landing" },
  { icon: SlidersHorizontal, label: "My Profile", page: "InvestorProfile" },
  { icon: Target, label: "Matches", page: "MatchResults" },
  { icon: Briefcase, label: "Portfolio", page: "Portfolio" },
  { icon: FlaskConical, label: "Methodology", page: "Methodology" },
];

export default function Sidebar({ currentPage }) {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0B0D18] border-r border-white/5 fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-base tracking-tight">VentureNerve</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ icon: Icon, label, page }) => {
          const active = currentPage === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom badge */}
      <div className="px-4 py-5 border-t border-white/5">
        <div className="bg-white/[0.03] rounded-xl p-3 text-xs text-white/30 leading-relaxed">
          Mock data — for illustrative purposes only. Not financial advice.
        </div>
      </div>
    </aside>
  );
}
