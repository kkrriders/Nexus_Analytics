import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

export type AccentColor = "indigo" | "blue" | "emerald" | "amber" | "rose" | "purple" | "cyan";

const ACCENT: Record<AccentColor, { bg: string; text: string; bar: string; glow: string }> = {
  indigo:  { bg: "bg-[#EEF2FF]", text: "text-[#4F46E5]", bar: "#4F46E5", glow: "rgba(79,70,229,0.15)"  },
  blue:    { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", bar: "#2563EB", glow: "rgba(37,99,235,0.15)"  },
  emerald: { bg: "bg-[#ECFDF5]", text: "text-[#10B981]", bar: "#10B981", glow: "rgba(16,185,129,0.15)" },
  amber:   { bg: "bg-[#FFFBEB]", text: "text-[#F59E0B]", bar: "#F59E0B", glow: "rgba(245,158,11,0.15)" },
  rose:    { bg: "bg-[#FEF2F2]", text: "text-[#EF4444]", bar: "#EF4444", glow: "rgba(239,68,68,0.15)"  },
  purple:  { bg: "bg-[#F5F3FF]", text: "text-[#7C3AED]", bar: "#7C3AED", glow: "rgba(124,58,237,0.15)" },
  cyan:    { bg: "bg-[#ECFEFF]", text: "text-[#06B6D4]", bar: "#06B6D4", glow: "rgba(6,182,212,0.15)"  },
};

type KpiCardProps = {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
  icon: string;
  accent?: AccentColor;
  sparkline?: number[];
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 72, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ label, value, change, direction, icon, accent = "indigo", sparkline }: KpiCardProps) {
  const a = ACCENT[accent];
  const isUp = direction === "up", isDown = direction === "down";
  const changeColor = isUp ? "text-[#10B981]" : isDown ? "text-[#EF4444]" : "text-on-surface-variant";
  const changeBg   = isUp ? "bg-[#ECFDF5]"  : isDown ? "bg-[#FEF2F2]"  : "bg-surface-container";
  const arrow      = isUp ? "arrow_upward"  : isDown ? "arrow_downward" : "remove";

  return (
    <div className="bg-white border border-outline-variant rounded-[14px] elevation-card transition-all duration-200 overflow-hidden">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className={clsx("w-10 h-10 rounded-[10px] flex items-center justify-center", a.bg)}>
            <Icon name={icon} className={clsx("text-[20px]", a.text)} />
          </div>
          <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold", changeBg, changeColor)}>
            <Icon name={arrow} className="text-[10px]" />
            {change}
          </span>
        </div>

        {/* Value */}
        <div className="text-[38px] font-bold text-on-surface leading-none tracking-tight mb-1 font-mono">
          {value}
        </div>
        <div className="text-[13px] font-medium text-on-surface-variant mb-4">{label}</div>

        {/* Sparkline */}
        {sparkline && (
          <div className="flex items-end justify-end">
            <Sparkline data={sparkline} color={a.bar} />
          </div>
        )}
      </div>
    </div>
  );
}
