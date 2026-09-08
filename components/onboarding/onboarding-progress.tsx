"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const ONBOARDING_STEPS = [
  { id: "cv", label: "CV" },
  { id: "profile", label: "Profil" },
] as const

export type OnboardingProgressStep =
  | (typeof ONBOARDING_STEPS)[number]["id"]
  | "api-keys"

type OnboardingProgressProps = {
  current: OnboardingProgressStep
  className?: string
}

export function OnboardingProgress({ current, className }: OnboardingProgressProps) {
  const normalizedCurrent = current === "api-keys" ? "profile" : current
  const currentIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.id === normalizedCurrent
  )
  const percent = Math.round(((currentIndex + 1) / ONBOARDING_STEPS.length) * 100)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Étape {currentIndex + 1} sur {ONBOARDING_STEPS.length}
          <span className="text-foreground">
            {" "}
            · {ONBOARDING_STEPS[currentIndex]?.label}
          </span>
        </p>
        <span className="tabular-nums text-muted-foreground">{percent}%</span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Progression de l’inscription : étape ${currentIndex + 1} sur ${ONBOARDING_STEPS.length}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="flex gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          return (
            <li
              key={step.id}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                done && "border-primary/40 bg-primary/10 text-foreground",
                active && "border-primary bg-primary/15 text-foreground",
                !done && !active && "border-border text-muted-foreground"
              )}
            >
              {step.label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

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
    if (!active) return

    const timer = window.setInterval(() => {
      setPercent((current) => {
        if (current >= 90) return current
        const step = current < 40 ? 6 : current < 70 ? 3 : 1
        return Math.min(90, current + step)
      })
    }, 400)

    return () => window.clearInterval(timer)
  }, [active])

  const shown = active ? percent : 100

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">{label}</p>
        <span className="tabular-nums text-muted-foreground">{shown}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
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
