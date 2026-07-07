import type { Metadata } from "next";
import LiveForecasting from "@/components/dashboard/LiveForecasting";

export const metadata: Metadata = { title: "Trend Forecasting" };

export default function TrendForecastingPage() {
  return <LiveForecasting />;
}
