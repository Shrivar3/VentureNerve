import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, SlidersHorizontal, Target, FlaskConical, Briefcase } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", page: "Landing" },
  { icon: SlidersHorizontal, label: "Profile", page: "InvestorProfile" },
  { icon: Target, label: "Matches", page: "MatchResults" },
  { icon: Briefcase, label: "Portfolio", page: "Portfolio" },
  { icon: FlaskConical, label: "Method", page: "Methodology" },
];

export default function MobileNav({ currentPage }) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0D18]/95 backdrop-blur-xl border-t border-white/5 flex">
      {navItems.map(({ icon: Icon, label, page }) => {
        const active = currentPage === page;
        return (
          <Link
            key={page}
            to={createPageUrl(page)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-all ${
              active ? "text-cyan-400" : "text-white/30 hover:text-white/60"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
