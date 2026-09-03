"use client";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      <div className="flex md:min-h-screen">
        <div className="hidden md:sticky md:top-0 md:block md:h-screen md:shrink-0">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1">
          <div className="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
