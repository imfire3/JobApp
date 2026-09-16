"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Mic,
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
import { AnalyzingProgressPanel } from "@/components/jobs/job-scoring-progress"
import {
  ImportanceBadge,
  JobDetailOverview,
} from "@/components/jobs/lab/job-detail-overview"
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
  TooltipProvider,
} from "@/components/ui/tooltip"
import { JOB_MATCH_PROMPT_VERSION } from "@/lib/ai/prompts/job-match"
import {
  buildKeywordRows,
  buildOptimizeBuckets,
  cvOriginalOf,
  hasJobFitResult,
  keywordsForCvImprovement,
  offerMissionHints,
  offerSkillHints,
  projectOptimizedScore,
  questionOf,
  reformulationOf,
  reasonOf,
  sectionOf,
  sourceOf,
} from "@/lib/jobs/job-detail-lab-model"
import { isJobFitCacheValidClient } from "@/lib/jobs/job-fit-cache-client"
import { jobStatusLabel } from "@/lib/jobs/status-labels"
import { getMatchScoreColor, getStatusColor } from "@/lib/jobs/utils"
import { cn } from "@/lib/utils"
import type { CvAnalysisResponse, Job, JobStatus } from "@/types"
import { JOB_STATUSES } from "@/types"

type JobDetailLabPageProps = {
  jobId: string
}

type LabTab = "overview" | "offer" | "optimize" | "apply"

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
  const [optimizePhase, setOptimizePhase] = useState<
    "idle" | "loading" | "success" | "error" | "cached"
  >("idle")
  const autoOptimizeKeyRef = useRef<string | null>(null)

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

  async function handleAnalyze(options?: { silent?: boolean; force?: boolean }) {
    if (!job) return
    setAnalyzing(true)
    setAnalyzeError(null)
    if (!options?.silent) setOptimizePhase("loading")
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
      setOptimizePhase("success")
      if (!options?.silent) toast.success("Analyse terminée")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analyse offre échouée"
      setAnalyzeError(message)
      setOptimizePhase("error")
      if (!options?.silent) toast.error(message)
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

  // Auto job↔CV analysis when opening Optimiser mon CV (cache-aware).
  useEffect(() => {
    if (tab !== "optimize") return
    if (!job || loading || cvLoading) return
    if (analyzing || cvAnalyzing) return

    if (isJobFitCacheValidClient(job, cvAnalysis, JOB_MATCH_PROMPT_VERSION)) {
      return
    }

    const runKey = `auto:${job.id}:${cvAnalysis?.cv_content_hash ?? "none"}:${cvAnalysis?.is_stale ? "1" : "0"}`
    if (autoOptimizeKeyRef.current === runKey) return
    autoOptimizeKeyRef.current = runKey

    let cancelled = false
    ;(async () => {
      setOptimizePhase("loading")
      setAnalyzeError(null)

      let analysis = cvAnalysis
      if (!analysis || analysis.is_stale) {
        setCvAnalyzing(true)
        try {
          const res = await fetch("/api/profile/analyze-cv", { method: "POST" })
          const payload = (await res.json()) as {
            analysis?: CvAnalysisResponse
            error?: string
          }
          if (res.ok && payload.analysis) {
            analysis = payload.analysis
            if (!cancelled) setCvAnalysis(payload.analysis)
          }
        } catch {
          // continue — job analyze may still work with saved CV
        } finally {
          if (!cancelled) setCvAnalyzing(false)
        }
      }

      if (cancelled) return

      if (
        analysis &&
        isJobFitCacheValidClient(job, analysis, JOB_MATCH_PROMPT_VERSION)
      ) {
        setOptimizePhase("idle")
        return
      }

      setAnalyzing(true)
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
        if (cancelled) return
        if (payload.job) setJob(payload.job)
        else await loadJob()
        setOptimizePhase("success")
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error ? error.message : "Analyse offre échouée"
        setAnalyzeError(message)
        setOptimizePhase("error")
      } finally {
        if (!cancelled) setAnalyzing(false)
      }
    })()

    return () => {
      cancelled = true
      // Allow Strict Mode remount to re-run the same key
      if (autoOptimizeKeyRef.current === runKey) {
        autoOptimizeKeyRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto once per optimize + cache inputs
  }, [
    tab,
    job?.id,
    job?.job_fit_cv_hash,
    job?.job_fit_job_hash,
    job?.job_fit_prompt_version,
    cvLoading,
    loading,
    cvAnalysis?.cv_content_hash,
    cvAnalysis?.is_stale,
  ])

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

  const optimizeCacheHit = Boolean(
    job &&
      isJobFitCacheValidClient(job, cvAnalysis, JOB_MATCH_PROMPT_VERSION)
  )
  const optimizeUiPhase: "idle" | "loading" | "success" | "error" | "cached" =
    analyzing || (optimizePhase === "loading" && !optimizeCacheHit)
      ? "loading"
      : optimizePhase === "error"
        ? "error"
        : optimizeCacheHit
          ? "cached"
          : optimizePhase === "success"
            ? "success"
            : "idle"

  const optimize = useMemo(
    () => (job ? buildOptimizeBuckets(job, cvAnalysis) : null),
    [job, cvAnalysis]
  )

  const projected = job ? projectOptimizedScore(job) : null
  const potentialScore = projected?.projected ?? null
  const keywordRows = job ? buildKeywordRows(job) : []
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
      const rewrite = reformulationOf(item)
      if (ignoredIds.has(item.id) || !rewrite) continue
      nextApplied.add(item.id)
      nextDrafts[item.id] = rewrite
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
                      {jobStatusLabel(job.status)}
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
                          {jobStatusLabel(status)}
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
              <JobDetailOverview
                job={job}
                analyzing={analyzing}
                analyzeError={analyzeError}
                cvAnalyzing={cvAnalyzing}
                onReAnalyze={() => void handleAnalyze()}
                onReAnalyzeCv={() => void handleRunCvAnalysis()}
                onGoOptimize={() => setTab("optimize")}
                confirmingId={confirmingId}
                confirmDetail={confirmDetail}
                confirmSaving={confirmSaving}
                onOpenConfirm={(criterionId) => {
                  setConfirmingId(criterionId)
                  setConfirmDetail("")
                }}
                onConfirmDetailChange={setConfirmDetail}
                onCancelConfirm={() => {
                  setConfirmingId(null)
                  setConfirmDetail("")
                }}
                onConfirmCriterion={(criterionId, answer) =>
                  void handleConfirmCriterion(criterionId, answer)
                }
              />
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
                      À gauche ta phrase CV — à droite la reformulation pour matcher
                      la fiche et les mots-clés ATS. Sans inventer de faits.
                    </p>
                    {optimizePhase === "cached" ? (
                      <p className="mt-1 text-base text-muted-foreground">
                        Analyse déjà à jour — aucun nouvel appel IA.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        autoOptimizeKeyRef.current = null
                        void handleAnalyze({ force: true })
                      }}
                      disabled={analyzing}
                    >
                      {analyzing ? "Analyse…" : "Relancer l’analyse"}
                    </Button>
                    <Button size="sm" onClick={handleApplyAllSafe}>
                      Appliquer toutes les suggestions sûres
                    </Button>
                  </div>
                </CardHeader>
                {(optimizePhase === "loading" || analyzing) &&
                !hasJobFitResult(job) ? (
                  <CardContent className="space-y-4">
                    <p className="text-base text-muted-foreground">
                      Analyse de votre CV par rapport à cette offre…
                    </p>
                    <AnalyzingProgressPanel
                      active={analyzing || optimizePhase === "loading"}
                      title={job.title}
                    />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </CardContent>
                ) : null}
                {optimizePhase === "error" && analyzeError ? (
                  <CardContent>
                    <div className="rounded-xl border border-destructive/40 p-4">
                      <p className="font-medium text-destructive">
                        Analyse impossible
                      </p>
                      <p className="mt-1 text-base text-muted-foreground">
                        {analyzeError}
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        onClick={() => {
                          autoOptimizeKeyRef.current = null
                          void handleAnalyze({ force: true })
                        }}
                      >
                        Relancer
                      </Button>
                    </div>
                  </CardContent>
                ) : null}
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
                      Recalcul critères si reformulations sûres (sans inventer).
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
                          {item.type === "confirmation_required" ? (
                            <p className="mt-1">
                              <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                                Requis dans l’offre
                              </Badge>
                            </p>
                          ) : null}
                          <p className="mt-2 text-base text-muted-foreground">
                            {questionOf(item) ||
                              sourceOf(item) ||
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
                  <CardTitle>Reformulations CV ↔ offre</CardTitle>
                  <p className="text-base text-muted-foreground">
                    Chaque carte compare ta phrase actuelle et une version alignée sur
                    le vocabulaire de l’offre.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!optimize ||
                  optimize.safe.filter((item) => !ignoredIds.has(item.id)).length ===
                    0 ? (
                    <p className="text-base text-muted-foreground">
                      {cvLoading || analyzing
                        ? "Chargement des suggestions…"
                        : "Aucune reformulation sûre pour cette offre. Relance l’analyse de l’offre pour en générer."}
                    </p>
                  ) : (
                    optimize.safe
                      .filter((item) => !ignoredIds.has(item.id))
                      .map((item, index) => {
                        const applied = appliedIds.has(item.id)
                        const rewrite =
                          draftRewrites[item.id] ?? reformulationOf(item)
                        const fromCv =
                          cvOriginalOf(item) ||
                          "Extrait CV non disponible — relance l’analyse."
                        const keywords = keywordsForCvImprovement(job, item)
                        return (
                          <div
                            key={item.id}
                            className="overflow-hidden rounded-[18px] border border-border bg-card shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-4 py-3">
                              <div>
                                <p className="font-medium">
                                  {index + 1}. {reasonOf(item)}
                                </p>
                                {sectionOf(item) ? (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Section CV : {sectionOf(item)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/40 text-emerald-300"
                                >
                                  Suggestion sûre
                                </Badge>
                                {applied ? (
                                  <Badge variant="secondary">Appliquée (aperçu)</Badge>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid gap-0 md:grid-cols-2">
                              <div className="border-border/70 bg-muted/40 p-4 md:border-r">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Sur ton CV
                                </p>
                                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                                  {fromCv}
                                </p>
                              </div>
                              <div className="bg-background/40 p-4">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Reformulation pour cette offre
                                </p>
                                <Textarea
                                  value={rewrite}
                                  onChange={(e) =>
                                    setDraftRewrites((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="min-h-28 border-emerald-500/20 bg-emerald-500/5 text-base leading-relaxed text-emerald-100"
                                  aria-label={`Reformulation pour ${item.action}`}
                                />
                                {keywords.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {keywords.map((keyword) => (
                                      <Badge key={keyword} variant="outline">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                                {reasonOf(item) ? (
                                  <p className="mt-3 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Pourquoi ?{" "}
                                    </span>
                                    {reasonOf(item)}
                                  </p>
                                ) : null}
                                {sourceOf(item) ? (
                                  <p className="mt-1.5 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Dans l’offre :{" "}
                                    </span>
                                    {sourceOf(item)}
                                  </p>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    disabled={!rewrite.trim()}
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
                                      setIgnoredIds((prev) =>
                                        new Set(prev).add(item.id)
                                      )
                                    }
                                  >
                                    Ignorer
                                  </Button>
                                </div>
                              </div>
                            </div>
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
                      Pack candidature : angle, lettre collable et notes coach
                      (sans inventer de compétences absentes du CV).
                    </p>
                    {job.cover_letter_angle_briefing ? (
                      <p className="text-base text-muted-foreground whitespace-pre-wrap">
                        {job.cover_letter_angle_briefing}
                      </p>
                    ) : job.cover_letter_angle ? (
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
                    {job.cover_letter_subject ? (
                      <p className="text-sm text-muted-foreground">
                        Objet :{" "}
                        <span className="text-foreground">
                          {job.cover_letter_subject}
                        </span>
                      </p>
                    ) : null}
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
                        {job.cover_letter_coach_notes &&
                        job.cover_letter_coach_notes.length > 0 ? (
                          <ul className="space-y-1.5 text-sm text-muted-foreground">
                            {job.cover_letter_coach_notes.map((note, i) => (
                              <li key={`lab-coach-${i}`} className="flex gap-2">
                                <span
                                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40"
                                  aria-hidden
                                />
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
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
