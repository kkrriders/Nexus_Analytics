import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsShell } from "@/components/settings/SettingsShell";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspace preferences, billing, and notification configuration."
      />
      <SettingsShell />
    </>
  );
}
