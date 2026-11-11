"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  Circle,
  CircleDot,
  CircleHelp,
  Loader2,
} from "lucide-react"
import {
  getAnswerFor,
  isQuestionHandled,
  type AnalysisQuestion,
} from "@/lib/jobs/job-analysis-model"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { LucideIcon } from "lucide-react"
import {
  AnalysisNotice,
  analysisInsetClassName,
  analysisSurfaceClassName,
} from "@/components/jobs/analysis/analysis-status"
import type { Job } from "@/types"

type ExperienceSectionProps = {
  job: Job
  questions: AnalysisQuestion[]
  focusRequest: { id: string; nonce: number } | null
  onSaveAnswer: (
    question: AnalysisQuestion,
    answer: "yes" | "no" | "unknown",
    detail: string | null
  ) => Promise<boolean>
  onSeeSuggestions: () => void
  onDirtyChange: (dirty: boolean) => void
}

type AnswerChoice = {
  value: "yes" | "no" | "unknown"
  label: string
}

const ANSWER_CHOICES: AnswerChoice[] = [
  { value: "yes", label: "Oui j’ai cette expérience" },
  { value: "no", label: "Non pas à ce jour" },
  { value: "unknown", label: "Je ne sais pas" },
]

function questionPlaceholder(label: string): string {
  const normalized = label.trim().toLowerCase()
  if (!normalized) {
    return "Ex. : décris le contexte, ce que tu as fait toi-même et le résultat observé."
  }
  return `Ex. : lors d’un projet où tu as dû ${normalized}, décris le contexte, ce que tu as fait toi-même et le résultat observé.`
}

export function ExperienceSection({
  job,
  questions,
  focusRequest,
  onSaveAnswer,
  onSeeSuggestions,
  onDirtyChange,
}: ExperienceSectionProps) {
  const initialIndex = useMemo(() => {
    const firstUnhandled = questions.findIndex(
      (question) => !isQuestionHandled(getAnswerFor(job, question))
    )
    return firstUnhandled === -1 ? questions.length : firstUnhandled
  }, [job, questions])

  const [index, setIndex] = useState(initialIndex)
  const [draftAnswer, setDraftAnswer] = useState<"yes" | "no" | "unknown" | null>(
    null
  )
  const [detail, setDetail] = useState("")
  const [mode, setMode] = useState<"edit" | "saved">("edit")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  const question = index < questions.length ? questions[index] : null
  const storedAnswer = question ? getAnswerFor(job, question) : null

  // Report unsaved local input so the page can warn before losing it.
  const dirty =
    mode === "edit" && (draftAnswer !== null || detail.trim().length > 0)
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  // Sync the edit/saved state when navigating between questions.
  useEffect(() => {
    if (!question) return
    const answer = getAnswerFor(job, question)
    setMode(answer ? "saved" : "edit")
    setDraftAnswer(answer?.answer ?? null)
    setDetail(answer?.detail ?? "")
    setError(null)
    // Intentionally not depending on `job`: saving must keep the local saved state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id])

  useEffect(() => {
    if (!focusRequest) return
    const targetIndex = questions.findIndex(
      (item) =>
        item.criterionId === focusRequest.id || item.id === focusRequest.id
    )
    if (targetIndex < 0) return
    setIndex(targetIndex)
    window.requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      headingRef.current?.focus({ preventScroll: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce])

  if (questions.length === 0) return null

  const goNext = () => {
    setIndex((current) => Math.min(current + 1, questions.length))
    window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
    })
  }

  const handleLater = () => {
    if (question) {
      setSkippedIds((previous) => new Set(previous).add(question.id))
    }
    goNext()
  }

  const handleSave = async () => {
    if (!question || saving) return
    if (!draftAnswer) {
      setError("Sélectionne une réponse pour continuer.")
      return
    }
    if (draftAnswer === "yes" && !detail.trim()) {
      setError("Ajoute un exemple pour préciser cette expérience.")
      return
    }
    setSaving(true)
    setError(null)
    const saved = await onSaveAnswer(
      question,
      draftAnswer,
      detail.trim() ? detail.trim() : null
    )
    setSaving(false)
    if (!saved) {
      setError("Ta réponse n’a pas pu être enregistrée. Réessaie.")
      return
    }
    setMode("saved")
  }

  const anyLeftToClarify =
    skippedIds.size > 0 ||
    questions.some((item) => {
      const answer = getAnswerFor(job, item)
      return !isQuestionHandled(answer) || answer?.answer === "unknown"
    })

  if (!question) {
    return (
      <section
        aria-labelledby="experience-title"
        className={analysisSurfaceClassName}
      >
        <h2
          id="experience-title"
          className="mt-2 text-xl font-semibold tracking-tight text-app-text"
        >
          Tu as traité toutes les questions.
        </h2>
        {anyLeftToClarify ? (
          <p className="mt-1 text-sm text-app-text-secondary">
            Certaines informations restent à préciser.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSeeSuggestions}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-app-control bg-app-action px-4 text-sm font-semibold text-app-action-foreground transition-colors hover:bg-app-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
        >
          Voir mes suggestions
        </button>
      </section>
    )
  }

  const displayAnswer = mode === "saved" ? storedAnswer : null
  const currentAnswer = mode === "saved" ? displayAnswer?.answer : draftAnswer

  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className={analysisSurfaceClassName}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2
            id="experience-title"
            className="text-xl font-semibold leading-7 text-app-text"
          >
            Précise ton expérience
          </h2>
          <p className="mt-2 text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
            Certaines attentes ne sont pas suffisamment documentées dans ton CV.
            Tes réponses permettront de préparer des suggestions plus
            pertinentes.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-base leading-5 text-app-text-secondary">
            Question {index + 1} sur {questions.length}
          </p>
          <div className="flex items-center gap-1" aria-hidden>
            {questions.map((item, questionIndex) => (
              <span
                key={item.id}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  questionIndex < index
                    ? "bg-app-success"
                    : questionIndex === index
                      ? "bg-app-success"
                      : "bg-app-border"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-app-text-secondary">{question.skillLabel}</p>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-lg font-medium leading-snug text-app-text outline-none focus-visible:underline focus-visible:decoration-app-success focus-visible:decoration-2 focus-visible:underline-offset-4"
          >
            {question.question}
          </h3>
        </div>

        {mode === "saved" && displayAnswer ? (
          <div className="space-y-4" aria-live="polite">
            <AnalysisNotice
              tone={displayAnswer.answer === "no" ? "neutral" : "success"}
              icon={CheckCircle2}
            >
              {displayAnswer.answer === "no" ? (
                <p>
                  Réponse enregistrée. Aucune expérience liée à cette activité ne
                  sera ajoutée à ton CV.
                </p>
              ) : displayAnswer.answer === "unknown" ? (
                <p>
                  Ce point reste à préciser. Tu pourras y revenir plus tard.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">Réponse enregistrée</p>
                  <p>
                    Cette réponse vient de toi : elle n’est pas encore dans ton CV
                    et ne modifie pas ton score.
                  </p>
                </div>
              )}
            </AnalysisNotice>

            {displayAnswer.detail ? (
              <div className={analysisInsetClassName}>
                <p className="text-xs font-medium uppercase tracking-wide text-app-text-secondary">
                  Ton exemple — déclaré par toi, non repris dans le CV
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text-subtle">
                  {displayAnswer.detail}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("edit")
                  setDraftAnswer(displayAnswer.answer)
                  setDetail(displayAnswer.detail ?? "")
                  setError(null)
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-app-control border border-app-text-secondary bg-app-control px-4 text-sm font-medium text-app-text transition-colors hover:border-app-text hover:bg-app-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
              >
                Modifier ma réponse
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-10 items-center justify-center rounded-app-control bg-app-action px-4 text-sm font-semibold text-app-action-foreground transition-colors hover:bg-app-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
              >
                Question suivante
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-3"
              role="group"
              aria-label="Réponse à la question"
            >
              {ANSWER_CHOICES.map((choice) => {
                const selected = draftAnswer === choice.value
                const Icon: LucideIcon = selected ? CircleDot : Circle
                return (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setDraftAnswer(choice.value)
                      setError(null)
                    }}
                    className={cn(
                      "inline-flex min-h-16 w-full items-center gap-2 rounded-app-control border-(length:--app-stroke) px-4 py-4 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface",
                      selected
                        ? "border-app-success bg-app-success-surface text-app-text"
                        : "border-app-border bg-app-surface text-app-text hover:border-app-text-muted hover:bg-app-control"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "text-app-success" : "text-app-text-muted"
                      )}
                      aria-hidden
                    />
                    {choice.label}
                  </button>
                )
              })}
            </div>

            {draftAnswer === "yes" ? (
              <div className="space-y-2">
                <label
                  htmlFor="experience-example"
                  className="block text-base font-medium text-app-text-strong"
                >
                  Décris un exemple concret
                </label>
                <Textarea
                  id="experience-example"
                  value={detail}
                  onChange={(event) => {
                    setDetail(event.target.value)
                    if (error) setError(null)
                  }}
                  rows={4}
                  placeholder={questionPlaceholder(question.skillLabel)}
                  className="min-h-16 w-full rounded-app-date border-(length:--app-stroke) border-app-border bg-app-control px-3 py-3 text-base leading-6 text-app-text placeholder:text-app-text-muted focus-visible:border-app-text-secondary focus-visible:ring-2 focus-visible:ring-app-text-secondary/40"
                />
                <p className="text-xs leading-relaxed text-app-text-secondary">
                  Décris uniquement ce que tu as réellement fait. Aucun résultat
                  chiffré n’est nécessaire.
                </p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-app-danger">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex max-w-full items-center gap-3 rounded-app-control border border-app-border bg-app-control px-4 py-4 text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
                <CircleHelp className="h-5 w-5 shrink-0" aria-hidden />
                Ta réponse ne modifie pas directement le score
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="control"
                  onClick={handleLater}
                  disabled={saving}
                  className="text-sm"
                >
                  Plus tard
                </Button>
                <Button
                  type="button"
                  size="control"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="text-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer ma réponse"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {mode === "saved"
          ? "Réponse enregistrée."
          : currentAnswer === "unknown"
            ? "Ce point reste à préciser."
            : ""}
      </p>

    </section>
  )
}
