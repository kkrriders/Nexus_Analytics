import { AdminShell } from "@/components/shell/AdminShell";

/**
 * Layout for authenticated admin pages. The `(console)` route group keeps these
 * routes at /, /users, /integrations while leaving /login outside the admin shell.
 * Route protection is enforced by middleware.ts.
 */
export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
