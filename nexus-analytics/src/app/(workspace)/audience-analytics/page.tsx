import type { Metadata } from "next";
import LiveAudience from "@/components/dashboard/LiveAudience";

export const metadata: Metadata = { title: "Audience Analytics" };

export default function AudienceAnalyticsPage() {
  return <LiveAudience />;
}
