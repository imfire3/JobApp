"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, Check, CheckCircle2, Circle, LoaderCircle } from "lucide-react"

type CvImportProgressProps = {
  active: boolean
  step: "idle" | "upload" | "extract" | "analyze" | "save" | "done" | "error"
  label?: string
  message?: string
  className?: string
  onComplete?: () => void
}

const STEP_CONFIG = {
  idle: { title: "Prêt", subtitle: "En attente de ton CV…", current: 0 },
  upload: { title: "Import du CV", subtitle: "Réception de ton fichier…", current: 0 },
  extract: { title: "Lecture du CV", subtitle: "Extraction du texte…", current: 1 },
  analyze: { title: "Analyse du profil", subtitle: "Identification de tes expériences et compétences…", current: 2 },
  save: { title: "Création de ton profil", subtitle: "Enregistrement des informations extraites…", current: 3 },
  done: { title: "C’est prêt !", subtitle: "Ton CV a été traité avec succès.", current: 4 },
  error: { title: "Import interrompu", subtitle: "Une erreur est survenue pendant le traitement.", current: 0 },
}

const STAGES = ["Fichier reçu", "Extraction", "Analyse", "Profil"]

export function CvImportProgress({
  active,
  step = "extract",
  label,
  message,
  className,
  onComplete,
}: CvImportProgressProps) {
  const config = STEP_CONFIG[step]

  useEffect(() => {
    if (step === "done" && onComplete) {
      const timer = window.setTimeout(() => onComplete(), 800)
      return () => window.clearTimeout(timer)
    }
  }, [step, onComplete])

  const showCompletion = step === "done" || step === "error"
  const currentStage = config.current

  if (showCompletion) {
    return (
      <div className={cn("space-y-4 rounded-[8px] border p-4", className, step === "error" ? "border-destructive/40 bg-[#171717]" : "border-[#404040] bg-[#171717]")}>
      <div className="flex items-start gap-3 text-base" role="status" aria-live="polite" aria-busy={active}>
          <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[8px]", step === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          <div className="flex items-center gap-2">
            {step === "done" ? (
              <CheckCircle2 className="size-5" aria-hidden />
            ) : (
              <AlertCircle className="size-5" aria-hidden />
            )}
          </div>
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold leading-6 text-[#fafafa]">{label || config.title}</p>
            <p className="text-sm leading-5 text-[#a3a3a3]">{message || config.subtitle}</p>
          </div>
        </div>
        {step === "done" ? <p className="text-sm text-primary">Tu peux continuer vers la suite de ton profil.</p> : null}
      </div>
    )
  }

  return (
    <div className={cn("w-full space-y-4 rounded-[8px] border border-[#404040] bg-[#171717] p-4", className)}>
      <div className="flex items-start gap-3 text-left" role="status" aria-live="polite" aria-busy={active}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#262626] text-primary" aria-hidden>
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-semibold leading-6 text-[#fafafa]">{label || config.title}</p>
            <span className="shrink-0 text-sm font-medium tabular-nums text-[#a3a3a3]">Étape {Math.min(currentStage + 1, STAGES.length)} sur {STAGES.length}</span>
          </div>
          <p className="text-sm leading-5 text-[#a3a3a3]">{message || config.subtitle}</p>
        </div>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[#262626]"
        role="progressbar"
        aria-valuetext={`${label || config.title}, étape ${Math.min(currentStage + 1, STAGES.length)} sur ${STAGES.length}`}
        aria-label="Progression du traitement du CV"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${((currentStage + 1) / STAGES.length) * 100}%` }}
        />
      </div>
      <ol className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4" aria-label="Étapes du traitement">
        {STAGES.map((stage, index) => {
          const complete = index < currentStage
          const current = index === currentStage
          return (
            <li key={stage} className={cn("flex min-w-0 items-center gap-2 text-xs leading-4", current ? "font-medium text-[#fafafa]" : complete ? "text-[#a3a3a3]" : "text-[#737373]")} aria-current={current ? "step" : undefined}>
              <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
                {complete ? <Check className="size-3.5 text-primary" /> : current ? <LoaderCircle className="size-3.5 animate-spin text-primary motion-reduce:animate-none" /> : <Circle className="size-2.5" />}
              </span>
              <span className="truncate">{stage}</span>
              <span className="sr-only">{complete ? "terminée" : current ? "en cours" : "à venir"}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
