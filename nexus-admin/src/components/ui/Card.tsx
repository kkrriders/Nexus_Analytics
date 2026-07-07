import { clsx } from "@/lib/clsx";
import { Icon } from "./Icon";

type CardProps = { children: React.ReactNode; className?: string };

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("bg-white border border-outline-variant rounded-[14px] elevation-card transition-all duration-200", className)}>
      {children}
    </div>
  );
}

type CardHeaderProps = { title: string; icon?: string; action?: React.ReactNode; className?: string };

export function CardHeader({ title, icon, action, className }: CardHeaderProps) {
  return (
    <div className={clsx("flex items-center justify-between border-b border-outline-variant/60 pb-4 mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-8 h-8 rounded-[10px] bg-primary/8 flex items-center justify-center shrink-0">
            <Icon name={icon} className="text-primary text-[17px]" />
          </div>
        )}
        <h3 className="text-[17px] font-semibold text-on-surface">{title}</h3>
      </div>
      {action}
    </div>
  );
}
