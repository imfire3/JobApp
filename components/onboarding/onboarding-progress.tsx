"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type ExtractionProgressProps = {
  active: boolean
  label?: string
  className?: string
}

/** Soft advancing bar while AI extracts the CV profile (caps at 90% until done). */
export function ExtractionProgress({
  active,
  label = "Extraction du profil depuis ton CV…",
  className,
}: ExtractionProgressProps) {
  const [percent, setPercent] = useState(8)

  useEffect(() => {
    if (!active) {
      setPercent(8)
      return
    }

    setPercent(12)
    const timer = window.setInterval(() => {
      setPercent((current) => {
        if (current >= 92) return current
        const step = current < 35 ? 9 : current < 60 ? 5 : current < 80 ? 2 : 1
        return Math.min(92, current + step)
      })
    }, 280)

    return () => window.clearInterval(timer)
  }, [active])

  const shown = active ? percent : 100

  return (
    <div className={cn("space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4", className)}>
      <div className="flex items-center justify-between gap-3 text-base">
        <p className="font-medium text-foreground">{label}</p>
        <span className="tabular-nums text-lg font-semibold text-foreground">
          {shown}%
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
            active && "animate-pulse"
          )}
          style={{ width: `${shown}%` }}
        />
      </div>
    </div>
  )
}
