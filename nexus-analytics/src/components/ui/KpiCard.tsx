import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

type KpiCardProps = {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
  icon: string;
  tooltip?: string;
};

// Icon chip is intentionally one neutral color across every tile — 8 unrelated
// metrics (spend, ROAS, CTR, health...) sharing a decorative rainbow of hues
// carries no real meaning and reads as a template. Color is reserved for the
// delta badge below, where it actually means something (up=good/down=bad).
export function KpiCard({ label, value, change, direction, icon, tooltip }: KpiCardProps) {
  const isUp = direction === "up", isDown = direction === "down";
  const changeColor = isUp ? "text-tertiary" : isDown ? "text-error" : "text-on-surface-variant";
  const changeBg   = isUp ? "bg-tertiary-container" : isDown ? "bg-error-container" : "bg-surface-container";
  const arrow      = isUp ? "arrow_upward"  : isDown ? "arrow_downward" : "remove";

  return (
    <div className="bg-surface-bright border border-outline-variant rounded-[14px] elevation-card transition-all duration-200 overflow-hidden">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-surface-container-high">
            <Icon name={icon} className="text-[20px] text-on-surface-variant" />
          </div>
          <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold", changeBg, changeColor)}>
            <Icon name={arrow} className="text-[10px]" />
            {change}
          </span>
        </div>

        {/* Value */}
        <div
          title={value}
          className="text-[28px] xl:text-[26px] 2xl:text-[30px] font-bold text-on-surface leading-none tracking-tight mb-1 font-mono truncate"
        >
          {value}
        </div>
        <div className="text-[13px] font-medium text-on-surface-variant mb-4 flex items-center gap-1">
          {label}
          {tooltip && (
            <span title={tooltip} className="cursor-help text-outline">
              <Icon name="info" className="text-[13px]" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
