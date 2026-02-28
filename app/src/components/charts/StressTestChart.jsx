import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#10131F] border border-white/10 rounded-xl px-4 py-3 text-xs shadow-2xl">
      <p className="text-white/50 mb-2 font-semibold">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="font-black text-white">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function StressTestChart({ stressTest }) {
  const data = [
    { scenario: "Base", irr: stressTest.base.irr, pd: stressTest.base.pd },
    { scenario: "Stress", irr: stressTest.stress.irr, pd: stressTest.stress.pd },
    { scenario: "Severe", irr: stressTest.severe.irr, pd: stressTest.severe.pd },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="scenario"
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[-0.15, 0.75]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", paddingTop: "8px" }}
          />
          <Bar dataKey="irr" name="Expected IRR" radius={[5, 5, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.irr >= 0.25 ? "#06b6d4" : entry.irr >= 0.10 ? "#f59e0b" : "#f43f5e"
                }
              />
            ))}
          </Bar>
          <Bar dataKey="pd" name="Distress PD" radius={[5, 5, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.pd <= 0.15 ? "rgba(6,182,212,0.35)" : entry.pd <= 0.35 ? "rgba(245,158,11,0.4)" : "rgba(244,63,94,0.5)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
