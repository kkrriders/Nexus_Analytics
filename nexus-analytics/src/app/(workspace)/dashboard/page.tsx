import type { Metadata } from "next";
import LiveDashboard from "@/components/dashboard/LiveDashboard";

export const metadata: Metadata = { title: "Executive Dashboard" };

export default function DashboardPage() {
  return <LiveDashboard />;
}
