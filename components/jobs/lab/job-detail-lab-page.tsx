"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Mic,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/layout/app-shell"
import { StickyPageHeader } from "@/components/layout/sticky-page-header"
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  buildCriteriaRows,
  buildKeywordRows,
  buildOptimizeBuckets,
  buildPriorityActions,
  buildSubScores,
  criteriaDerivedHighlights,
  estimatePotentialScore,
  formatExperiencePeriod,
  hasJobFitResult,
  isSafeSuggestion,
  matchVerdict,
  offerMissionHints,
  offerSkillHints,
  resolveLabAnalysisState,
  type LabCriterionRow,
} from "@/lib/jobs/job-detail-lab-model"
import { getMatchScoreColor, getStatusColor } from "@/lib/jobs/utils"
import { cn } from "@/lib/utils"
import type { CvAnalysisResponse, Job, JobStatus } from "@/types"
import { JOB_STATUSES } from "@/types"

type JobDetailLabPageProps = {
  jobId: string
}

type LabTab = "overview" | "offer" | "optimize" | "apply"

const ANALYSIS_STEPS = [
  "Lecture de l’offre",
  "Extraction des compétences",
  "Comparaison avec ton CV",
  "Analyse ATS",
  "Création des recommandations",
] as const

function ScoreBar({ value }: { value: number | null }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          typeof value !== "number"
            ? "bg-muted-foreground/20"
            : value >= 70
              ? "bg-emerald-500"
              : value >= 45
                ? "bg-amber-500"
                : "bg-orange-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ImportanceBadge({
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

function EvidenceLevelBadge({ row }: { row: LabCriterionRow }) {
  const tone =
    row.levelTone === "strong"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : row.levelTone === "good"
        ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
        : row.levelTone === "weak"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
          : "border-border bg-muted text-muted-foreground"
  return (
    <Badge variant="outline" className={cn(tone)}>
      {row.evidenceLevel}/3 · {row.levelLabel}
    </Badge>
  )
}

export function JobDetailLabPage({ jobId }: JobDetailLabPageProps) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [cvLoading, setCvLoading] = useState(true)
  const [cvAnalyzing, setCvAnalyzing] = useState(false)
  const [cvAnalysis, setCvAnalysis] = useState<CvAnalysisResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [tab, setTab] = useState<LabTab>("overview")
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set())
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [draftRewrites, setDraftRewrites] = useState<Record<string, string>>({})
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmDetail, setConfirmDetail] = useState("")
  const [confirmSaving, setConfirmSaving] = useState(false)
  const autoJobAnalyzeStarted = useRef(false)

  const loadJob = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      const payload = (await res.json()) as { job?: Job; error?: string }
      if (!res.ok || !payload.job) {
        throw new Error(payload.error ?? "Job introuvable")
      }
      setJob(payload.job)
      return payload.job
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement échoué")
      setJob(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [jobId])

  const loadCvAnalysis = useCallback(async () => {
    setCvLoading(true)
    try {
      const res = await fetch("/api/profile/analyze-cv")
      const payload = (await res.json()) as {
        analysis?: CvAnalysisResponse | null
        error?: string
      }
      if (!res.ok) {
        throw new Error(payload.error ?? "Impossible de charger l’analyse CV")
      }
      setCvAnalysis(payload.analysis ?? null)
    } catch {
      setCvAnalysis(null)
    } finally {
      setCvLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data bootstrap on mount
    void loadJob()
    void loadCvAnalysis()
  }, [loadJob, loadCvAnalysis])

  async function updateJob(
    updates: Partial<Pick<Job, "status" | "selected" | "cover_letter">>
  ) {
    if (!job) return
    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, ...updates }),
    })
    const payload = (await res.json()) as { job?: Job; error?: string }
    if (!res.ok || !payload.job) {
      toast.error(payload.error ?? "Mise à jour échouée")
      return
    }
    setJob(payload.job)
  }

  async function handleAnalyze(options?: { silent?: boolean }) {
    if (!job) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      })
      const payload = (await res.json()) as { job?: Job; error?: string }
      if (!res.ok) {
        throw new Error(payload.error ?? "Analyse échouée")
      }
      if (payload.job) setJob(payload.job)
      else await loadJob()
      if (!options?.silent) toast.success("Analyse terminée")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analyse offre échouée"
      setAnalyzeError(message)
      if (options?.silent) {
        const permanent = /cv|settings|candidat|unauthorized|401/i.test(message)
        if (!permanent) autoJobAnalyzeStarted.current = false
      } else {
        toast.error(message)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleRunCvAnalysis() {
    setCvAnalyzing(true)
    try {
      const res = await fetch("/api/profile/analyze-cv", { method: "POST" })
      const payload = (await res.json()) as {
        analysis?: CvAnalysisResponse
        error?: string
      }
      if (!res.ok || !payload.analysis) {
        throw new Error(payload.error ?? "Analyse CV échouée")
      }
      setCvAnalysis(payload.analysis)
      toast.success("Analyse CV terminée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse CV échouée")
    } finally {
      setCvAnalyzing(false)
    }
  }

  async function handleConfirmCriterion(
    criterionId: string,
    answer: "yes" | "no"
  ) {
    if (!job) return
    if (answer === "yes" && !confirmDetail.trim() && confirmingId === criterionId) {
      toast.message("Ajoute un détail court pour remonter le niveau de preuve.")
    }
    setConfirmSaving(true)
    try {
      const res = await fetch("/api/analyze-job/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          criterionId,
          answer,
          detail: answer === "yes" ? confirmDetail.trim() || null : null,
        }),
      })
      const payload = (await res.json()) as { job?: Job; error?: string }
      if (!res.ok || !payload.job) {
        throw new Error(payload.error ?? "Confirmation échouée")
      }
      setJob(payload.job)
      setConfirmingId(null)
      setConfirmDetail("")
      toast.success(
        answer === "yes" ? "Critère confirmé — score mis à jour" : "Critère marqué comme non"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Confirmation échouée"
      )
    } finally {
      setConfirmSaving(false)
    }
  }

  useEffect(() => {
    autoJobAnalyzeStarted.current = false
  }, [jobId])

  useEffect(() => {
    if (!job || loading || analyzing || autoJobAnalyzeStarted.current) return
    if (typeof job.match_score === "number" && job.job_posting_summary) return
    // Skip re-analysis when job-fit artifacts already exist (even with null match_score)
    if (hasJobFitResult(job)) return
    autoJobAnalyzeStarted.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto analysis
    void handleAnalyze({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto analysis
  }, [job?.id, job?.match_score, job?.job_posting_summary, loading, analyzing])

  async function handleGenerateCoverLetter() {
    if (!job) return
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      })
      const payload = (await res.json()) as {
        job?: Job
        cover_letter?: string
        coverLetter?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(payload.error ?? "Génération échouée")
      }
      if (payload.job) setJob(payload.job)
      else if (payload.cover_letter || payload.coverLetter) {
        const letter = payload.cover_letter ?? payload.coverLetter ?? null
        setJob((prev) => (prev ? { ...prev, cover_letter: letter } : prev))
      } else {
        await loadJob()
      }
      setCoverOpen(true)
      toast.success("Lettre générée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Génération échouée")
    } finally {
      setGenerating(false)
    }
  }

  const analysisState = resolveLabAnalysisState({
    analyzing,
    error: analyzeError,
    job,
  })

  const optimize = useMemo(
    () => (job ? buildOptimizeBuckets(job, cvAnalysis) : null),
    [job, cvAnalysis]
  )

  const safeCount = optimize?.safe.filter((i) => !ignoredIds.has(i.id)).length ?? 0
  const potentialScore = job
    ? estimatePotentialScore(
        job.match_score,
        safeCount,
        job.keywords_missing?.length ?? 0
      )
    : null

  const subScores = job ? buildSubScores(job) : []
  const criteriaRows = job ? buildCriteriaRows(job) : []
  const highlights = job
    ? criteriaDerivedHighlights(job)
    : { strengths: [], gaps: [] }
  const actions = job ? buildPriorityActions(job) : []
  const keywordRows = job ? buildKeywordRows(job) : []
  const verdict = matchVerdict(job?.match_score ?? null)
  const missions = job ? offerMissionHints(job) : []
  const skills = job ? offerSkillHints(job) : { hard: [], soft: [] }

  function handleApplySuggestion(id: string, rewrite: string | null) {
    if (!rewrite?.trim()) {
      toast.message("Aucune reformulation sûre à appliquer")
      return
    }
    setAppliedIds((prev) => new Set(prev).add(id))
    setDraftRewrites((prev) => ({ ...prev, [id]: rewrite }))
    toast.success("Suggestion appliquée localement (aperçu)")
  }

  function handleApplyAllSafe() {
    if (!optimize) return
    const nextApplied = new Set(appliedIds)
    const nextDrafts = { ...draftRewrites }
    let count = 0
    for (const item of optimize.safe) {
      if (ignoredIds.has(item.id) || !item.suggested_rewrite) continue
      nextApplied.add(item.id)
      nextDrafts[item.id] = item.suggested_rewrite
      count += 1
    }
    setAppliedIds(nextApplied)
    setDraftRewrites(nextDrafts)
    toast.success(
      count > 0
        ? `${count} suggestion(s) appliquée(s) localement`
        : "Aucune suggestion sûre disponible"
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l’offre…
        </div>
      </AppShell>
    )
  }

  if (!job) {
    return (
      <AppShell>
        <div className="space-y-4">
          <p className="text-base text-muted-foreground">Offre introuvable.</p>
          <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux jobs
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <TooltipProvider>
        <div className="mx-auto max-w-[1200px]">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as LabTab)}
            className="gap-4"
          >
            <StickyPageHeader className="mb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/jobs"
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour aux offres
                    </Link>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
                  <p className="text-muted-foreground">{job.company}</p>
                  <div className="flex flex-wrap gap-2 text-base text-muted-foreground">
                    <Badge variant="tag">{job.source}</Badge>
                    {job.location ? <span>{job.location}</span> : null}
                    {job.contract_type ? (
                      <Badge variant="tag">{job.contract_type}</Badge>
                    ) : null}
                    {job.remote ? <Badge variant="tag">Remote</Badge> : null}
                    <Badge className={getStatusColor(job.status)} variant="secondary">
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Offre source
                  </a>
                  <Select
                    value={job.status}
                    onValueChange={(value) => {
                      if (!value) return
                      void updateJob({ status: value as JobStatus })
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsList aria-label="Nouvelle UX détail offre" className="h-auto flex-wrap">
                <TabsTrigger value="overview">Vue d’ensemble</TabsTrigger>
                <TabsTrigger value="offer">Offre</TabsTrigger>
                <TabsTrigger value="optimize">Optimiser mon CV</TabsTrigger>
                <TabsTrigger value="apply">Candidature</TabsTrigger>
              </TabsList>
            </StickyPageHeader>

            <TabsContent value="overview" className="space-y-4">
              {analysisState === "analyzing" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Analyse de ton offre</CardTitle>
                    <p className="text-base text-muted-foreground">
                      Comparaison en cours avec ton CV…
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {ANALYSIS_STEPS.map((step) => (
                        <div
                          key={step}
                          className="flex items-center gap-2 text-base text-muted-foreground"
                        >
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {step}
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ) : null}

              {analysisState === "idle_unanalyzed" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Analyse ton offre</CardTitle>
                    <p className="text-base text-muted-foreground">
                      Identifie les compétences communes et les éléments à renforcer avant
                      de candidater.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => void handleAnalyze()} disabled={analyzing}>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      Analyser cette offre
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {analysisState === "error" ? (
                <Card className="border-destructive/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CircleAlert className="h-5 w-5 text-destructive" />
                      Analyse impossible
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      {analyzeError ?? "Une erreur est survenue."}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleAnalyze()}>
                      Relancer l’analyse
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleRunCvAnalysis()}
                      disabled={cvAnalyzing}
                    >
                      Ré-analyser mon CV
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {analysisState === "ready" ? (
                <>
                  <Card className="border-border/80 bg-gradient-to-b from-card to-muted/20">
                    <CardContent className="space-y-6 pt-6">
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
                            Match avec ton profil
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-5xl font-bold tracking-tight",
                              typeof job.match_score === "number"
                                ? getMatchScoreColor(job.match_score)
                                : "text-muted-foreground"
                            )}
                          >
                            {typeof job.match_score === "number"
                              ? `${job.match_score}`
                              : "—"}
                            <span className="text-2xl text-muted-foreground"> / 100</span>
                          </p>
                          <p className="mt-2 text-lg font-medium">{verdict.label}</p>
                          <p className="mt-1 max-w-2xl text-base text-muted-foreground">
                            {job.score_explanation?.trim() || verdict.summary}
                          </p>
                          <p className="mt-3 text-base text-muted-foreground">
                            Indicateur d’adéquation documentée (critères × preuves), pas une
                            probabilité d’embauche.
                          </p>
                        </div>
                        <div className="min-w-[180px] rounded-xl border border-border/80 bg-background/60 p-4">
                          <p className="text-base uppercase tracking-wide text-muted-foreground">
                            Potentiel après optimisation
                          </p>
                          <p className="mt-2 text-2xl font-semibold">
                            {typeof job.match_score === "number" ? job.match_score : "—"}
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span className="text-emerald-400">
                              {potentialScore ?? "—"}
                            </span>
                          </p>
                          <p className="mt-2 text-base text-muted-foreground">
                            Estimation UI si tu appliques les reformulations sûres. Le
                            backend ne recalcule pas encore ce score.
                          </p>
                        </div>
                      </div>

                      {criteriaRows.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <p className="text-base font-medium">Grille critères × preuves</p>
                              <p className="text-base text-muted-foreground">
                                Critères extraits de l’offre, pondérés, notés 0–3 selon le CV.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {criteriaRows.map((row) => (
                              <div
                                key={row.id}
                                className="rounded-xl border border-border/70 bg-background/50 p-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium">{row.label}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <EvidenceLevelBadge row={row} />
                                      <Badge variant="secondary">
                                        Poids {row.weightPercent}%
                                      </Badge>
                                      {row.recruiterBlockRisk === "high" ? (
                                        <Badge
                                          variant="outline"
                                          className="border-orange-500/40 text-orange-200"
                                        >
                                          Must-have
                                        </Badge>
                                      ) : null}
                                      {row.confirmationStatus === "confirmed" ? (
                                        <Badge
                                          variant="outline"
                                          className="border-emerald-500/40 text-emerald-200"
                                        >
                                          Confirmé
                                        </Badge>
                                      ) : null}
                                      {row.confirmationStatus === "denied" ? (
                                        <Badge variant="outline">Non confirmé</Badge>
                                      ) : null}
                                    </div>
                                    {row.evidenceFromCv ? (
                                      <p className="mt-2 text-base text-muted-foreground">
                                        CV : {row.evidenceFromCv}
                                      </p>
                                    ) : null}
                                    {row.question ? (
                                      <p className="mt-2 text-base text-amber-100/90">
                                        À confirmer : {row.question}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-base tabular-nums text-muted-foreground">
                                    +{row.scoreContribution} pts
                                  </div>
                                </div>

                                {row.needsConfirmation ? (
                                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                                    {confirmingId === row.id ? (
                                      <>
                                        <Textarea
                                          value={confirmDetail}
                                          onChange={(event) =>
                                            setConfirmDetail(event.target.value)
                                          }
                                          placeholder="Ex. 2 ans sur un portefeuille Assurance Vie chez X, résultats…"
                                          rows={3}
                                          aria-label={`Détail pour ${row.label}`}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            disabled={confirmSaving}
                                            onClick={() =>
                                              void handleConfirmCriterion(row.id, "yes")
                                            }
                                          >
                                            {confirmSaving ? (
                                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            ) : null}
                                            Oui, j’ai cette expérience
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={confirmSaving}
                                            onClick={() =>
                                              void handleConfirmCriterion(row.id, "no")
                                            }
                                          >
                                            Non
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={confirmSaving}
                                            onClick={() => {
                                              setConfirmingId(null)
                                              setConfirmDetail("")
                                            }}
                                          >
                                            Annuler
                                          </Button>
                                        </div>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setConfirmingId(row.id)
                                          setConfirmDetail("")
                                        }}
                                      >
                                        Répondre
                                      </Button>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : subScores.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {subScores.slice(0, 4).map((score) => (
                          <div
                            key={score.id}
                            className="rounded-xl border border-border/70 bg-background/50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <Tooltip>
                                <TooltipTrigger
                                  className="text-left text-base font-medium underline-offset-2 hover:underline"
                                  type="button"
                                >
                                  {score.label}
                                </TooltipTrigger>
                                <TooltipContent>{score.tooltip}</TooltipContent>
                              </Tooltip>
                              <span className="text-base font-semibold tabular-nums">
                                {typeof score.score === "number" ? `${score.score}%` : "—"}
                              </span>
                            </div>
                            <ScoreBar value={score.score} />
                          </div>
                        ))}
                      </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setTab("optimize")}>
                          <WandSparkles className="mr-1.5 h-4 w-4" />
                          Optimiser mon CV
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void handleAnalyze()}
                          disabled={analyzing}
                        >
                          Ré-analyser l’offre
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tes actions prioritaires</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {actions.length === 0 ? (
                        <p className="text-base text-muted-foreground">
                          Aucune action prioritaire — ton CV couvre déjà bien cette offre.
                        </p>
                      ) : (
                        actions.map((action, index) => (
                          <div
                            key={action.id}
                            className="rounded-xl border border-border/70 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {index + 1}. {action.title}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <ImportanceBadge level={action.importance} />
                                  {typeof action.estimatedImpact === "number" ? (
                                    <Badge variant="secondary">
                                      Impact estimé : +{action.estimatedImpact}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setTab("optimize")}
                              >
                                {action.cta === "suggestion"
                                  ? "Voir la suggestion"
                                  : "Voir les expériences"}
                              </Button>
                            </div>
                            <p className="mt-3 text-base text-muted-foreground">
                              {action.reason}
                            </p>
                            {action.experienceHint ? (
                              <p className="mt-2 text-base text-muted-foreground">
                                Expérience concernée : {action.experienceHint}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

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
                          highlights.strengths.map((reason) => (
                            <div
                              key={reason}
                              className="flex items-start gap-2 text-base text-emerald-300/90"
                            >
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{reason}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Points à renforcer</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {highlights.gaps.length === 0 &&
                        (job.keywords_missing ?? []).length === 0 ? (
                          <p className="text-base text-muted-foreground">
                            Pas d’écart prioritaire détecté.
                          </p>
                        ) : (
                          <>
                            {highlights.gaps.map((gap) => (
                              <div
                                key={gap}
                                className="flex items-start gap-2 text-base text-amber-200/90"
                              >
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{gap}</span>
                              </div>
                            ))}
                            {criteriaRows.length === 0
                              ? (job.keywords_missing ?? []).slice(0, 4).map((kw) => (
                                  <div
                                    key={kw}
                                    className="flex items-start gap-2 text-base text-amber-200/90"
                                  >
                                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{kw}</span>
                                  </div>
                                ))
                              : null}
                            {highlights.gaps.length > 0 ? (
                              <Button
                                size="sm"
                                variant="link"
                                className="h-auto px-0"
                                onClick={() => setTab("optimize")}
                              >
                                Voir les actions dans Optimiser mon CV
                              </Button>
                            ) : null}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="offer" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Résumé du poste</CardTitle>
                </CardHeader>
                <CardContent>
                  {job.job_posting_summary ? (
                    <p className="text-base leading-relaxed text-foreground/90">
                      {job.job_posting_summary}
                    </p>
                  ) : (
                    <p className="text-base text-muted-foreground">
                      Lance l’analyse pour obtenir un résumé structuré de l’offre.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Missions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {missions.length > 0 ? (
                      missions.map((mission) => (
                        <p key={mission} className="text-base text-muted-foreground">
                          • {mission}
                        </p>
                      ))
                    ) : (
                      <p className="text-base text-muted-foreground">
                        Missions non structurées — voir le résumé ou l’offre originale.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-base">
                    <p>
                      <span className="text-muted-foreground">Contrat : </span>
                      {job.contract_type || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Localisation : </span>
                      {job.location || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Remote : </span>
                      {job.remote ? "Oui" : job.remote_mode || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Salaire : </span>
                      {job.salary || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Expérience min. : </span>
                      {typeof job.experience_min_years === "number"
                        ? `${job.experience_min_years} ans`
                        : "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Langue : </span>
                      {job.language || "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Compétences recherchées</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {skills.hard.length === 0 ? (
                    <p className="text-base text-muted-foreground">
                      Aucune compétence structurée — les mots-clés ATS ci-dessous
                      complètent la lecture.
                    </p>
                  ) : (
                    skills.hard.map((skill) => (
                      <Badge key={skill} variant="tag">
                        {skill}
                      </Badge>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mots-clés ATS</CardTitle>
                  <p className="text-base text-muted-foreground">
                    Importance estimée à partir des absences / présences détectées.
                    Le nombre d’occurrences n’est pas encore fourni par le backend.
                  </p>
                </CardHeader>
                <CardContent>
                  {keywordRows.length === 0 ? (
                    <p className="text-base text-muted-foreground">
                      Analyse l’offre pour extraire les mots-clés ATS.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mot-clé</TableHead>
                          <TableHead>Importance</TableHead>
                          <TableHead>Occurrences</TableHead>
                          <TableHead>Présence CV</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keywordRows.map((row) => (
                          <TableRow key={row.keyword}>
                            <TableCell className="font-medium">{row.keyword}</TableCell>
                            <TableCell>
                              <ImportanceBadge level={row.importance} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  row.presence === "Présent" &&
                                    "border-emerald-500/40 text-emerald-300",
                                  row.presence === "Absent" &&
                                    "border-orange-500/40 text-orange-200"
                                )}
                              >
                                {row.presence}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <details className="rounded-xl border border-border/70 bg-card p-4">
                <summary className="cursor-pointer text-base font-medium">
                  Afficher l’offre originale
                </summary>
                <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap text-base text-muted-foreground">
                  {(job.description || job.summary || "").trim() ||
                    "Aucun texte brut importé."}
                </pre>
              </details>
            </TabsContent>

            <TabsContent value="optimize" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle>Optimiser mon CV pour cette offre</CardTitle>
                    <p className="mt-1 text-base text-muted-foreground">
                      Reformulations uniquement à partir de preuves présentes dans ton CV.
                      Jamais d’invention de faits, chiffres ou compétences.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRunCvAnalysis()}
                      disabled={cvAnalyzing || cvLoading}
                    >
                      {cvAnalyzing ? "Analyse…" : "Ré-analyser mon CV"}
                    </Button>
                    <Button size="sm" onClick={handleApplyAllSafe}>
                      Appliquer toutes les suggestions sûres
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="text-base uppercase text-muted-foreground">Score actuel</p>
                    <p
                      className={cn(
                        "mt-1 text-3xl font-bold",
                        typeof job.match_score === "number"
                          ? getMatchScoreColor(job.match_score)
                          : "text-muted-foreground"
                      )}
                    >
                      {typeof job.match_score === "number" ? job.match_score : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="text-base uppercase text-muted-foreground">
                      Score estimé après optimisation
                    </p>
                    <p className="mt-1 text-3xl font-bold text-emerald-400">
                      {potentialScore ?? "—"}
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                      Heuristique UI — à remplacer par un re-score backend.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {optimize && optimize.toConfirm.length > 0 ? (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle>À confirmer</CardTitle>
                    <p className="text-base text-muted-foreground">
                      À ajouter uniquement si cela correspond réellement à ton expérience.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {optimize.toConfirm
                      .filter((item) => !ignoredIds.has(item.id))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border/70 p-4"
                        >
                          <p className="font-medium">{item.action}</p>
                          <p className="mt-2 text-base text-muted-foreground">
                            {item.information_to_confirm ||
                              item.evidence_from_job ||
                              "Confirmation utilisateur requise."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setIgnoredIds((prev) => new Set(prev).add(item.id))
                              }
                            >
                              Ignorer
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Suggestions sûres & expériences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!optimize || optimize.byExperience.length === 0 ? (
                    <p className="text-base text-muted-foreground">
                      {cvLoading
                        ? "Chargement des expériences CV…"
                        : "Aucune suggestion pour cette offre. Relance l’analyse si besoin."}
                    </p>
                  ) : (
                    optimize.byExperience.map((group) => {
                      const exp = group.experience
                      const visibleItems = group.items.filter(
                        (item) => !ignoredIds.has(item.id)
                      )
                      if (!exp && visibleItems.length === 0) return null
                      return (
                        <div
                          key={group.experienceKey}
                          className="rounded-xl border border-border/70 p-4"
                        >
                          {exp ? (
                            <div className="mb-3">
                              <p className="text-base uppercase tracking-wide text-muted-foreground">
                                {exp.organization || "Expérience"}
                              </p>
                              <p className="font-semibold">{exp.title}</p>
                              <p className="text-base text-muted-foreground">
                                {formatExperiencePeriod(exp)}
                              </p>
                            </div>
                          ) : (
                            <p className="mb-3 text-base font-medium">
                              Suggestions non rattachées à une expérience
                            </p>
                          )}

                          {exp?.highlights ? (
                            <div className="mb-4 rounded-lg bg-muted/40 p-3">
                              <p className="text-base uppercase text-muted-foreground">
                                Texte actuel
                              </p>
                              <p className="mt-1 text-base whitespace-pre-wrap">
                                {exp.highlights}
                              </p>
                            </div>
                          ) : null}

                          {visibleItems.length === 0 ? (
                            <p className="text-base text-muted-foreground">
                              Pas de suggestion ciblée pour cette expérience.
                            </p>
                          ) : (
                            visibleItems.map((item) => {
                              const applied = appliedIds.has(item.id)
                              const rewrite =
                                draftRewrites[item.id] ?? item.suggested_rewrite
                              const safe = isSafeSuggestion(item)
                              return (
                                <div
                                  key={item.id}
                                  className="mt-3 rounded-lg border border-border/60 p-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <ImportanceBadge
                                      level={
                                        item.priority === "high"
                                          ? "élevée"
                                          : item.priority === "medium"
                                            ? "moyenne"
                                            : "faible"
                                      }
                                    />
                                    {safe ? (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-500/40 text-emerald-300"
                                      >
                                        Suggestion sûre
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-500/40 text-amber-200"
                                      >
                                        À confirmer
                                      </Badge>
                                    )}
                                    {applied ? (
                                      <Badge variant="secondary">Appliquée (aperçu)</Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-base font-medium">{item.action}</p>
                                  {rewrite ? (
                                    <div className="mt-3 space-y-1">
                                      <p className="text-base uppercase text-muted-foreground">
                                        Suggestion pour cette offre
                                      </p>
                                      <Textarea
                                        value={rewrite}
                                        onChange={(e) =>
                                          setDraftRewrites((prev) => ({
                                            ...prev,
                                            [item.id]: e.target.value,
                                          }))
                                        }
                                        className="min-h-24"
                                      />
                                    </div>
                                  ) : null}
                                  <p className="mt-3 text-base text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Pourquoi ?{" "}
                                    </span>
                                    {item.evidence_from_job ||
                                      item.evidence_from_cv ||
                                      "Alignement avec le vocabulaire de l’offre."}
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      disabled={!rewrite?.trim()}
                                      onClick={() =>
                                        handleApplySuggestion(item.id, rewrite)
                                      }
                                    >
                                      Appliquer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setIgnoredIds((prev) => new Set(prev).add(item.id))
                                      }
                                    >
                                      Ignorer
                                    </Button>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apply" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Lettre de motivation
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      Génère une lettre personnalisée à partir de ton CV et de cette offre.
                    </p>
                    {job.cover_letter_angle ? (
                      <p className="text-base text-muted-foreground">
                        Angle suggéré : {job.cover_letter_angle}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => void handleGenerateCoverLetter()}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          Génération…
                        </>
                      ) : (
                        "Générer"
                      )}
                    </Button>
                    {job.cover_letter ? (
                      <>
                        <Textarea
                          value={job.cover_letter}
                          onChange={(e) =>
                            setJob((prev) =>
                              prev ? { ...prev, cover_letter: e.target.value } : prev
                            )
                          }
                          onBlur={() => {
                            if (job.cover_letter) {
                              void updateJob({ cover_letter: job.cover_letter })
                            }
                          }}
                          className="min-h-40"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCoverOpen(true)}
                        >
                          Ouvrir en grand
                        </Button>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="opacity-90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message LinkedIn
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      Génère un message court destiné au recruteur ou hiring manager.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button disabled variant="outline">
                      Bientôt — API à brancher
                    </Button>
                  </CardContent>
                </Card>

                <Card className="opacity-90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email de candidature
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      Génère un email adapté à cette candidature.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button disabled variant="outline">
                      Bientôt — API à brancher
                    </Button>
                  </CardContent>
                </Card>

                <Card className="opacity-90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Pitch entretien
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      Présentation de 30 à 60 secondes expliquant pourquoi ton profil
                      correspond.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button disabled variant="outline">
                      Bientôt — API à brancher
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="opacity-90">
                <CardHeader>
                  <CardTitle>Questions de candidature</CardTitle>
                  <p className="text-base text-muted-foreground">
                    Réponses guidées aux questions fréquentes — génération à brancher.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-base text-muted-foreground">
                  <p>• Pourquoi souhaitez-vous rejoindre l’entreprise ?</p>
                  <p>• Pourquoi êtes-vous adapté à ce poste ?</p>
                  <p>• Décrivez une expérience pertinente.</p>
                  <Button disabled variant="outline" className="mt-2">
                    Bientôt — API à brancher
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <CoverLetterModal
            job={coverOpen ? job : null}
            open={coverOpen}
            onOpenChange={setCoverOpen}
            onSave={async (_id, coverLetter) => {
              await updateJob({ cover_letter: coverLetter })
            }}
            onRegenerate={async () => {
              await handleGenerateCoverLetter()
            }}
            isRegenerating={generating}
          />
        </div>
      </TooltipProvider>
    </AppShell>
  )
}
