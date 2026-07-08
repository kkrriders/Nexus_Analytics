import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: string;
  size?: "sm" | "md";
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   "bg-primary text-white hover:bg-[#4338CA] shadow-sm",
  secondary: "bg-surface-bright border border-outline-variant text-on-surface hover:bg-surface-container-low shadow-sm",
};

const SIZES = {
  sm: "px-3 py-1.5 text-[12px] rounded-[8px]",
  md: "px-4 py-2 text-[14px] rounded-[10px]",
};

export function Button({ variant = "secondary", icon, size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-2 font-medium transition-all duration-150 active:scale-[0.97]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} className="text-[16px]" />}
      {children}
    </button>
  );
}
