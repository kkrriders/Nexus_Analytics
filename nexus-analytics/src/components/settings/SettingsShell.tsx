"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { clsx } from "@/lib/clsx";
import { ProfilePanel } from "./ProfilePanel";
import { BillingPanel } from "./BillingPanel";
import { IntegrationsPanel } from "./IntegrationsPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { SecurityPanel } from "./SecurityPanel";

const TABS = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "billing", label: "Billing & Subscription", icon: "credit_card" },
  { id: "integrations", label: "Integrations", icon: "cable" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "security", label: "Security", icon: "shield_lock" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsShell() {
  const [active, setActive] = useState<TabId>("profile");

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <nav className="w-full md:w-60 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-label-md font-medium whitespace-nowrap transition-colors",
              active === tab.id
                ? "bg-primary/8 text-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
            )}
          >
            <Icon name={tab.icon} className="text-[18px]" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 w-full min-w-0">
        {active === "profile" && <ProfilePanel />}
        {active === "billing" && <BillingPanel />}
        {active === "integrations" && <IntegrationsPanel />}
        {active === "notifications" && <NotificationsPanel />}
        {active === "security" && <SecurityPanel />}
      </div>
    </div>
  );
}
