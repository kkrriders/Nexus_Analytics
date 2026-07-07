import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

export type TrendDirection = "up" | "down" | "flat";

type TrendPillProps = {
  direction: TrendDirection;
  value: string;
  className?: string;
};

const STYLES: Record<TrendDirection, { wrap: string; icon: string }> = {
  up:   { wrap: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", icon: "trending_up" },
  down: { wrap: "bg-rose-50 text-rose-600 ring-1 ring-rose-200",         icon: "trending_down" },
  flat: { wrap: "bg-surface-container text-on-surface-variant ring-1 ring-outline-variant/50", icon: "trending_flat" },
};

export function TrendPill({ direction, value, className }: TrendPillProps) {
  const s = STYLES[direction];
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-caps font-bold",
        s.wrap,
        className,
      )}
    >
      <Icon name={s.icon} className="text-[12px]" />
      {value}
    </div>
  );
}
