type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-stack-md">
      <div>
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
