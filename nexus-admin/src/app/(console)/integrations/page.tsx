"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { fetchAdminIntegrations, syncAllAdminIntegrations, syncAdminIntegration, disconnectAdminIntegration } from "@/lib/api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Platform = "google_ads" | "meta_ads";
type PlatformInfo = { connected: boolean; token_preview: string | null };
type Integration = {
  account_id: string;
  owner_email: string;
  owner_name: string | null;
  plan: string;
  subscription_status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  google_ads: PlatformInfo;
  meta_ads: PlatformInfo;
};

const PLATFORM_META: Record<Platform, { label: string; initial: string; color: string }> = {
  google_ads: { label: "Google Ads", initial: "G", color: "text-primary" },
  meta_ads: { label: "Meta Ads", initial: "M", color: "text-[#0668E1]" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIntegrations(await fetchAdminIntegrations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await syncAllAdminIntegrations();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync all failed.");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncOne = async (accountId: string) => {
    setSyncingId(accountId);
    try {
      await syncAdminIntegration(accountId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (accountId: string, platform: Platform) => {
    if (!window.confirm(`Disconnect ${PLATFORM_META[platform].label} for this account? They'll need to reconnect it from Settings.`)) return;
    try {
      await disconnectAdminIntegration(accountId, platform);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    }
  };

  const connections = integrations.flatMap((account) =>
    (["google_ads", "meta_ads"] as Platform[])
      .filter((p) => account[p].connected)
      .filter((p) => platformFilter === "all" || platformFilter === p)
      .map((p) => ({ account, platform: p }))
  );

  const activeCount = connections.length;
  const failingCount = integrations.filter((a) => a.last_sync_error).length;

  const KPIS = [
    { label: "Active Connections", value: String(activeCount), icon: "cable", iconWrap: "bg-secondary-fixed/50 text-primary" },
    { label: "Connected Accounts", value: String(integrations.length), icon: "group", iconWrap: "bg-surface-container text-on-surface-variant" },
    { label: "Sync Failures", value: String(failingCount), icon: "warning", iconWrap: "bg-error-container/50 text-error", note: failingCount > 0 ? "Requires attention" : "All healthy" },
  ];

  return (
    <>
      <div className="flex items-center gap-2 text-on-surface-variant text-label-md mb-2">
        <span>Admin</span>
        <Icon name="chevron_right" className="text-[16px]" />
        <span className="text-primary font-semibold">API &amp; Integrations</span>
      </div>

      <PageHeader
        title="Data Sources & Credentials"
        subtitle="Manage connections to external ad platforms across every account. Credentials are shown masked and can only be viewed in full by the connected user."
        actions={
          <>
            <Button icon="sync" onClick={handleSyncAll} disabled={syncingAll}>{syncingAll ? "Syncing…" : "Sync All Now"}</Button>
            <a href={`${APP_URL}/setup`}>
              <Button variant="primary" icon="add">Connect a Platform</Button>
            </a>
          </>
        }
      />

      {error && (
        <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 text-body-sm">
          <Icon name="error" className="text-[18px] mt-0.5" />
          <span>{error}</span>
        </div>
      )}

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
              {k.note && <span className="text-label-md text-on-surface-variant mb-2">{k.note}</span>}
            </div>
          </Card>
        ))}
      </div>

      <div className="pb-margin-desktop">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-headline-md text-on-surface">Connected Platforms</h3>
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-lg p-1">
            {(["all", "google_ads", "meta_ads"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={clsx("px-3 py-1 rounded-md text-label-md transition-colors",
                  platformFilter === p ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
              >
                {p === "all" ? "All" : PLATFORM_META[p].label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">Loading integrations…</p>
        ) : connections.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">No connected platforms{platformFilter !== "all" ? ` for ${PLATFORM_META[platformFilter].label}` : ""} yet.</p>
        ) : (
          <div className="space-y-4">
            {connections.map(({ account, platform }) => {
              const info = account[platform];
              const meta = PLATFORM_META[platform];
              const isSyncing = syncingId === account.account_id;
              const logKey = `${account.account_id}-${platform}`;
              return (
                <Card key={logKey} className="p-card-padding hover:border-primary/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30">
                        <span className={`font-bold text-[20px] ${meta.color}`}>{meta.initial}</span>
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface flex items-center gap-2">
                          {meta.label}
                          <span className="bg-tertiary-fixed-dim/20 text-tertiary text-[10px] px-2 py-0.5 rounded-full border border-tertiary/20">Connected</span>
                          {account.last_sync_error && (
                            <span className="bg-error-container text-error text-[10px] px-2 py-0.5 rounded-full border border-error/20">Sync Error</span>
                          )}
                        </h4>
                        <p className="text-label-md text-on-surface-variant mt-1">
                          {account.owner_name || account.owner_email} · Token {info.token_preview ?? "—"} · Last synced {timeAgo(account.last_synced_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {platform === "meta_ads" && (
                        <button
                          onClick={() => handleSyncOne(account.account_id)}
                          disabled={isSyncing}
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container disabled:opacity-50"
                          title="Sync now"
                        >
                          <Icon name="sync" className={clsx("text-[20px]", isSyncing && "animate-spin")} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(account.account_id, platform)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container"
                        title="Disconnect"
                      >
                        <Icon name="link_off" className="text-[20px]" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-label-md text-on-surface-variant">Plan: {account.plan} · {account.subscription_status}</span>
                    <button onClick={() => setExpandedLog(expandedLog === logKey ? null : logKey)} className="text-primary text-label-md hover:underline">
                      {expandedLog === logKey ? "Hide Logs" : "View Logs"}
                    </button>
                  </div>
                  {expandedLog === logKey && (
                    <div className="mt-3 p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-body-sm">
                      {account.last_sync_error ? (
                        <span className="text-error">{account.last_sync_error}</span>
                      ) : (
                        <span className="text-on-surface-variant">No sync errors recorded.</span>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
