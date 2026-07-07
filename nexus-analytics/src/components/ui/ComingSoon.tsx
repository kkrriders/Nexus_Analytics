import { Card } from "./Card";
import { Icon } from "./Icon";

type ComingSoonProps = {
  title: string;
  description: string;
  icon?: string;
};

/** Graceful placeholder for navigation destinations that are not yet built out. */
export function ComingSoon({ title, description, icon = "construction" }: ComingSoonProps) {
  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center min-h-[420px]">
      <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary flex items-center justify-center mb-4">
        <Icon name={icon} className="text-[32px]" />
      </div>
      <h2 className="text-headline-lg text-on-surface mb-2">{title}</h2>
      <p className="text-body-md text-on-surface-variant max-w-md">{description}</p>
      <span className="mt-6 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-label-caps uppercase tracking-wider">
        Coming soon
      </span>
    </Card>
  );
}
