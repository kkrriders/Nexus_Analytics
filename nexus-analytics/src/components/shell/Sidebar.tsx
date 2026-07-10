"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { Icon } from "@/components/ui/Icon";
import { workspaceNav, utilityNav, type NavItem } from "@/lib/nav";
import { useAccountConnections } from "@/lib/useAccountConnections";

type SidebarProps = { open?: boolean; onClose?: () => void };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all duration-150 group",
        active
          ? "bg-primary/8 text-primary"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
      )}
    >
      <Icon
        name={item.icon}
        fill={active}
        className={clsx("text-[20px] shrink-0", active ? "text-primary" : "text-outline group-hover:text-on-surface")}
      />
      <span>{item.label}</span>
      {active && <span className="ml-auto w-1.5 h-4 rounded-full bg-primary" />}
    </Link>
  );
}

const intelligenceItems = workspaceNav.filter(i => i.group === "INTELLIGENCE");

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { googleConnected } = useAccountConnections();

  // Keyword Analytics only makes sense for Google Ads — Meta has no keyword auction.
  const menuItems = workspaceNav.filter(i => i.group === "MENU" && (i.href !== "/keyword-analytics" || googleConnected));

  const content = (
    <>
      {/* Brand */}
      <div className="px-5 py-4 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-primary flex items-center justify-center font-bold text-[16px] text-white shrink-0 shadow-sm">N</div>
          <div>
            <h1 className="text-[15px] font-bold text-on-surface leading-tight">Nexus Analytics</h1>
            <p className="text-[11px] text-outline font-medium mt-0.5">Enterprise Edition</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 flex flex-col gap-0.5">
        <p className="px-3 mb-1.5 text-[11px] font-bold text-outline uppercase tracking-[0.1em]">Menu</p>
        {menuItems.map(item => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={onClose} />)}

        <p className="px-3 mt-5 mb-1.5 text-[11px] font-bold text-outline uppercase tracking-[0.1em]">Intelligence</p>
        {intelligenceItems.map(item => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={onClose} />)}

        <div className="mt-auto pt-4">
          <div className="h-px bg-outline-variant mx-1 mb-3" />
          {utilityNav.map(item => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={onClose} />)}
        </div>
      </nav>

      {/* Upgrade */}
      <div className="p-4 border-t border-outline-variant">
        <Link href="/plans" onClick={onClose} className="w-full bg-primary text-white text-[14px] font-semibold py-2.5 px-4 rounded-[10px] hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2 shadow-sm">
          <Icon name="upgrade" className="text-[18px]" />
          Upgrade Plan
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-[280px] h-screen fixed left-0 top-0 bg-surface-bright border-r border-outline-variant z-50">
        {content}
      </aside>
      <div className={clsx("md:hidden fixed inset-0 z-50 transition-opacity duration-200", open ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <aside className={clsx("absolute left-0 top-0 h-full w-[280px] bg-surface-bright border-r border-outline-variant flex flex-col transition-transform duration-200", open ? "translate-x-0" : "-translate-x-full")}>
          {content}
        </aside>
      </div>
    </>
  );
}
