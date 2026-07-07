"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { Icon } from "@/components/ui/Icon";
import { adminNav, type NavItem } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-label-md transition-colors duration-150 group",
        active
          ? "text-primary font-bold border-l-4 border-primary bg-secondary-container/20 rounded-l-none"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
      )}
    >
      <Icon name={item.icon} fill={active} className={clsx("text-[20px]", !active && "group-hover:text-primary")} />
      <span>{item.label}</span>
    </Link>
  );
}

/**
 * Admin Console shell. Standalone app, separately deployed/hosted from the
 * main analytics workspace (nexus-analytics) — dedicated admin navigation,
 * an "Admin" badge, a return-to-workspace link (points at NEXT_PUBLIC_APP_URL
 * since this app has no /dashboard route of its own), and a sign-out action.
 * Route access itself is gated by middleware.ts.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [account, setAccount] = useState<{ email: string; fullName: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("users").select("full_name").eq("id", data.user.id).single();
      setAccount({ email: data.user.email ?? "", fullName: profile?.full_name ?? null });
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebar = (
    <>
      <div className="px-margin-desktop pt-margin-desktop pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center">
            <Icon name="admin_panel_settings" fill className="text-[22px]" />
          </div>
          <div>
            <h1 className="text-headline-md font-black text-on-surface tracking-tight">Nexus Admin</h1>
            <p className="text-label-caps text-on-surface-variant uppercase tracking-wider">Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-1">
        {adminNav.map((item) => (
          <AdminNavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={() => setDrawerOpen(false)} />
        ))}

        <div className="mt-8 pt-4 border-t border-outline-variant/30">
          <a
            href={`${APP_URL}/dashboard`}
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            <span>Back to Workspace</span>
          </a>
        </div>
      </nav>

      <div className="p-6 mt-auto border-t border-outline-variant/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-md">
            {(account?.fullName ?? account?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-on-surface truncate">{account?.fullName || "Admin"}</p>
            <p className="text-label-md text-on-surface-variant truncate">{account?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 border border-outline-variant text-on-surface text-label-md py-2 rounded-lg hover:bg-surface-container-low transition-colors"
        >
          <Icon name="logout" className="text-[18px]" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-on-surface">
      {/* Desktop rail */}
      <aside className="hidden md:flex flex-col bg-surface-container-low w-[280px] h-screen fixed left-0 top-0 border-r border-outline-variant z-50">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <div className={clsx("md:hidden fixed inset-0 z-50 transition-opacity", drawerOpen ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
        <aside className={clsx("absolute left-0 top-0 h-full w-[280px] bg-surface-container-low border-r border-outline-variant flex flex-col transition-transform duration-200", drawerOpen ? "translate-x-0" : "-translate-x-full")}>
          {sidebar}
        </aside>
      </div>

      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        {/* Admin top bar */}
        <header className="bg-surface h-16 fixed top-0 right-0 left-0 md:left-[280px] z-40 flex items-center justify-between px-gutter border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="md:hidden text-on-surface-variant hover:text-primary" aria-label="Open navigation">
              <Icon name="menu" />
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/40 text-on-error-container text-label-caps uppercase tracking-wider">
              <Icon name="shield" className="text-[14px]" /> Admin Mode
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
              <input type="search" placeholder="Search admin…" className="pl-9 pr-4 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-full text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-56" />
            </div>
            <button className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant relative">
              <Icon name="notifications" className="text-[20px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
            </button>
          </div>
        </header>

        <main className="flex-1 mt-16 p-margin-mobile md:p-margin-desktop max-w-[1440px] mx-auto w-full space-y-gutter">
          {children}
        </main>
      </div>
    </div>
  );
}
