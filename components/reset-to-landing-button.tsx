"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

const KNOWN_STORAGE_KEYS = [
  "jobtracker-theme",
  "jobtracker_extension_seen",
  "jobapp_product_welcome_v1",
  "jobapp_product_guide_v2",
  "jobapp_product_guide_seen",
  "jobapp_product_guide_done",
]

/**
 * Fixed bottom-right reset: clears cookies/session/local cache and returns to LP.
 */
export function ResetToLandingButton() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  // Hide on the landing page itself
  if (pathname === "/") return null

  const handleReset = async () => {
    if (loading) return
    const confirmed = window.confirm(
      "Tout réinitialiser (session, cookies, cache) et revenir à l’accueil ?"
    )
    if (!confirmed) return

    setLoading(true)
    try {
      await fetch("/api/auth/reset-local", { method: "POST" }).catch(() => null)

      try {
        for (const key of KNOWN_STORAGE_KEYS) {
          localStorage.removeItem(key)
        }
        // Wipe any other jobapp / jobtracker keys
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

      window.location.href = "/"
    } catch {
      window.location.href = "/"
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100]">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void handleReset()}
        className="pointer-events-auto shadow-lg"
        aria-label="Réinitialiser et revenir à l’accueil"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        {loading ? "Reset…" : "Reset → LP"}
      </Button>
    </div>
  )
}
