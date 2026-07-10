import type { Metadata } from "next";
import LiveBudgetOptimizer from "@/components/dashboard/LiveBudgetOptimizer";

export const metadata: Metadata = { title: "Budget Optimizer" };

export default function BudgetOptimizerPage() {
  return <LiveBudgetOptimizer />;
}
