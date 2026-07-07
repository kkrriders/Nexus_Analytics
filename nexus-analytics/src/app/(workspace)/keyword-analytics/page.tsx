import type { Metadata } from "next";
import LiveKeywords from "@/components/dashboard/LiveKeywords";

export const metadata: Metadata = { title: "Keyword Analytics" };

export default function KeywordAnalyticsPage() {
  return <LiveKeywords />;
}
