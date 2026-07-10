"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { createClient } from "@/lib/supabase/client";
import { syncAccount } from "@/lib/api";

type Account = {
  id: string;
  plan: "google" | "meta" | "both";
  google_ads: { connected?: boolean };
  meta_ads: { connected?: boolean };
  subscription_status: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
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

function PlatformRow({ label, letter, color, connected }: { label: string; letter: string; color: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/30 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-[13px]"
          style={{ background: color }}
        >
          {letter}
        </div>
        <span className="text-body-sm font-medium text-on-surface">{label}</span>
      </div>
      {connected ? (
        <Badge tone="tertiary" icon="check_circle">Connected</Badge>
      ) : (
        <Badge tone="neutral" icon="link_off">Not connected</Badge>
      )}
    </div>
  );
}

export function IntegrationsPanel() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const loadAccount = useCallback(async () => {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setAccount(null);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/accounts/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setAccount(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load account status.");
      setAccount(null);
    }
  }, [apiUrl]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  const handleSync = useCallback(async () => {
    setSyncing(true); setSyncError(null);
    try {
      await syncAccount();
      await loadAccount();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [loadAccount]);

  return (
    <Card className="p-card-padding">
      <CardHeader
        title="Connected Ad Accounts"
        icon="cable"
        action={
          <Link href="/plans" className="text-label-md text-primary hover:underline">
            {account ? "Update keys" : "Connect an account"}
          </Link>
        }
      />

      {account === undefined && (
        <p className="text-body-sm text-on-surface-variant py-6 text-center">Loading connection status…</p>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mb-4 text-body-sm">
          <Icon name="error" className="text-[18px] mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {account === null && !error && (
        <div className="text-center py-8">
          <p className="text-body-sm text-on-surface-variant mb-3">
            No ad account is connected yet. Data on your dashboard is running from the sample demo pipeline.
          </p>
          <Link href="/plans" className="text-label-md text-primary hover:underline">
            Connect Google or Meta Ads →
          </Link>
        </div>
      )}

      {account && (
        <>
          <div>
            <PlatformRow label="Google Ads" letter="G" color="#4285F4" connected={!!account.google_ads?.connected} />
            <PlatformRow label="Meta Ads" letter="M" color="#0866FF" connected={!!account.meta_ads?.connected} />
          </div>

          <div className="mt-4 pt-4 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-2 text-label-md text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Icon name="schedule" className="text-[16px]" /> Last synced {timeAgo(account.last_synced_at)}
            </span>
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  "inline-flex items-center gap-1",
                  account.subscription_status === "active" ? "text-tertiary" : "text-on-surface-variant",
                )}
              >
                <span className={clsx("w-1.5 h-1.5 rounded-full", account.subscription_status === "active" ? "bg-tertiary" : "bg-outline")} />
                {account.subscription_status === "active" ? "Subscription active" : account.subscription_status}
              </span>
              <Button icon="sync" onClick={handleSync} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync Now"}
              </Button>
            </div>
          </div>

          {syncError && (
            <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mt-3 text-body-sm">
              <Icon name="error" className="text-[18px] mt-0.5" />
              <span>Sync failed: {syncError}</span>
            </div>
          )}

          {account.last_sync_error && (
            <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 mt-3 text-body-sm">
              <Icon name="warning" className="text-[18px] mt-0.5" />
              <span>Last sync error: {account.last_sync_error}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
