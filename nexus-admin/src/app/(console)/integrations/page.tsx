import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "API & Integrations" };

const KPIS = [
  { label: "Active Connections", value: "12", icon: "cable", iconWrap: "bg-secondary-fixed/50 text-primary", pill: { label: "All Healthy", icon: "check_circle", tone: "text-tertiary bg-tertiary-fixed-dim/20" } },
  { label: "API Requests (24h)", value: "1.2M", icon: "swap_horiz", iconWrap: "bg-surface-container text-on-surface-variant", pill: { label: "4.2%", icon: "arrow_upward", tone: "text-error" } },
  { label: "Failing Endpoints", value: "0", icon: "warning", iconWrap: "bg-error-container/50 text-error", note: "Requires attention" },
];

const PLATFORMS = [
  { initial: "G", color: "text-primary", name: "Google Ads API", meta: "MCC Account ID: 123-456-7890 • Last synced 5 mins ago", transferred: "450GB Transferred", next: "Next sync in 10m" },
  { initial: "M", color: "text-[#0668E1]", name: "Meta Business Graph", meta: "Business ID: 9876543210 • Last synced 12 mins ago", transferred: "820GB Transferred", next: "Next sync in 3m" },
];

const KEYS = [
  { label: "Main Web App", expiry: "Expires in 89 days", value: "sk_live_1234567890abcdef" },
  { label: "Data Pipeline Script", expiry: "Never expires", value: "sk_live_0987654321zyxwv" },
];

const WEBHOOKS = ["Conversion Events", "Lead Sync"];

export default function AdminIntegrationsPage() {
  return (
    <>
      <div className="flex items-center gap-2 text-on-surface-variant text-label-md mb-2">
        <span>Admin</span>
        <Icon name="chevron_right" className="text-[16px]" />
        <span className="text-primary font-semibold">API &amp; Integrations</span>
      </div>

      <PageHeader
        title="Data Sources & Credentials"
        subtitle="Manage connections to external ad platforms and internal systems. Ensure valid credentials for uninterrupted data synchronization."
        actions={
          <>
            <Button icon="sync">Sync All Now</Button>
            <Button variant="primary" icon="add">New Integration</Button>
          </>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {KPIS.map((k) => (
          <Card key={k.label} className="p-card-padding">
            <div className="flex items-start justify-between mb-2">
              <span className="text-label-md text-on-surface-variant">{k.label}</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${k.iconWrap}`}>
                <Icon name={k.icon} className="text-[18px]" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-display-kpi text-on-surface">{k.value}</span>
              {k.pill && (
                <span className={`text-label-md flex items-center gap-1 mb-2 px-2 py-0.5 rounded-full ${k.pill.tone}`}>
                  <Icon name={k.pill.icon} className="text-[14px]" /> {k.pill.label}
                </span>
              )}
              {k.note && <span className="text-label-md text-on-surface-variant mb-2">{k.note}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Bento: platforms + credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter pb-margin-desktop">
        {/* Connected platforms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-md text-on-surface">Connected Platforms</h3>
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-lg p-1">
              <button className="px-3 py-1 bg-surface text-on-surface shadow-sm rounded-md text-label-md">All</button>
              <button className="px-3 py-1 text-on-surface-variant hover:text-on-surface rounded-md text-label-md">Ad Networks</button>
              <button className="px-3 py-1 text-on-surface-variant hover:text-on-surface rounded-md text-label-md">CRMs</button>
            </div>
          </div>

          {PLATFORMS.map((p) => (
            <Card key={p.name} className="p-card-padding hover:border-primary/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30">
                    <span className={`font-bold text-[20px] ${p.color}`}>{p.initial}</span>
                  </div>
                  <div>
                    <h4 className="text-body-md font-semibold text-on-surface flex items-center gap-2">
                      {p.name}
                      <span className="bg-tertiary-fixed-dim/20 text-tertiary text-[10px] px-2 py-0.5 rounded-full border border-tertiary/20">Connected</span>
                    </h4>
                    <p className="text-label-md text-on-surface-variant mt-1">{p.meta}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container" title="Settings">
                    <Icon name="settings" className="text-[20px]" />
                  </button>
                  <button className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container" title="Disconnect">
                    <Icon name="link_off" className="text-[20px]" />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-6 text-label-md text-on-surface-variant">
                  <span className="flex items-center gap-1"><Icon name="data_usage" className="text-[16px] text-tertiary" /> {p.transferred}</span>
                  <span className="flex items-center gap-1"><Icon name="schedule" className="text-[16px]" /> {p.next}</span>
                </div>
                <button className="text-primary text-label-md hover:underline">View Logs</button>
              </div>
            </Card>
          ))}
        </div>

        {/* API credentials + webhooks */}
        <div className="space-y-6">
          <h3 className="text-headline-md text-on-surface">API Credentials</h3>
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <span className="text-body-md font-semibold">Production Keys</span>
              <button className="text-primary hover:text-primary-container"><Icon name="add_circle" className="text-[20px]" /></button>
            </div>
            <div className="p-4 space-y-4">
              {KEYS.map((k, i) => (
                <div key={k.label} className="space-y-2">
                  {i > 0 && <hr className="border-outline-variant/30 -mt-2 mb-2" />}
                  <div className="flex justify-between items-center">
                    <span className="text-label-md text-on-surface-variant">{k.label}</span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">{k.expiry}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input className="flex-1 bg-surface-container-highest border border-outline-variant rounded px-3 py-1.5 text-body-sm font-mono text-on-surface-variant focus:outline-none" readOnly type="password" defaultValue={k.value} />
                    <button className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Copy">
                      <Icon name="content_copy" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Webhook listeners */}
          <div className="bg-inverse-surface text-inverse-on-surface rounded-xl p-card-padding">
            <h4 className="text-body-md font-semibold flex items-center gap-2 mb-4">
              <Icon name="dns" className="text-tertiary-fixed-dim" /> Webhook Listeners
            </h4>
            <div className="space-y-3">
              {WEBHOOKS.map((w) => (
                <div key={w} className="flex justify-between text-body-sm">
                  <span className="text-surface-variant">{w}</span>
                  <span className="text-tertiary-fixed-dim flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim inline-block" /> Online
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
