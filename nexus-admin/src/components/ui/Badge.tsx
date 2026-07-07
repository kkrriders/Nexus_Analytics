import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

type BadgeTone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "neutral";

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: string;
  className?: string;
};

const TONES: Record<BadgeTone, string> = {
  primary: "bg-primary-container/10 text-primary border border-primary-container/20",
  secondary: "bg-secondary-container/10 text-secondary border border-secondary-container/20",
  tertiary: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/20",
  error: "bg-error-container text-on-error-container border border-error-container",
  neutral:
    "bg-surface-container-high text-on-surface-variant border border-outline-variant",
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
