export type NavItem = {
  label: string;
  href: string;
  icon: string;
  group?: string;
};

export const workspaceNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", group: "MENU" },
  { label: "Campaign Analytics", href: "/campaign-analytics", icon: "analytics", group: "MENU" },
  { label: "Spend Analytics", href: "/spend-analytics", icon: "account_balance_wallet", group: "MENU" },
  { label: "Audience Analytics", href: "/audience-analytics", icon: "groups", group: "MENU" },
  { label: "Keyword Analytics", href: "/keyword-analytics", icon: "key", group: "MENU" },
  { label: "Creative Analytics", href: "/creative-analytics", icon: "palette", group: "MENU" },
  { label: "Trend Forecasting", href: "/trend-forecasting", icon: "auto_graph", group: "INTELLIGENCE" },
  { label: "AI Recommendations", href: "/ai-recommendations", icon: "psychology", group: "INTELLIGENCE" },
  { label: "Budget Optimizer", href: "/budget-optimizer", icon: "savings", group: "INTELLIGENCE" },
];

export const utilityNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: "settings" },
];
