"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { Onboarding } from "@/components/product-onboarding/onboarding"
import {
  hasCompletedProductWelcomeLocal,
  markProductWelcomeCompletedLocal,
} from "@/lib/onboarding/product-welcome"

const emptySubscribe = () => () => {}

type WelcomeStatus = "loading" | "show" | "done"

export function ProductWelcomeGate() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [status, setStatus] = useState<WelcomeStatus>("loading")
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!isClient) return

    let cancelled = false

    async function resolve() {
      if (hasCompletedProductWelcomeLocal()) {
        if (!cancelled) setStatus("done")
        return
      }

      try {
        const res = await fetch("/api/welcome")
        if (res.ok) {
          const data = (await res.json()) as {
            completed?: boolean
          }
          if (data.completed) {
            markProductWelcomeCompletedLocal()
            if (!cancelled) setStatus("done")
            return
          }
        }
      } catch {
        // fall through to show when local says not done
      }

      if (!cancelled) setStatus("show")
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [isClient])

  const handleComplete = useCallback(async () => {
    if (completing) return
    setCompleting(true)
    markProductWelcomeCompletedLocal()

    try {
      await fetch("/api/welcome", { method: "POST" })
    } catch {
      // localStorage already marked — OK offline
    }

    setStatus("done")
    setCompleting(false)
  }, [completing])

  if (!isClient || status !== "show") return null

  return <Onboarding onComplete={handleComplete} completing={completing} />
}
