import { Shell } from "@/components/shell/Shell";
import { DashboardPrefsProvider } from "@/lib/dashboardPrefs";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPrefsProvider>
      <Shell>{children}</Shell>
    </DashboardPrefsProvider>
  );
}
