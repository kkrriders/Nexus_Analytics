import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

type BadgeTone = "primary" | "neutral";

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: string;
  className?: string;
};

const TONES: Record<BadgeTone, string> = {
  primary: "bg-primary-container/10 text-primary border border-primary-container/20",
  neutral: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
};

/** Low-saturation status / category pill with high-saturation text for legibility. */
export function Badge({ children, tone = "neutral", icon, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-caps",
        TONES[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </span>
  );
}
