import type { Metadata } from "next";
import LiveCreatives from "@/components/dashboard/LiveCreatives";

export const metadata: Metadata = { title: "Creative Analytics" };

export default function CreativeAnalyticsPage() {
  return <LiveCreatives />;
}
