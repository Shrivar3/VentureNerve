export default function MetricCard({ label, value, sub, highlight, intent }) {
  const intentColors = {
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-rose-400",
    neutral: "text-white",
  };
  const color = intentColors[intent] || "text-white";

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
      <p className="text-xs text-white/35 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-black ${highlight ? color : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}
