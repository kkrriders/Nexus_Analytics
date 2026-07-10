import type { Metadata } from "next";
import LiveSpend from "@/components/dashboard/LiveSpend";

export const metadata: Metadata = { title: "Spend Analytics" };

export default function SpendAnalyticsPage() {
  return <LiveSpend />;
}
