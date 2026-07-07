import type { Metadata } from "next";
import LiveRecommendations from "@/components/dashboard/LiveRecommendations";

export const metadata: Metadata = { title: "AI Recommendation Center" };

export default function AiRecommendationsPage() {
  return <LiveRecommendations />;
}
