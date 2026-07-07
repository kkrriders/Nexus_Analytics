import { clsx } from "@/lib/clsx";

type IconProps = {
  name: string;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
};

export function Icon({ name, className, fill, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={clsx("material-symbols-outlined leading-none", fill && "fill", className)}
    >
      {name}
    </span>
  );
}
