import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Admin Overview" };

const KPIS = [
  { label: "Total Users",    value: "1,248", change: "12%",     direction: "up"   as const, icon: "group",      accent: "indigo"  as const },
  { label: "Active (30d)",   value: "982",   change: "4%",      direction: "up"   as const, icon: "how_to_reg", accent: "emerald" as const },
  { label: "Integrations",   value: "12",    change: "Healthy", direction: "flat" as const, icon: "cable",      accent: "blue"    as const },
  { label: "Security Alerts",value: "2",     change: "Action",  direction: "down" as const, icon: "gpp_maybe",  accent: "rose"    as const },
];

const QUICK_LINKS = [
  { href: "/users", icon: "manage_accounts", title: "User Management", desc: "Roles, invitations and workspace access." },
  { href: "/integrations", icon: "api", title: "API & Integrations", desc: "Connections, keys and webhook health." },
];

const ACTIVITY = [
  { icon: "person_add", tone: "bg-secondary-container/15 text-secondary", text: "Invited d.chen@nexus.co as Editor", time: "10 min ago" },
  { icon: "shield", tone: "bg-primary-container/15 text-primary", text: "Elena Smith promoted to Admin", time: "2 hours ago" },
  { icon: "key", tone: "bg-tertiary-container/20 text-tertiary", text: "New production API key generated", time: "Yesterday" },
  { icon: "gpp_maybe", tone: "bg-error-container/50 text-error", text: "Unusual sign-in flagged for review", time: "2 days ago" },
];

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader
        title="Admin Overview"
        subtitle="Platform health, access control and integration status at a glance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter pb-margin-desktop">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-gutter">
          {QUICK_LINKS.map((q) => (
            <Link key={q.href} href={q.href}>
              <Card className="p-card-padding h-full hover:border-primary/50 hover:shadow-md transition-all flex flex-col">
                <div className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center mb-4">
                  <Icon name={q.icon} className="text-[22px]" />
                </div>
                <h3 className="text-headline-md text-on-surface mb-1">{q.title}</h3>
                <p className="text-body-sm text-on-surface-variant flex-1">{q.desc}</p>
                <span className="text-label-md text-primary flex items-center gap-1 mt-4">
                  Manage <Icon name="arrow_forward" className="text-[16px]" />
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="p-card-padding">
          <CardHeader title="Recent Activity" icon="history" />
          <ul className="space-y-4">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${a.tone}`}>
                  <Icon name={a.icon} className="text-[16px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm text-on-surface">{a.text}</p>
                  <p className="text-label-md text-on-surface-variant">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
