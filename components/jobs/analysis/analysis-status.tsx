"use client"

import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDashed,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import {
  CRITERION_STATUS_LABELS,
  CRITERION_STATUS_TONES,
  type CriterionStatus,
  type CriterionStatusTone,
} from "@/lib/jobs/job-analysis-model"
import { cn } from "@/lib/utils"

export const analysisSurfaceClassName =
  "min-w-0 rounded-app-control border border-app-border bg-app-surface p-4"

export const analysisInsetClassName =
  "min-w-0 rounded-app-control border border-app-border bg-app-control p-4"

const STATUS_ICONS: Record<CriterionStatus, LucideIcon> = {
  demonstrated: CheckCircle2,
  mentioned_only: Info,
  transferable: ArrowLeftRight,
  not_evidenced: CircleDashed,
  contradicted: TriangleAlert,
}

const TONE_CLASSES: Record<CriterionStatusTone, string> = {
  good: "border-0 bg-app-success-surface text-app-success",
  clarify:
    "border-0 bg-app-warning-surface text-app-warning",
  neutral: "border-app-border-strong bg-app-control text-app-text-subtle",
  danger: "border-app-danger/45 bg-app-danger-surface text-app-danger",
}

export function CriterionStatusBadge({
  status,
  className,
}: {
  status: CriterionStatus
  className?: string
}) {
  const Icon = STATUS_ICONS[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-app-control border-0 px-2 py-1 text-base font-medium leading-6",
        TONE_CLASSES[CRITERION_STATUS_TONES[status]],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {CRITERION_STATUS_LABELS[status]}
    </span>
  )
}

export function AnalysisEyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "text-xs font-medium uppercase tracking-[0.12em] text-app-text-secondary",
        className
      )}
    >
      {children}
    </p>
  )
}

export function AnalysisNotice({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: "neutral" | "info" | "warn" | "danger" | "success"
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  const tones = {
    neutral: "border-app-border bg-app-surface-raised text-app-text-subtle",
    info: "border-app-border bg-app-surface-raised text-app-text-subtle",
    warn: "border-app-warning/35 bg-app-warning-surface text-app-warning",
    danger:
      "border-app-danger/40 bg-app-danger-surface text-app-danger",
    success:
      "border-app-success/30 bg-app-success-surface text-app-success",
  } as const
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-app-surface border px-3.5 py-3 text-sm leading-relaxed",
        tones[tone],
        className
      )}
    >
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function AnalysisTextButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-[6px] text-sm font-medium text-app-text-subtle underline-offset-4 transition-colors hover:text-app-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
