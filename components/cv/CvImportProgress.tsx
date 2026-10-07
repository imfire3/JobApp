"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type CvImportProgressProps = {
  active: boolean
  step: "idle" | "upload" | "extract" | "analyze" | "save" | "done" | "error"
  label?: string
  message?: string
  className?: string
  onComplete?: () => void
}

const STEP_CONFIG = {
  idle: { title: "Prêt", subtitle: "En attente de ton CV…", progress: 0 },
  upload: { title: "Import du CV", subtitle: "Réception de ton fichier…", progress: 10 },
  extract: { title: "Lecture du CV", subtitle: "Extraction du texte et analyse…", progress: 30 },
  analyze: { title: "Analyse du profil", subtitle: "Identification de tes expériences et compétences…", progress: 60 },
  save: { title: "Sauvegarde", subtitle: "Création de ton profil…", progress: 85 },
  done: { title: "C'est prêt !", subtitle: "Redirection vers ton dashboard…", progress: 100 },
  error: { title: "Erreur", subtitle: "Une erreur est survenue", progress: 0 },
}

export function CvImportProgress({
  active,
  step = "extract",
  label,
  message,
  className,
  onComplete,
}: CvImportProgressProps) {
  const [percent, setPercent] = useState(0)
  const targetRef = useRef(STEP_CONFIG[step].progress)
  const config = STEP_CONFIG[step]

  useEffect(() => {
    if (!active) {
      setPercent(0)
      return
    }

    targetRef.current = config.progress

    const timer = window.setInterval(() => {
      setPercent((current) => {
        const target = targetRef.current
        if (current >= target) return current
        const stepSize = current < 30 ? 8 : current < 60 ? 4 : current < 85 ? 2 : 1
        return Math.min(target, current + stepSize)
      })
    }, 250)

    return () => window.clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (step === "done" && onComplete) {
      const timer = window.setTimeout(() => onComplete(), 800)
      return () => window.clearTimeout(timer)
    }
  }, [step, onComplete])

  const shown = active ? percent : (step === "done" ? 100 : 0)
  const showCompletion = step === "done" || step === "error"

  if (showCompletion) {
    return (
      <div className={cn("space-y-3 rounded-2xl border p-4", className, step === "error" ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5")}>
        <div className="flex items-center justify-between gap-3 text-base">
          <div className="flex items-center gap-2">
            {step === "done" ? (
              <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            ) : (
              <svg className="size-5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            )}
            <p className="font-medium text-foreground">{config.title}</p>
          </div>
          <span className="tabular-nums text-lg font-semibold text-foreground">100%</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={100}
          aria-label={config.title}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: "100%" }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4", className)}>
      <div className="flex items-center justify-between gap-3 text-base">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-foreground">{label || config.title}</p>
          <p className="text-sm text-muted-foreground">{message || config.subtitle}</p>
        </div>
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
        aria-label={`${config.title} - ${shown}%`}
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
            active && "animate-pulse"
          )}
          style={{ width: `${shown}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex h-2 w-2 rounded-full bg-primary" />
        <span>Fichier reçu</span>
        <span className="flex h-2 w-2 rounded-full bg-muted" />
        <span>Extraction</span>
        <span className="flex h-2 w-2 rounded-full bg-muted" />
        <span>Analyse</span>
        <span className="flex h-2 w-2 rounded-full bg-muted" />
        <span>Profil</span>
      </div>
    </div>
  )
}