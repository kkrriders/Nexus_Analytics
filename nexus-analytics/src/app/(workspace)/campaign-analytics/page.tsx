import type { Metadata } from "next";
import LiveCampaigns from "@/components/dashboard/LiveCampaigns";

export const metadata: Metadata = { title: "Campaign Analytics" };

export default function CampaignAnalyticsPage() {
  return <LiveCampaigns />;
}
