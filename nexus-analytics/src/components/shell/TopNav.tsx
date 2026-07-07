"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";

type TopNavProps = { onMenuClick?: () => void };

export function TopNav({ onMenuClick }: TopNavProps) {
  const router = useRouter();
  const [account, setAccount] = useState<{ email: string; fullName: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("users").select("full_name").eq("id", data.user.id).single();
      setAccount({ email: data.user.email ?? "", fullName: profile?.full_name ?? null });
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = (account?.fullName ?? account?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="bg-white h-16 fixed top-0 right-0 left-0 md:left-[280px] z-40 flex items-center justify-between px-6 border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuClick} className="md:hidden text-on-surface-variant hover:text-primary transition-colors" aria-label="Open navigation">
          <Icon name="menu" />
        </button>
        <span className="md:hidden text-[17px] font-bold text-on-surface">Nexus</span>

        {/* Workspace selector */}
        <button className="hidden md:flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-on-surface hover:bg-surface-container transition-colors">
          <div className="w-4 h-4 rounded bg-primary flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">N</span>
          </div>
          Nexus Workspace
          <Icon name="expand_more" className="text-[14px] text-outline" />
        </button>
      </div>

      <div className="flex-1 mx-6 hidden lg:block max-w-sm">
        <div className="flex items-center bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-[10px] focus-within:border-primary focus-within:bg-white transition-all">
          <Icon name="search" className="text-[17px] text-outline mr-2 shrink-0" />
          <input type="search" placeholder="Search campaigns, metrics, keywords…" className="bg-transparent border-none p-0 text-[13px] focus:ring-0 w-full text-on-surface placeholder:text-outline focus:outline-none" />
          <kbd className="hidden xl:flex items-center gap-0.5 ml-2 px-1.5 py-0.5 bg-white border border-outline-variant rounded text-[10px] font-mono text-outline shrink-0">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Date range */}
        <button className="hidden sm:flex items-center gap-2 bg-white border border-outline-variant px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-on-surface hover:border-primary transition-colors">
          <Icon name="calendar_today" className="text-[15px] text-outline" />
          Last 30 Days
          <Icon name="expand_more" className="text-[14px] text-outline" />
        </button>

        {/* Global filter */}
        <button className="hidden md:flex items-center gap-1.5 bg-white border border-outline-variant px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-on-surface hover:border-primary transition-colors">
          <Icon name="filter_list" className="text-[15px] text-outline" />
          Filters
          <span className="w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
        </button>

        <div className="w-px h-6 bg-outline-variant mx-1" />

        {/* Notifications */}
        <button className="relative p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-[10px] transition-colors">
          <Icon name="notifications" className="text-[20px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white" />
        </button>

        {/* Dark mode toggle */}
        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-[10px] transition-colors" title="Toggle dark mode">
          <Icon name="dark_mode" className="text-[20px]" />
        </button>

        {/* Avatar */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-primary text-white text-[12px] font-bold flex items-center justify-center cursor-pointer border-2 border-white shadow-sm"
            aria-label="Account menu"
          >
            {initial}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-56 bg-white border border-outline-variant rounded-[10px] shadow-lg py-1.5 z-50">
              <div className="px-3 py-2 border-b border-outline-variant">
                <p className="text-[13px] font-medium text-on-surface truncate">{account?.fullName || "Account"}</p>
                <p className="text-[12px] text-on-surface-variant truncate">{account?.email || ""}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <Icon name="logout" className="text-[16px]" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
