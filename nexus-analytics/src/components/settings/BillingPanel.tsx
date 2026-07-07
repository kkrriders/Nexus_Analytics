"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanKey } from "@/lib/plans";

type Account = {
  plan: PlanKey;
  subscription_status: "active" | "inactive" | "cancelled";
  created_at: string;
};

const STATUS_TONE = {
  active: "tertiary",
  inactive: "neutral",
  cancelled: "error",
} as const;

export function BillingPanel() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setAccount(null); return; }

      try {
        const res = await fetch(`${apiUrl}/api/accounts/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        setAccount(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load billing status.");
        setAccount(null);
      }
    })();
  }, [apiUrl]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-card-padding">
        <CardHeader
          title="Current Plan"
          icon="credit_card"
          action={
            <Link href="/plans">
              <Button variant="primary" size="sm" icon="swap_horiz">
                {account ? "Change plan" : "Choose a plan"}
              </Button>
            </Link>
          }
        />

        {account === undefined && (
          <p className="text-body-sm text-on-surface-variant py-6 text-center">Loading billing status…</p>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-3 text-body-sm mb-4">
            <Icon name="error" className="text-[18px] mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {account === null && !error && (
          <div className="text-center py-8">
            <p className="text-body-sm text-on-surface-variant mb-3">
              You don&apos;t have an active subscription yet.
            </p>
            <Link href="/plans" className="text-label-md text-primary hover:underline">
              View available plans →
            </Link>
          </div>
        )}

        {account && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-[16px]"
                style={{ background: PLANS[account.plan]?.color ?? "#4F46E5" }}
              >
                {PLANS[account.plan]?.letter ?? "N"}
              </div>
              <div>
                <div className="text-body-md font-semibold text-on-surface">{PLANS[account.plan]?.name ?? account.plan}</div>
                <div className="text-body-sm text-on-surface-variant font-mono">
                  Rs{(PLANS[account.plan]?.price ?? 0).toLocaleString("en-IN")} / month
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge tone={STATUS_TONE[account.subscription_status]} icon={account.subscription_status === "active" ? "check_circle" : "info"}>
                {account.subscription_status}
              </Badge>
              <span className="text-body-sm text-on-surface-variant">
                Since {new Date(account.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-card-padding">
        <CardHeader title="Invoice History" icon="receipt_long" />
        <div className="text-center py-8">
          <Icon name="receipt_long" className="text-[32px] text-outline mb-2" />
          <p className="text-body-sm text-on-surface-variant">
            Invoices will appear here once Stripe billing is connected.
          </p>
        </div>
      </Card>
    </div>
  );
}
