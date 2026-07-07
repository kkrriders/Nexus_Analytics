"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function Shell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface text-on-surface">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        <TopNav onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 mt-16 p-margin-mobile md:p-margin-desktop max-w-[1600px] mx-auto w-full space-y-gutter">
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
