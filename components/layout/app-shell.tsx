"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import {
  ChromeExtensionModal,
  EXTENSION_SEEN_KEY,
} from "@/components/onboarding/chrome-extension-modal";
import { ProductTour } from "@/components/onboarding/product-tour";

function ChromeExtensionGate() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [extensionOpen, setExtensionOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function maybeShowExtension() {
      let alreadySeen = false;
      try {
        alreadySeen = localStorage.getItem(EXTENSION_SEEN_KEY) === "1";
      } catch {
        alreadySeen = false;
      }

      const forceShow = searchParams.get("extension") === "1";
      if (alreadySeen && !forceShow) return;

      try {
        const res = await fetch("/api/tracked-searches");
        if (!res.ok) return;
        const data = (await res.json()) as { tracked_searches?: unknown[] };
        const hasAlerts = (data.tracked_searches?.length ?? 0) > 0;
        if (!cancelled && hasAlerts) {
          setExtensionOpen(true);
        }
      } catch {
        // ignore
      }
    }

    void maybeShowExtension();
    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname]);

  function clearExtensionQuery() {
    if (searchParams.get("extension") !== "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("extension");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <ChromeExtensionModal
      open={extensionOpen}
      onOpenChange={setExtensionOpen}
      onDismiss={clearExtensionQuery}
    />
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      <MobileNav />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden h-full min-h-0 md:block md:shrink-0">
          <Sidebar />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="container mx-auto max-w-7xl p-4 pb-8 md:p-6 md:pb-10 lg:p-8 lg:pb-12">
            {children}
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <ChromeExtensionGate />
      </Suspense>
      <ProductTour />
    </div>
  );
}
