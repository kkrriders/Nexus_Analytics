"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Icon } from "@/components/ui/Icon";
import { fetchAdminUsers, fetchAdminIntegrations, fetchAdminNotifications } from "@/lib/api";

const QUICK_LINKS = [
  { href: "/users", icon: "manage_accounts", title: "User Management", desc: "Roles, invitations and workspace access." },
  { href: "/integrations", icon: "api", title: "API & Integrations", desc: "Connections, keys and webhook health." },
];

const LEVEL_ICON: Record<string, string> = { critical: "gpp_maybe", warning: "warning", info: "info" };
const LEVEL_TONE: Record<string, string> = {
  critical: "bg-error-container/50 text-error",
  warning: "bg-tertiary-container/20 text-tertiary",
  info: "bg-secondary-container/15 text-secondary",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminOverviewPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAdminUsers().catch(() => []),
      fetchAdminIntegrations().catch(() => []),
      fetchAdminNotifications().catch(() => ({ notifications: [] })),
    ]).then(([u, i, n]) => {
      setUsers(u ?? []);
      setIntegrations(i ?? []);
      setActivity(n?.notifications ?? []);
      setLoading(false);
    });
  }, []);

  const activeConnections = integrations.reduce((sum: number, a: any) =>
    sum + (a.google_ads?.connected ? 1 : 0) + (a.meta_ads?.connected ? 1 : 0), 0);
  const failingCount = integrations.filter((a: any) => a.last_sync_error).length;
  const activeUsers = users.filter((u: any) => u.is_active).length;

  const KPIS = [
    { label: "Total Users",    value: loading ? "—" : String(users.length),      change: "—", direction: "flat" as const, icon: "group",      accent: "indigo"  as const },
    { label: "Active Users",   value: loading ? "—" : String(activeUsers),       change: "—", direction: "flat" as const, icon: "how_to_reg", accent: "emerald" as const },
    { label: "Integrations",   value: loading ? "—" : String(activeConnections), change: failingCount > 0 ? `${failingCount} failing` : "Healthy", direction: failingCount > 0 ? "down" as const : "flat" as const, icon: "cable", accent: "blue" as const },
    { label: "Sync Failures",  value: loading ? "—" : String(failingCount),      change: "—", direction: failingCount > 0 ? "down" as const : "flat" as const, icon: "gpp_maybe", accent: "rose" as const },
  ];

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
          {activity.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant py-4 text-center">No recent activity.</p>
          ) : (
            <ul className="space-y-4">
              {activity.slice(0, 6).map((a: any) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${LEVEL_TONE[a.level] ?? LEVEL_TONE.info}`}>
                    <Icon name={LEVEL_ICON[a.level] ?? "info"} className="text-[16px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm text-on-surface">{a.title}</p>
                    <p className="text-label-md text-on-surface-variant">{timeAgo(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
