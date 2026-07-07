export type NavItem = {
  label: string;
  href: string;
  icon: string;
  group?: string;
};

export const adminNav: NavItem[] = [
  { label: "Overview", href: "/", icon: "space_dashboard" },
  { label: "User Management", href: "/users", icon: "manage_accounts" },
  { label: "API Integrations", href: "/integrations", icon: "api" },
];
