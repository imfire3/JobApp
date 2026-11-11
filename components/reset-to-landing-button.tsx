"use client"

import { usePathname } from "next/navigation"
import { RotateCcw } from "lucide-react"

const KNOWN_STORAGE_KEYS = [
  "jobtracker-theme",
  "jobtracker_extension_seen",
  "jobapp_product_welcome_v1",
  "jobapp_product_guide_v2",
  "jobapp_product_guide_seen",
  "jobapp_product_guide_done",
]

function clearClientStorage() {
  try {
    for (const key of KNOWN_STORAGE_KEYS) {
      localStorage.removeItem(key)
    }
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (/jobapp|jobtracker|product.?guide|extension/i.test(key)) {
        toRemove.push(key)
      }
    }
    for (const key of toRemove) localStorage.removeItem(key)
    sessionStorage.clear()
  } catch {
    // ignore storage errors
  }
}

/**
 * Fixed bottom-right reset: clears session via GET redirect and returns to LP.
 * Uses a real <a href> so navigation works even if JS confirm/handlers fail.
 */
export function ResetToLandingButton() {
  const pathname = usePathname()

  // Hide on the landing page and onboarding. On narrow app screens, the fixed
  // pill can cover filter controls and page content, so keep it desktop-only.
  if (pathname === "/" || pathname.startsWith("/onboarding")) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] hidden md:block">
      <a
        href="/api/auth/reset-local"
        onClick={() => {
          clearClientStorage()
        }}
        className="pointer-events-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-4xl border border-border bg-background px-3 text-base font-medium shadow-lg transition-colors hover:bg-muted"
        aria-label="Réinitialiser et revenir à l’accueil"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset → LP
      </a>
    </div>
  )
}
