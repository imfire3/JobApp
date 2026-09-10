"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function Sidebar() {
  const pathname = usePathname();

  function handleSignOut() {
    try {
      for (const key of [
        "jobtracker-theme",
        "jobtracker_extension_seen",
        "jobapp_product_welcome_v1",
        "jobapp_product_guide_v2",
        "jobapp_product_guide_seen",
        "jobapp_product_guide_done",
      ]) {
        localStorage.removeItem(key)
      }
      sessionStorage.clear()
    } catch {
      // ignore
    }
    // Same path as Reset → LP: clear cookies server-side and land on /
    window.location.assign("/api/auth/reset-local")
  }

  return (
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight">JobTracker</p>
          <p className="text-base text-muted-foreground">Recherche d’emploi</p>
        </div>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="mb-3 rounded-lg border bg-background/50 p-3">
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Matching & lettres IA
          </div>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">
            Importe des offres, compare avec ton CV, génère des lettres.
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
