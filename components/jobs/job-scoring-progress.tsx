"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export type JobScoringStatus = "queued" | "analyzing" | "done" | "error"

export type JobScoringProgress = {
  status: JobScoringStatus
  progress: number
  error?: string | null
}

export const ANALYZING_STEP_LABELS = [
  "Lecture de l’offre…",
  "Comparaison avec ton CV…",
  "Calcul du score…",
  "Préparation des recommandations…",
] as const

export function analyzingLabelForProgress(progress: number): string {
  const pct = Math.max(0, Math.min(100, progress))
  if (pct < 30) return ANALYZING_STEP_LABELS[0]
  if (pct < 55) return ANALYZING_STEP_LABELS[1]
  if (pct < 75) return ANALYZING_STEP_LABELS[2]
  return ANALYZING_STEP_LABELS[3]
}

type JobScoringProgressBarProps = {
  progress: number
  status: JobScoringStatus
  title: string
  error?: string | null
  label?: string | null
}

export function JobScoringProgressBar({
  progress,
  status,
  title,
  error,
  label,
}: JobScoringProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  const resolvedLabel =
    label?.trim() ||
    (status === "analyzing"
      ? "Analyse du match…"
      : status === "queued"
        ? "En file d’attente…"
        : status === "error"
          ? error || "Analyse impossible"
          : "Analyse terminée")

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-base">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {status === "analyzing" || status === "queued" ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : null}
          <span className="truncate">{resolvedLabel}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{pct}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full border bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Progression de l’analyse pour ${title}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            status === "error" ? "bg-destructive" : "bg-primary"
          } ${status === "analyzing" || status === "queued" ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Soft advancing bar while a job analysis request is in flight (caps at 90% until done). */
export function useAnalyzingProgress(active: boolean): {
  progress: number
  label: string
  status: JobScoringStatus
} {
  const [now, setNow] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!active) {
      const reset = window.requestAnimationFrame(() => {
        setStartedAt(null)
        setNow(0)
      })
      return () => window.cancelAnimationFrame(reset)
    }

    const start = Date.now()
    const kick = window.requestAnimationFrame(() => {
      setStartedAt(start)
      setNow(start)
    })
    const id = window.setInterval(() => setNow(Date.now()), 320)
    return () => {
      window.cancelAnimationFrame(kick)
      window.clearInterval(id)
    }
  }, [active])

  if (!active || startedAt == null) {
    return { progress: 100, label: "Analyse terminée", status: "done" }
  }

  const elapsed = Math.max(0, now - startedAt)
  const ticks = Math.floor(elapsed / 320)
  let progress = 12
  for (let i = 0; i < ticks; i += 1) {
    if (progress >= 90) break
    const step = progress < 30 ? 8 : progress < 55 ? 5 : progress < 75 ? 2 : 1
    progress = Math.min(90, progress + step)
  }
  const stepIndex = Math.min(
    ANALYZING_STEP_LABELS.length - 1,
    Math.floor(elapsed / 2200)
  )

  return {
    progress,
    label: ANALYZING_STEP_LABELS[stepIndex] ?? ANALYZING_STEP_LABELS[0],
    status: "analyzing",
  }
}

type AnalyzingProgressPanelProps = {
  active: boolean
  title?: string
  className?: string
}

export function AnalyzingProgressPanel({
  active,
  title = "cette offre",
  className,
}: AnalyzingProgressPanelProps) {
  const { progress, label, status } = useAnalyzingProgress(active)
  if (!active) return null

  return (
    <div className={className}>
      <JobScoringProgressBar
        progress={progress}
        status={status}
        title={title}
        label={label}
      />
    </div>
  )
}
