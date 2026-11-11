"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  FilePlus2,
  Loader2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import {
  buildAnalysisCriteria,
  buildAnalysisSummary,
  buildCvSuggestions,
  buildExperienceQuestions,
  isJobAnalysisOutdated,
  normalizeSkillKey,
  type AnalysisCriterion,
  type AnalysisQuestion,
} from "@/lib/jobs/job-analysis-model"
import {
  hasJobFitResult,
  matchVerdict,
} from "@/lib/jobs/job-detail-lab-model"
import { cn } from "@/lib/utils"
import {
  AnalysisNotice,
  analysisSurfaceClassName,
} from "@/components/jobs/analysis/analysis-status"
import { CriteriaSection } from "@/components/jobs/analysis/criteria-section"
import { ExperienceSection } from "@/components/jobs/analysis/experience-section"
import { SuggestionsSection } from "@/components/jobs/analysis/suggestions-section"
import type { CvOptimizeResponse } from "@/lib/ai/schemas/cv-optimize"
import type { CvAnalysisResponse, Job } from "@/types"

type JobAnalysisViewProps = {
  job: Job
  cvText?: string
  analyzing: boolean
  analyzeError: string | null
  cvLoading: boolean
  /** `null` while the profile is still loading. */
  hasCv: boolean | null
  cvAnalysis: CvAnalysisResponse | null
  cvOptimize: CvOptimizeResponse | null
  cvOptLoading: boolean
  appliedIds: Set<string>
  dismissedIds: Set<string>
  applyingId: string | null
  onAnalyze: () => void
  onGoOptimize: () => void
  onAddCv: () => void
  onSaveAnswer: (
    question: AnalysisQuestion,
    answer: "yes" | "no" | "unknown",
    detail: string | null
  ) => Promise<boolean>
  onApplySuggestion: (suggestionId: string, text?: string) => Promise<boolean>
  onIgnoreSuggestion: (suggestionId: string) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}

const SCORE_TONE = {
  good: {
    ring: "var(--app-success)",
  },
  partial: {
    ring: "var(--app-warning)",
  },
  weak: {
    ring: "var(--app-danger)",
  },
  pending: {
    ring: "var(--app-border-strong)",
  },
} as const

const PRIMARY_BUTTON =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-app-control bg-app-action px-4 text-sm font-semibold text-app-action-foreground transition-colors hover:bg-app-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"

const SECONDARY_BUTTON =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-app-control border border-app-text-secondary bg-app-control px-4 text-sm font-medium text-app-text transition-colors hover:border-app-text hover:bg-app-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"

function AnalysisSkeleton({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className={analysisSurfaceClassName}>
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-app-text-secondary" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-app-text">{title}</h2>
          <p className="mt-1 text-sm text-app-text-secondary">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3" aria-hidden>
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-app-control" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-app-control" />
        <div className="h-28 animate-pulse rounded-app-surface border border-app-border bg-app-surface-raised" />
      </div>
    </div>
  )
}

function GlobalStateCard({
  title,
  description,
  primary,
  secondary,
  icon: Icon,
}: {
  title: string
  description: string
  primary?: { label: string; onClick: () => void }
  secondary?: { label: string; onClick: () => void }
  icon: typeof Sparkles
}) {
  return (
    <div className={analysisSurfaceClassName}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-border-strong bg-app-control">
          <Icon className="h-5 w-5 text-app-text-subtle" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-app-text">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-app-text-secondary">
            {description}
          </p>
        </div>
      </div>
      {primary || secondary ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {primary ? (
            <button type="button" onClick={primary.onClick} className={PRIMARY_BUTTON}>
              {primary.label}
            </button>
          ) : null}
          {secondary ? (
            <button
              type="button"
              onClick={secondary.onClick}
              className={SECONDARY_BUTTON}
            >
              {secondary.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AnalysisIntroCard() {
  return (
    <section className={analysisSurfaceClassName}>
      <h2 className="text-xl font-semibold leading-7 text-app-text">
        Analyse du profil
      </h2>
      <p className="mt-3 text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
        Ce score compare les preuves présentes dans ton CV aux exigences de
        cette offre. Il ne prédit pas une réponse du recruteur.
      </p>
    </section>
  )
}

function SummaryCard({
  summary,
  gaps,
  onViewCriterion,
}: {
  summary: ReturnType<typeof buildAnalysisSummary>
  gaps: AnalysisCriterion[]
  onViewCriterion: (criterionId: string) => void
}) {
  return (
    <section className={analysisSurfaceClassName}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold leading-7 text-app-text">
          Synthèse des critères
        </h2>
        {summary.demonstratedCount + summary.toClarifyCount > 0 ? (
          <p className="text-lg font-semibold leading-7 text-app-text-strong">
            {summary.headline}
          </p>
        ) : null}
      </div>
      {summary.toClarifyCount > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-app-text-secondary">
            Écarts prioritaires
          </p>
          <ul className="mt-2 space-y-2">
            {gaps.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-app-control border border-app-warning/40 bg-app-warning-surface px-3 py-2"
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-app-text-subtle">
                  <CircleHelp className="h-4 w-4 shrink-0 text-app-warning" aria-hidden />
                  <span className="break-words">{item.label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onViewCriterion(item.id)}
                  className="shrink-0 rounded-[4px] text-sm text-app-text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
                >
                  Voir le critère
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : summary.strengths.length > 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-app-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Tous les critères analysés sont démontrés dans ton CV.
        </p>
      ) : (
        <p className="mt-2 text-base leading-6 text-app-text-subtle">
          {summary.headline}
        </p>
      )}
    </section>
  )
}

function ScoreCard({
  job,
  weights,
}: {
  job: Job
  weights: Array<{ label: string; weightPercent: number }>
}) {
  const [open, setOpen] = useState(false)
  const score = typeof job.match_score === "number" ? job.match_score : null
  const verdict = matchVerdict(score)
  const tone = SCORE_TONE[verdict.tone]

  return (
    <section
      className={cn(
        analysisSurfaceClassName,
        "flex h-full min-h-[280px] flex-col items-center justify-center gap-6 py-8"
      )}
      aria-label="Correspondance documentée"
    >
      <div
        className="flex size-[min(232px,65vw)] items-center justify-center rounded-full p-[14px]"
        role="img"
        aria-label={
          score === null
            ? "Score de correspondance documentée indisponible"
            : `Score de correspondance documentée : ${score} sur 100, ${verdict.label}`
        }
        style={{
          background:
            score === null
              ? "var(--app-control)"
              : `conic-gradient(from -90deg, ${tone.ring} 0%, ${tone.ring} ${Math.min(100, Math.max(0, score))}%, var(--app-control) ${Math.min(100, Math.max(0, score))}%, var(--app-control) 100%)`,
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-app-surface text-center">
          {score === null ? (
            <>
              <span className="text-5xl font-bold leading-[72px] text-app-text-secondary">
                —
              </span>
              <span className="max-w-[150px] text-sm leading-5 text-app-text-secondary">
                Score indisponible
              </span>
            </>
          ) : (
            <>
              <span
                className="text-[56px] font-bold leading-[64px] tracking-[-0.04em]"
                style={{ color: tone.ring }}
              >
                {score}
              </span>
              <span className="text-2xl font-bold leading-8 tracking-[-0.04em] text-app-text-secondary">
                / 100
              </span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="score-details"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex w-fit items-center gap-1.5 rounded-[6px] text-base text-app-text-secondary underline-offset-4 transition-colors hover:text-app-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
      >
        Comprendre le score
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div id="score-details" className="mt-3 space-y-3 text-sm">
          {job.score_explanation ? (
            <p className="leading-relaxed text-app-text-subtle">{job.score_explanation}</p>
          ) : (
            <p className="leading-relaxed text-app-text-secondary">
              Le score est calculé côté serveur à partir des critères pondérés de
              l’offre et des preuves présentes dans ton CV.
            </p>
          )}

          {weights.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-secondary">
                Poids des critères
              </p>
              <ul className="mt-2 space-y-1.5">
                {weights.map((item) => (
                  <li
                    key={`${item.label}-${item.weightPercent}`}
                    className="flex items-baseline justify-between gap-3 text-app-text-subtle"
                  >
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <span className="tabular-nums text-app-text-secondary">
                      {item.weightPercent} %
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {job.analysis_limitations && job.analysis_limitations.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-text-secondary">
                Limites connues
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-app-text-subtle">
                {job.analysis_limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="leading-relaxed text-app-text-secondary">
            Tes réponses et les reformulations que tu ajoutes ne modifient pas
            automatiquement ce score.
          </p>
        </div>
      ) : null}

    </section>
  )
}

export function JobAnalysisView({
  job,
  cvText,
  analyzing,
  analyzeError,
  cvLoading,
  hasCv,
  cvAnalysis,
  cvOptimize,
  cvOptLoading,
  appliedIds,
  dismissedIds,
  applyingId,
  onAnalyze,
  onGoOptimize,
  onAddCv,
  onSaveAnswer,
  onApplySuggestion,
  onIgnoreSuggestion,
  onDirtyChange,
}: JobAnalysisViewProps) {
  const [experienceDirty, setExperienceDirty] = useState(false)
  const [suggestionsDirty, setSuggestionsDirty] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{
    id: string
    nonce: number
  } | null>(null)
  const [criteriaFocusRequest, setCriteriaFocusRequest] = useState<{
    id: string
    nonce: number
  } | null>(null)

  useEffect(() => {
    onDirtyChange(experienceDirty || suggestionsDirty)
  }, [experienceDirty, suggestionsDirty, onDirtyChange])

  const criteria = useMemo(() => buildAnalysisCriteria(job, cvText), [job, cvText])
  const gaps = useMemo(
    () => criteria.filter((criterion) => criterion.status !== "demonstrated"),
    [criteria]
  )
  const questions = useMemo(
    () => buildExperienceQuestions(job, criteria, cvOptimize, cvText),
    [job, criteria, cvOptimize, cvText]
  )
  const suggestions = useMemo(
    () => buildCvSuggestions(cvOptimize, job, cvText),
    [cvOptimize, job, cvText]
  )
  const hasResult = hasJobFitResult(job)
  const outdated = isJobAnalysisOutdated(job, cvAnalysis)
  const limited =
    job.analysis_status === "partial" ||
    job.analysis_status === "insufficient_input" ||
    (job.analysis_limitations?.length ?? 0) > 0

  const summary = useMemo(
    () =>
      buildAnalysisSummary(job, criteria, {
        hasSuggestions: suggestions.length > 0,
        firstQuestionCriterionId: questions[0]?.criterionId ?? null,
      }),
    [job, criteria, suggestions.length, questions]
  )

  const weights = useMemo(
    () =>
      criteria
        .filter((criterion) => criterion.weightPercent > 0)
        .map((criterion) => ({
          label: criterion.label,
          weightPercent: criterion.weightPercent,
        })),
    [criteria]
  )

  const canClarify = useCallback(
    (criterionId: string) =>
      questions.some((question) => question.criterionId === criterionId),
    [questions]
  )

  const focusCriterion = useCallback(
    (criterionId: string) => {
      if (!questions.some((question) => question.criterionId === criterionId)) {
        return
      }
      setFocusRequest({ id: criterionId, nonce: Date.now() })
      window.requestAnimationFrame(() => {
        document
          .getElementById("experience")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    },
    [questions]
  )

  const focusQuestion = useCallback((question: AnalysisQuestion) => {
    setFocusRequest({
      id: question.criterionId ?? question.id,
      nonce: Date.now(),
    })
    window.requestAnimationFrame(() => {
      document
        .getElementById("experience")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  const viewCriterion = useCallback((criterionId: string) => {
    setCriteriaFocusRequest({ id: criterionId, nonce: Date.now() })
  }, [])

  const getExperienceQuestion = useCallback(
    (suggestion: ReturnType<typeof buildCvSuggestions>[number]) => {
      const exactQuestion = questions.find(
        (question) =>
          suggestion.question?.trim() &&
          question.question.trim() === suggestion.question.trim()
      )
      if (exactQuestion) return exactQuestion

      const suggestionKey = normalizeSkillKey(suggestion.title)
      if (!suggestionKey) return null
      return (
        questions.find(
          (question) =>
            suggestionKey.includes(question.skillKey) ||
            question.skillKey.includes(suggestionKey)
        ) ?? null
      )
    },
    [questions]
  )

  const scrollToSuggestions = useCallback(() => {
    document
      .getElementById("suggestions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  if (cvLoading && hasCv === null) {
    return (
      <AnalysisSkeleton
        title="Comparaison de ton CV avec l’offre…"
        description="Nous vérifions les informations disponibles sur ton profil."
      />
    )
  }

  if (hasCv === false) {
    return (
      <GlobalStateCard
        icon={FilePlus2}
        title="Ajoute ton CV pour analyser cette offre"
        description="Aucun CV n’est enregistré sur ton profil. Tu peux continuer à consulter l’offre, puis lancer l’analyse dès que ton CV est ajouté."
        primary={{ label: "Ajouter mon CV", onClick: onAddCv }}
      />
    )
  }

  if (!hasResult) {
    if (analyzing) {
      return (
        <AnalysisSkeleton
          title="Comparaison de ton CV avec l’offre…"
          description="L’analyse vérifie les attentes de l’offre face aux preuves de ton CV."
        />
      )
    }

    if (analyzeError) {
      return (
        <GlobalStateCard
          icon={CircleAlert}
          title="L’analyse n’a pas pu aboutir"
          description={`${analyzeError} Ton offre reste consultable dans l’onglet « Offre ».`}
          primary={{ label: "Réessayer", onClick: onAnalyze }}
        />
      )
    }

    return (
      <GlobalStateCard
        icon={Sparkles}
        title="Compare ton CV à cette offre"
        description="Lance l’analyse pour voir les exigences démontrées, les points à préciser et les reformulations utiles pour cette offre."
        primary={{ label: "Analyser cette offre", onClick: onAnalyze }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {analyzing ? (
        <AnalysisNotice tone="info" icon={Loader2}>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-app-success" aria-hidden />
            Mise à jour de l’analyse… Ton dernier résultat reste affiché.
          </span>
        </AnalysisNotice>
      ) : null}

      {!analyzing && analyzeError ? (
        <AnalysisNotice tone="danger" icon={CircleAlert}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              L’analyse n’a pas pu être actualisée. Ton dernier résultat reste
              disponible.
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              className="inline-flex w-fit items-center gap-1.5 rounded-[6px] text-sm font-medium text-app-text underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Réessayer
            </button>
          </div>
        </AnalysisNotice>
      ) : null}

      {!analyzing && !analyzeError && outdated ? (
        <AnalysisNotice tone="info" icon={TriangleAlert}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Ton CV ou cette offre a changé depuis l’analyse. Actualise l’analyse pour
              aligner les preuves et le score avec les données actuelles.
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              className="inline-flex w-fit items-center gap-1.5 rounded-[6px] text-sm font-medium text-app-text underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Actualiser l’analyse
            </button>
          </div>
        </AnalysisNotice>
      ) : null}

      {limited ? (
        <AnalysisNotice tone="warn" icon={TriangleAlert}>
          <p className="font-medium">Analyse à interpréter avec prudence</p>
          <p className="mt-1">
            Certaines informations de l’offre ou du CV n’ont pas pu être
            exploitées. Les conclusions ci-dessous ne couvrent que les éléments
            détectés.
          </p>
          {job.analysis_limitations && job.analysis_limitations.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {job.analysis_limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : null}
        </AnalysisNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_424.63px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SummaryCard summary={summary} gaps={gaps} onViewCriterion={viewCriterion} />
          <AnalysisIntroCard />
        </div>
        <ScoreCard job={job} weights={weights} />
      </div>

      <CriteriaSection
        criteria={criteria}
        onClarify={focusCriterion}
        canClarify={canClarify}
        focusRequest={criteriaFocusRequest}
      />

      {questions.length > 0 ? (
        <ExperienceSection
          job={job}
          questions={questions}
          focusRequest={focusRequest}
          onSaveAnswer={onSaveAnswer}
          onSeeSuggestions={scrollToSuggestions}
          onDirtyChange={setExperienceDirty}
        />
      ) : null}

      <SuggestionsSection
        suggestions={suggestions}
        loading={cvOptLoading}
        appliedIds={appliedIds}
        dismissedIds={dismissedIds}
        applyingId={applyingId}
        getExperienceQuestion={getExperienceQuestion}
        onApply={onApplySuggestion}
        onIgnore={onIgnoreSuggestion}
        onViewCv={onGoOptimize}
        onCompleteExperience={focusQuestion}
        onDirtyChange={setSuggestionsDirty}
      />

      <p className="text-xs leading-relaxed text-app-text-muted">
        Les informations affichées proviennent de l’analyse enregistrée pour
        cette offre et du CV analysé. Aucune conclusion n’est inventée quand une
        donnée manque.{" "}
        <Link
          href="/profile-ai"
          className="rounded-[4px] text-app-text-secondary underline underline-offset-4 hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
        >
          Voir mon CV
        </Link>
      </p>
    </div>
  )
}
