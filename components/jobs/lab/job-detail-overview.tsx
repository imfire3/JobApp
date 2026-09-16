"use client"

import { useCallback, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Loader2,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { AnalyzingProgressPanel } from "@/components/jobs/job-scoring-progress"
import {
  buildConfirmCards,
  buildCriteriaRows,
  buildMatchNarrative,
  buildPriorityActionCards,
  buildSubScores,
  criteriaDerivedHighlights,
  criterionMatchDisplay,
  matchScoreMeta,
  projectOptimizedScore,
  resolveLabAnalysisState,
  splitScoreExplanation,
  type LabCriterionRow,
} from "@/lib/jobs/job-detail-lab-model"
import { cn } from "@/lib/utils"
import type { Job } from "@/types"

export type JobDetailOverviewProps = {
  job: Job
  analyzing: boolean
  analyzeError: string | null
  cvAnalyzing: boolean
  onReAnalyze: () => void
  onReAnalyzeCv: () => void
  onGoOptimize: () => void
  confirmingId: string | null
  confirmDetail: string
  confirmSaving: boolean
  onOpenConfirm: (criterionId: string) => void
  onConfirmDetailChange: (value: string) => void
  onCancelConfirm: () => void
  onConfirmCriterion: (criterionId: string, answer: "yes" | "no") => void
}

function ScoreSegments({
  filled,
  colorClass,
  className,
}: {
  filled: number
  colorClass: string
  className?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-[3px]", className)}
      aria-hidden
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2.5 flex-1 rounded-[2px]",
            index < filled ? colorClass : "bg-muted"
          )}
        />
      ))}
    </div>
  )
}

export function ImportanceBadge({
  level,
}: {
  level: "élevée" | "moyenne" | "faible" | "Critique" | "Important" | "Secondaire"
}) {
  const tone =
    level === "élevée" || level === "Critique"
      ? "border-orange-500/40 bg-orange-500/10 text-orange-200"
      : level === "moyenne" || level === "Important"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : "border-border bg-muted text-muted-foreground"
  return (
    <Badge variant="outline" className={cn("capitalize", tone)}>
      {level}
    </Badge>
  )
}

type ConfirmFlowProps = {
  title: string
  question: string
  criterionId: string
  confirmingId: string | null
  confirmDetail: string
  confirmSaving: boolean
  onOpenConfirm: (criterionId: string) => void
  onConfirmDetailChange: (value: string) => void
  onCancelConfirm: () => void
  onConfirmCriterion: (criterionId: string, answer: "yes" | "no") => void
}

function CriterionConfirm(props: ConfirmFlowProps) {
  const open = props.confirmingId === props.criterionId
  return (
    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="text-base leading-relaxed text-amber-100/90">
        <span className="font-medium text-amber-200">À confirmer : </span>
        {props.question}
      </p>
      {open ? (
        <div className="mt-3 space-y-2 border-t border-amber-500/10 pt-3">
          <Textarea
            value={props.confirmDetail}
            onChange={(event) => props.onConfirmDetailChange(event.target.value)}
            placeholder="Ex. 2 ans sur un portefeuille Assurance Vie chez X, résultats…"
            rows={3}
            aria-label={`Détail pour ${props.title}`}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={props.confirmSaving}
              onClick={() => props.onConfirmCriterion(props.criterionId, "yes")}
            >
              {props.confirmSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Ajouter au profil
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={props.confirmSaving}
              onClick={() => props.onConfirmCriterion(props.criterionId, "no")}
            >
              Non
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={props.confirmSaving}
              onClick={props.onCancelConfirm}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => props.onOpenConfirm(props.criterionId)}>
            Oui
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={props.confirmSaving}
            onClick={() => props.onConfirmCriterion(props.criterionId, "no")}
          >
            Non
          </Button>
        </div>
      )}
    </div>
  )
}

type OverviewActionCard = {
  id: string
  title: string
  importance: "élevée" | "moyenne" | "faible"
  kind: "safe_rewrite" | "gap" | "confirm"
  estimatedImpact: number | null
  cvSection: string | null
  fromCv: string | null
  rewrite: string | null
  keywords: string[]
  question: string | null
  criterionId: string | null
}

function CriterionRow({
  row,
  open,
  onToggle,
  confirmProps,
}: {
  row: LabCriterionRow
  open: boolean
  onToggle: () => void
  confirmProps: ConfirmFlowProps
}) {
  const match = criterionMatchDisplay(row.evidenceLevel)
  const segmentsColor = row.needsConfirmation
    ? "bg-amber-500"
    : row.levelTone === "strong" || row.levelTone === "good"
      ? "bg-emerald-500"
      : row.levelTone === "weak"
        ? "bg-amber-500"
        : "bg-red-500"
  const labelColor = row.needsConfirmation
    ? "text-amber-400"
    : row.levelTone === "strong"
      ? "text-emerald-400"
      : row.levelTone === "good"
        ? "text-emerald-400"
        : row.levelTone === "weak"
          ? "text-amber-400"
          : "text-red-400"

  return (
    <div
      id={`detail-${row.id}`}
      className="overflow-hidden rounded-xl border border-border/70 bg-background/40"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium leading-snug">{row.label}</span>
            {row.recruiterBlockRisk === "high" ? (
              <Badge
                variant="outline"
                className="border-orange-500/40 text-orange-200"
              >
                Must-have
              </Badge>
            ) : null}
            {row.needsConfirmation ? (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-100"
              >
                À confirmer
              </Badge>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ScoreSegments
              filled={match.scoreOutOf10}
              colorClass={segmentsColor}
              className="max-w-40"
            />
            <span className="text-sm tabular-nums text-muted-foreground">
              {match.scoreOutOf10}/10
            </span>
            <span className={cn("text-sm font-medium", labelColor)}>
              {row.needsConfirmation ? "À confirmer" : match.label}
            </span>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {row.weightPercent}&nbsp;%
        </Badge>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-border/70 px-4 py-3">
            {row.evidenceFromJob ? (
              <p className="text-base leading-relaxed">
                <span className="font-medium">Pourquoi ce score : </span>
                <span className="text-muted-foreground">
                  {row.evidenceFromJob}
                </span>
              </p>
            ) : null}
            {row.evidenceFromCv ? (
              <p className="text-base leading-relaxed">
                <span className="font-medium">Preuve dans ton CV : </span>
                <span className="text-muted-foreground">{row.evidenceFromCv}</span>
              </p>
            ) : (
              <p className="text-base text-muted-foreground">
                Aucune preuve détectée dans ton CV pour ce critère.
              </p>
            )}
            {row.needsConfirmation ? <CriterionConfirm {...confirmProps} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalysisSkeleton({ analyzing, title }: { analyzing: boolean; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse de ton offre</CardTitle>
        <p className="text-base text-muted-foreground">
          Comparaison en cours avec ton CV…
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <AnalyzingProgressPanel active={analyzing} title={title} />
        <div className="space-y-4 rounded-xl border border-border/70 bg-background/40 p-5">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-end gap-3">
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-[3px]">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-2.5 flex-1 rounded-[2px]" />
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-10 w-full sm:w-52" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

export function JobDetailOverview(props: JobDetailOverviewProps) {
  const { job } = props

  const criteriaRows = useMemo(() => buildCriteriaRows(job), [job])
  const actionCards = useMemo(() => buildPriorityActionCards(job), [job])
  const confirmCards = useMemo(() => buildConfirmCards(job), [job])
  const highlights = useMemo(() => criteriaDerivedHighlights(job), [job])
  const whyScore = useMemo(
    () => splitScoreExplanation(job.score_explanation),
    [job.score_explanation]
  )
  const narrative = useMemo(() => buildMatchNarrative(job), [job])
  const projected = useMemo(() => projectOptimizedScore(job), [job])
  const subScores = useMemo(() => buildSubScores(job), [job])
  const [openDetailIds, setOpenDetailIds] = useState<Set<string>>(new Set())

  const score = typeof job.match_score === "number" ? job.match_score : null
  const meta = matchScoreMeta(score)
  const analysisState = resolveLabAnalysisState({
    analyzing: props.analyzing,
    error: props.analyzeError,
    job,
  })

  const toggleDetail = useCallback((id: string) => {
    setOpenDetailIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const scrollToDetail = useCallback(
    (label: string) => {
      const clean = label.replace(/\s*—\s*à confirmer\s*$/i, "")
      const row = criteriaRows.find((candidate) => candidate.label === clean)
      if (!row) {
        document
          .getElementById("analyse-detaillee")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      setOpenDetailIds((prev) => new Set(prev).add(row.id))
      window.setTimeout(() => {
        document
          .getElementById(`detail-${row.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 0)
    },
    [criteriaRows]
  )

  const priorityActions = useMemo<OverviewActionCard[]>(() => {
    const confirmCriterionIds = new Set(
      confirmCards.map((card) => card.criterionId)
    )
    const cards: OverviewActionCard[] = []
    for (const card of actionCards) {
      if (
        card.kind === "confirm" &&
        card.criterionId &&
        confirmCriterionIds.has(card.criterionId)
      ) {
        continue
      }
      cards.push({
        id: card.id,
        title: card.title,
        importance: card.importance,
        kind: card.kind,
        estimatedImpact: card.estimatedImpact,
        cvSection: card.cvSection,
        fromCv: card.fromCv,
        rewrite: card.rewrite,
        keywords: card.keywords,
        question: card.question,
        criterionId: card.criterionId,
      })
    }
    for (const card of confirmCards) {
      cards.push({
        id: card.id,
        title: card.title,
        importance: "élevée",
        kind: "confirm",
        estimatedImpact: null,
        cvSection: null,
        fromCv: null,
        rewrite: null,
        keywords: [],
        question: card.question,
        criterionId: card.criterionId,
      })
    }
    return cards.slice(0, 4)
  }, [actionCards, confirmCards])

  if (analysisState === "analyzing") {
    return <AnalysisSkeleton analyzing={props.analyzing} title={job.title} />
  }

  if (analysisState === "idle_unanalyzed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyse ton offre</CardTitle>
          <p className="text-base text-muted-foreground">
            Ouvre « Optimiser mon CV » : l’analyse CV ↔ offre se lance
            automatiquement.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={props.onGoOptimize}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Optimiser mon CV
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (analysisState === "error") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-destructive" />
            Analyse impossible
          </CardTitle>
          <p className="text-base text-muted-foreground">
            {props.analyzeError ?? "Une erreur est survenue."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={props.onReAnalyze}>Relancer l’analyse</Button>
          <Button
            variant="outline"
            onClick={props.onReAnalyzeCv}
            disabled={props.cvAnalyzing}
          >
            Ré-analyser mon CV
          </Button>
        </CardContent>
      </Card>
    )
  }

  const confirmPropsFor = (
    title: string,
    question: string,
    criterionId: string
  ): ConfirmFlowProps => ({
    title,
    question,
    criterionId,
    confirmingId: props.confirmingId,
    confirmDetail: props.confirmDetail,
    confirmSaving: props.confirmSaving,
    onOpenConfirm: props.onOpenConfirm,
    onConfirmDetailChange: props.onConfirmDetailChange,
    onCancelConfirm: props.onCancelConfirm,
    onConfirmCriterion: props.onConfirmCriterion,
  })

  return (
    <div className="w-full space-y-8">
      {/* L1 — Héro score */}
      <Card className="w-full border-border/80 bg-gradient-to-b from-card to-muted/20">
        <CardContent className="space-y-6 pt-6">
          <div>
            <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
              Match avec ton profil
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
              <p
                className={cn(
                  "text-5xl font-bold tracking-tight tabular-nums",
                  meta.textColor
                )}
              >
                {typeof score === "number" ? score : "—"}
                <span className="text-2xl text-muted-foreground"> / 100</span>
              </p>
              <p className="pb-1 text-lg font-medium">{meta.label}</p>
            </div>
            <ScoreSegments
              filled={typeof score === "number" ? Math.round(score / 10) : 0}
              colorClass={meta.barColor}
              className="mt-4 max-w-xl"
            />
            {whyScore.context ? (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/90">
                {whyScore.context}
              </p>
            ) : whyScore.bullets.length > 0 ? (
              <ul className="mt-4 max-w-xl space-y-2 text-base leading-relaxed text-foreground/90">
                {whyScore.bullets.map((item, index) => (
                  <li key={`overview-bullet-${index}`} className="flex gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/50"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : narrative ? (
              <div className="mt-4 max-w-xl space-y-1 text-base">
                <p>
                  <span className="font-medium">Sur ton CV : </span>
                  <span className="text-muted-foreground">{narrative.fromCv}</span>
                </p>
                <p>
                  <span className="font-medium">La fiche demande : </span>
                  <span className="text-muted-foreground">{narrative.fromJob}</span>
                </p>
              </div>
            ) : (
              <p className="mt-4 max-w-xl text-base text-muted-foreground">
                {meta.summary}
              </p>
            )}

            {projected && typeof projected.current === "number" ? (
              typeof projected.projected === "number" &&
              projected.projected !== projected.current &&
              projected.safeSuggestionCount > 0 ? (
                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border/80 bg-background/60 px-4 py-3">
                  <p className="text-base font-medium">
                    Potentiel après optimisation
                  </p>
                  <p className="text-xl font-semibold tabular-nums">
                    {projected.current}
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="text-emerald-500">{projected.projected}</span>
                    <span className="ml-1 text-emerald-500/80">
                      (+{projected.projected - projected.current} pts)
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-base text-emerald-400/90">
                  Ton CV est déjà bien optimisé pour cette offre.
                </p>
              )
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={props.onGoOptimize} className="sm:min-w-52">
              <WandSparkles className="mr-1.5 h-4 w-4" />
              Optimiser mon CV
            </Button>
            <Button
              variant="outline"
              onClick={props.onReAnalyze}
              disabled={props.analyzing}
            >
              Ré-analyser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* L2 — Tes actions prioritaires */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tes actions prioritaires</CardTitle>
          <p className="text-base text-muted-foreground">
            Les changements qui font gagner le plus de points, en priorité.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorityActions.length === 0 ? (
            <p className="text-base text-muted-foreground">
              Aucune action prioritaire — ton CV couvre déjà bien cette offre.
            </p>
          ) : (
            priorityActions.map((action, index) => (
              <div
                key={action.id}
                className="overflow-hidden rounded-[18px] border border-border bg-card shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-4 py-3">
                  <div>
                    <p className="font-medium">
                      {index + 1}. {action.title}
                    </p>
                    {action.cvSection ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Section CV : {action.cvSection}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ImportanceBadge level={action.importance} />
                    {typeof action.estimatedImpact === "number" ? (
                      <Badge variant="secondary">
                        Impact estimé +{action.estimatedImpact}
                      </Badge>
                    ) : null}
                    {action.kind === "confirm" ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 text-amber-100"
                      >
                        À confirmer
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {action.kind === "safe_rewrite" ? (
                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="border-border/70 bg-muted/40 p-4 md:border-r">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Sur ton CV
                      </p>
                      <p className="whitespace-pre-wrap text-base font-medium text-foreground">
                        {action.fromCv || "Extrait CV non disponible."}
                      </p>
                    </div>
                    <div className="bg-background/40 p-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Reformulation + mots-clés ATS
                      </p>
                      <p className="whitespace-pre-wrap text-base font-medium text-emerald-400">
                        {action.rewrite}
                      </p>
                      {action.keywords.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {action.keywords.map((keyword) => (
                            <Badge key={keyword} variant="outline">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3">
                        <Button size="sm" onClick={props.onGoOptimize}>
                          Voir dans Optimiser
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : action.kind === "confirm" && action.criterionId ? (
                  <div className="p-4">
                    <CriterionConfirm
                      title={action.title}
                      question={
                        action.question || "À confirmer avant de modifier ton CV."
                      }
                      criterionId={action.criterionId}
                      confirmingId={props.confirmingId}
                      confirmDetail={props.confirmDetail}
                      confirmSaving={props.confirmSaving}
                      onOpenConfirm={props.onOpenConfirm}
                      onConfirmDetailChange={props.onConfirmDetailChange}
                      onCancelConfirm={props.onCancelConfirm}
                      onConfirmCriterion={props.onConfirmCriterion}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    <p className="text-base text-muted-foreground">
                      {action.kind === "confirm"
                        ? action.question ||
                          "À confirmer avant d’ajouter quoi que ce soit sur ton CV."
                        : action.fromCv ||
                          "Écart identifié entre ton CV et les attentes de l’offre — pas de reformulation sûre sans inventer."}
                    </p>
                    {action.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {action.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={props.onGoOptimize}
                    >
                      {action.kind === "confirm"
                        ? "Voir à confirmer"
                        : "Voir Optimiser mon CV"}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* L3 — Points forts / à renforcer */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Points forts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {highlights.strengths.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Aucun point fort listé pour cette analyse.
              </p>
            ) : (
              highlights.strengths.slice(0, 5).map((reason) => (
                <div
                  key={reason}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 text-base text-emerald-300/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{reason}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto shrink-0 px-2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => scrollToDetail(reason)}
                  >
                    Voir le détail
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>À renforcer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {highlights.gaps.length === 0 &&
            (job.keywords_missing ?? []).length === 0 ? (
              <p className="text-base text-muted-foreground">
                Pas d’écart prioritaire détecté.
              </p>
            ) : (
              <>
                {highlights.gaps.slice(0, 5).map((gap) => (
                  <div
                    key={gap}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2 text-base text-amber-200/90">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{gap}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto shrink-0 px-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => scrollToDetail(gap)}
                    >
                      Voir le détail
                    </Button>
                  </div>
                ))}
                {criteriaRows.length === 0
                  ? (job.keywords_missing ?? []).slice(0, 4).map((keyword) => (
                      <div
                        key={keyword}
                        className="flex items-start gap-2 text-base text-amber-200/90"
                      >
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{keyword}</span>
                      </div>
                    ))
                  : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* L4 — Analyse détaillée */}
      <Card id="analyse-detaillee" className="w-full">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Analyse détaillée</CardTitle>
            <p className="text-base text-muted-foreground">
              Clique sur chaque critère pour comprendre ton score et voir ce que
              l’offre attend.
            </p>
          </div>
          {criteriaRows.length > 0 ? (
            <Badge variant="secondary">
              {criteriaRows.length} critère{criteriaRows.length > 1 ? "s" : ""}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {criteriaRows.length > 0 ? (
            criteriaRows.map((row) => (
              <CriterionRow
                key={row.id}
                row={row}
                open={openDetailIds.has(row.id)}
                onToggle={() => toggleDetail(row.id)}
                confirmProps={confirmPropsFor(
                  row.label,
                  row.question ?? "As-tu déjà cette expérience ?",
                  row.id
                )}
              />
            ))
          ) : subScores.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {subScores.slice(0, 4).map((subScore) => (
                <div
                  key={subScore.id}
                  className="rounded-xl border border-border/70 bg-background/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-base font-medium">{subScore.label}</p>
                    <span className="text-base font-semibold tabular-nums">
                      {typeof subScore.score === "number"
                        ? `${subScore.score}%`
                        : "—"}
                    </span>
                  </div>
                  <ScoreSegments
                    filled={
                      typeof subScore.score === "number"
                        ? Math.round(subScore.score / 10)
                        : 0
                    }
                    colorClass={
                      typeof subScore.score === "number" && subScore.score >= 75
                        ? "bg-emerald-500"
                        : typeof subScore.score === "number" && subScore.score >= 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base text-muted-foreground">
              Relance l’analyse pour obtenir le détail critère par critère.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}