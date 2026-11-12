"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  FileText,
  LayoutGrid,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/layout/app-shell"
import { StickyPageHeader } from "@/components/layout/sticky-page-header"
import { PasteJobDialog } from "@/components/jobs/paste-job-dialog"
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalyzingProgressPanel } from "@/components/jobs/job-scoring-progress"
import { JobAnalysisView } from "@/components/jobs/analysis/job-analysis-view"
import type { AnalysisQuestion } from "@/lib/jobs/job-analysis-model"
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
import type { CvOptimizeResponse } from "@/lib/ai/schemas/cv-optimize"
import {
  insertAfterQuoteOnce,
  replaceQuoteOnce,
} from "@/lib/jobs/cv-quote-match"
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
import { getMatchScoreColor } from "@/lib/jobs/utils"
import { cn } from "@/lib/utils"
import type { CvAnalysisResponse, Job, JobStatus } from "@/types"
import { JOB_STATUSES } from "@/types"

type JobDetailLabPageProps = {
  jobId: string
}

type LabTab = "overview" | "offer" | "optimize" | "apply"

/** French labels for `keywords_report.present[].status`. */
const KEYWORD_STATUS_LABELS: Record<string, string> = {
  deja_present: "Déjà présent",
  integre_immédiat: "Intégré",
  integre_apres_confirmation: "Intégré après confirmation",
}

export function JobDetailLabPage({ jobId }: JobDetailLabPageProps) {
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [correctPasteOpen, setCorrectPasteOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [cvLoading, setCvLoading] = useState(true)
  const [cvAnalyzing, setCvAnalyzing] = useState(false)
  const [cvAnalysis, setCvAnalysis] = useState<CvAnalysisResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)
  const [coverOpen, setCoverOpen] = useState(false)
  const [sentDialogOpen, setSentDialogOpen] = useState(false)
  const [tab, setTab] = useState<LabTab>("overview")
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set())
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [draftRewrites, setDraftRewrites] = useState<Record<string, string>>({})
  const [optimizePhase, setOptimizePhase] = useState<
    "idle" | "loading" | "success" | "error" | "cached"
  >("idle")
  const autoOptimizeKeyRef = useRef<string | null>(null)
  const [cvOptimize, setCvOptimize] = useState<CvOptimizeResponse | null>(null)
  const [cvOptLoading, setCvOptLoading] = useState(false)
  const [cvOptApplying, setCvOptApplying] = useState(false)
  const [cvOptRestoring, setCvOptRestoring] = useState(false)
  const [selectedOptIds, setSelectedOptIds] = useState<Set<string>>(new Set())
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null)
  const [questionDetail, setQuestionDetail] = useState("")
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({})
  const [cvTextCurrent, setCvTextCurrent] = useState<string>("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [hasCv, setHasCv] = useState<boolean | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [pendingTab, setPendingTab] = useState<LabTab | null>(null)
  const [pendingBack, setPendingBack] = useState(false)
  const [pendingRefresh, setPendingRefresh] = useState(false)
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(
    new Set()
  )
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<
    Set<string>
  >(new Set())
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<
    string | null
  >(null)
  const overviewOptimizeKeyRef = useRef<string | null>(null)

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

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const res = await fetch("/api/profile")
      const payload = (await res.json()) as {
        profile?: { cv_text?: string | null }
        error?: string
      }
      if (!res.ok || !payload.profile) {
        throw new Error(payload.error ?? "Profil indisponible")
      }
      const cvText =
        typeof payload.profile.cv_text === "string"
          ? payload.profile.cv_text.trim()
          : ""
      setHasCv(cvText.length > 0)
      setCvTextCurrent(cvText)
    } catch {
      // Unknown is safer than claiming there is no CV.
      setHasCv(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadJob()
    void loadCvAnalysis()
    void loadProfile()
  }, [loadJob, loadCvAnalysis, loadProfile])

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

  const fetchCvOptimize = useCallback(
    async (force = false) => {
      setCvOptLoading(true)
      try {
        const res = await fetch(`/api/jobs/${jobId}/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        })
        const payload = (await res.json()) as { response?: CvOptimizeResponse; error?: string; cached?: boolean; cv_text_current?: string }
        if (!res.ok || !payload.response) {
          throw new Error(payload.error ?? "Erreur optimisation CV")
        }
        setCvOptimize(payload.response)
        if (payload.cv_text_current) setCvTextCurrent(payload.cv_text_current)
        if (payload.cached) setOptimizePhase("cached")
        else setOptimizePhase("success")
        const applicable = payload.response.modifications
          .filter((m) => !m.confirmation_required && m.proposed_text?.trim())
          .map((m) => m.id)
        setSelectedOptIds(new Set(applicable))
        setEditedTexts({})
      } catch (e) {
        console.error(e)
        setOptimizePhase("error")
      } finally {
        setCvOptLoading(false)
      }
    },
    [jobId],
  )

  // Auto job↔CV analysis when opening Optimiser mon CV (cache-aware).
  useEffect(() => {
    if (tab !== "optimize") return
    if (!job || loading || cvLoading) return
    if (analyzing || cvAnalyzing) return
    if (!cvOptimize && !cvOptLoading) {
      void fetchCvOptimize(false)
    }

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
    setCoverLetterError(null)
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
      const message = error instanceof Error ? error.message : "Génération échouée"
      setCoverLetterError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  const optimize = useMemo(
    () => (job ? buildOptimizeBuckets(job, cvAnalysis) : null),
    [job, cvAnalysis]
  )



  // Fetch real proposal IDs once for the analysis tab (guarded against retry loops).
  const optimizeJobId = job?.id ?? null
  const optimizeCvHash = job?.job_fit_cv_hash ?? "none"
  const optimizeJobHash = job?.job_fit_job_hash ?? "none"
  const jobHasAnalysisResult = hasJobFitResult(job)
  useEffect(() => {
    if (tab !== "overview") return
    if (!jobHasAnalysisResult) return
    if (!optimizeJobId || loading || cvLoading || profileLoading) return
    if (hasCv === false) return
    if (cvOptimize || cvOptLoading || analyzing || cvAnalyzing) return

    const key = `overview:${optimizeJobId}:${optimizeCvHash}:${optimizeJobHash}`
    if (overviewOptimizeKeyRef.current === key) return
    overviewOptimizeKeyRef.current = key
    void fetchCvOptimize(false)
  }, [
    tab,
    optimizeJobId,
    optimizeCvHash,
    optimizeJobHash,
    jobHasAnalysisResult,
    loading,
    cvLoading,
    profileLoading,
    hasCv,
    cvOptimize,
    cvOptLoading,
    analyzing,
    cvAnalyzing,
    fetchCvOptimize,
  ])

  const projected = job ? projectOptimizedScore(job) : null
  const potentialScore = projected?.projected ?? null
  const keywordRows = job ? buildKeywordRows(job) : []
  const missions = job ? offerMissionHints(job) : []
  const skills = job ? offerSkillHints(job) : { hard: [], soft: [] }

  const handleAnswerQuestion = useCallback(
    async (questionId: string, answer: "yes" | "no") => {
      setAnsweringQuestionId(questionId)
      try {
        const res = await fetch(`/api/jobs/${jobId}/optimize/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_id: questionId, answer, detail: questionDetail.trim() || null }),
        })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error((payload as { error?: string }).error ?? "Erreur")
        }
        toast.success(answer === "yes" ? "Confirmation enregistrée" : "Non enregistré")
        setQuestionDetail("")
        setAnsweringQuestionId(null)
        await fetchCvOptimize(true)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur")
        setAnsweringQuestionId(null)
      }
    },
    [jobId, questionDetail, fetchCvOptimize],
  )

  const handleDismissProposal = useCallback(
    async (proposalId: string) => {
      try {
        await fetch(`/api/jobs/${jobId}/optimize/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal_id: proposalId }),
        })
        setSelectedOptIds((prev) => {
          const next = new Set(prev)
          next.delete(proposalId)
          return next
        })
      } catch (e) {
        console.error(e)
      }
    },
    [jobId],
  )

  const handleApplySelected = useCallback(async () => {
    const ids = Array.from(selectedOptIds)
    if (ids.length === 0) {
      toast.message("Aucune modification sélectionnée")
      return
    }
    setCvOptApplying(true)
    try {
      const edits = ids
        .map((id) => ({ proposal_id: id, text: editedTexts[id] || "" }))
        .filter((e) => e.text?.trim())
      const res = await fetch(`/api/jobs/${jobId}/optimize/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_ids: ids, edits }),
      })
      const payload = (await res.json()) as { ok?: boolean; error?: string; cv_text?: string; applied_count?: number; code?: string }
      if (!res.ok || !payload.ok) {
        if (payload.code === "cv_changed" || payload.code === "no_change") {
          toast.error(payload.error ?? "Ton CV a changé depuis l'analyse — relance l'optimisation")
          await fetchCvOptimize(true)
          return
        }
        throw new Error(payload.error ?? "Application échouée")
      }
      toast.success(`CV mis à jour (${payload.applied_count ?? ids.length} modification(s))`)
      await loadJob()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Application échouée")
    } finally {
      setCvOptApplying(false)
    }
  }, [jobId, selectedOptIds, loadJob, editedTexts, fetchCvOptimize])

  const handleApplySuggestion = useCallback(
    async (proposalId: string, text?: string): Promise<boolean> => {
      setApplyingSuggestionId(proposalId)
      try {
        const trimmed = text?.trim()
        const res = await fetch(`/api/jobs/${jobId}/optimize/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposal_ids: [proposalId],
            edits: trimmed ? [{ proposal_id: proposalId, text: trimmed }] : [],
          }),
        })
        const payload = (await res.json()) as {
          ok?: boolean
          error?: string
          code?: string
        }
        if (!res.ok || !payload.ok) {
          if (payload.code === "cv_changed" || payload.code === "no_change") {
            toast.error(
              payload.error ??
                "Ton CV a changé depuis l’analyse — actualise l’analyse avant d’appliquer."
            )
            await loadJob()
            return false
          }
          throw new Error(payload.error ?? "Application échouée")
        }
        setAppliedSuggestionIds((previous) => {
          const next = new Set(previous)
          next.add(proposalId)
          return next
        })
        toast.success("Suggestion appliquée à ton CV adapté.")
        await loadJob()
        return true
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Application échouée"
        )
        return false
      } finally {
        setApplyingSuggestionId(null)
      }
    },
    [jobId, loadJob]
  )

  const handleIgnoreSuggestion = useCallback(
    async (proposalId: string) => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/optimize/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal_id: proposalId }),
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(payload.error ?? "Impossible d’ignorer la suggestion")
        }
        setDismissedSuggestionIds((previous) => {
          const next = new Set(previous)
          next.add(proposalId)
          return next
        })
        toast.success("Suggestion ignorée.")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Action impossible"
        )
      }
    },
    [jobId]
  )

  const handleSaveExperienceAnswer = useCallback(
    async (
      question: AnalysisQuestion,
      answer: "yes" | "no" | "unknown",
      detail: string | null
    ): Promise<boolean> => {
      if (!job) return false
      try {
        const res =
          question.origin === "criterion" && question.criterionId
            ? await fetch("/api/analyze-job/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  jobId: job.id,
                  criterionId: question.criterionId,
                  answer,
                  detail,
                }),
              })
            : await fetch(`/api/jobs/${jobId}/optimize/answer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  question_id: question.id,
                  answer,
                  detail,
                }),
              })
        const payload = (await res.json().catch(() => ({}))) as {
          job?: Job
          error?: string
        }
        if (!res.ok) {
          throw new Error(payload.error ?? "Enregistrement impossible")
        }
        if (payload.job) setJob(payload.job)
        else {
          const jobResponse = await fetch(`/api/jobs/${jobId}`)
          const jobPayload = (await jobResponse.json()) as { job?: Job }
          if (jobResponse.ok && jobPayload.job) setJob(jobPayload.job)
        }
        if (question.origin === "optimize") {
          await fetchCvOptimize(false)
        }
        return true
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Enregistrement impossible"
        )
        return false
      }
    },
    [job, jobId, fetchCvOptimize]
  )

  const buildPreview = useCallback(() => {
    if (!cvTextCurrent || !cvOptimize) return cvTextCurrent
    let result = cvTextCurrent
    const ids = Array.from(selectedOptIds)
    for (const id of ids) {
      const m = cvOptimize.modifications.find((x) => x.id === id)
      if (!m || m.confirmation_required) continue
      const proposed = (editedTexts[id]?.trim() || m.proposed_text)?.trim()
      if (!proposed) continue
      if ((m.type === "reformulation" || m.type === "reorganisation" || m.type === "alleger") && m.original_text?.trim()) {
        const replaced = replaceQuoteOnce(result, m.original_text, proposed)
        if (replaced !== null) result = replaced
      } else if (m.type === "ajout") {
        const placement = m.placement || { mode: "replace" }
        if (placement.mode === "replace" && m.original_text?.trim()) {
          const replaced = replaceQuoteOnce(result, m.original_text, proposed)
          if (replaced !== null) result = replaced
        } else if (placement.mode === "insert_after" && placement.anchor_text?.trim()) {
          const inserted = insertAfterQuoteOnce(result, placement.anchor_text, proposed)
          if (inserted !== null) result = inserted
        }
      }
    }
    return result
  }, [cvTextCurrent, cvOptimize, selectedOptIds, editedTexts])

  const previewText = previewOpen ? buildPreview() : ""

  const handleRestoreCv = useCallback(async () => {
    setCvOptRestoring(true)
    try {
      const res = await fetch("/api/profile/cv-restore", { method: "POST" })
      const payload = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Restauration échouée")
      }
      toast.success("Version précédente du CV restaurée")
      await loadJob()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restauration échouée")
    } finally {
      setCvOptRestoring(false)
    }
  }, [loadJob])

  function handleApplyLocalSuggestion(id: string, rewrite: string | null) {
    if (!rewrite?.trim()) {
      toast.message("Aucune reformulation sûre à appliquer")
      return
    }
    setAppliedIds((prev) => new Set(prev).add(id))
    setDraftRewrites((prev) => ({ ...prev, [id]: rewrite }))
    toast.success("Suggestion appliquée localement (aperçu)")
  }

  const appliedSuggestionIdSet = useMemo(() => {
    const next = new Set(job?.cv_optimize_applied ?? [])
    for (const id of appliedSuggestionIds) next.add(id)
    return next
  }, [job?.cv_optimize_applied, appliedSuggestionIds])

  const dismissedSuggestionIdSet = useMemo(() => {
    const next = new Set(job?.cv_optimize_dismissed ?? [])
    for (const id of dismissedSuggestionIds) next.add(id)
    return next
  }, [job?.cv_optimize_dismissed, dismissedSuggestionIds])

  const requestTabChange = useCallback(
    (next: LabTab) => {
      if (next === tab) return
      if (unsavedChanges) {
        setPendingTab(next)
        return
      }
      setTab(next)
    },
    [tab, unsavedChanges]
  )

  const requestBack = useCallback(() => {
    if (unsavedChanges) {
      setPendingBack(true)
      return
    }
    router.push("/jobs")
  }, [router, unsavedChanges])

  const requestAnalyze = () => {
    if (unsavedChanges) {
      setPendingRefresh(true)
      return
    }
    void handleAnalyze()
  }

  const confirmTabChange = () => {
    setUnsavedChanges(false)
    if (pendingBack) {
      setPendingBack(false)
      setPendingRefresh(false)
      setPendingTab(null)
      router.push("/jobs")
      return
    }
    if (pendingRefresh) {
      setPendingRefresh(false)
      setPendingTab(null)
      void handleAnalyze()
      return
    }
    if (pendingTab) setTab(pendingTab)
    setPendingTab(null)
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

  const companyLabel = job.company?.trim() || "Entreprise non précisée"
  const locationLabel = job.location?.trim() || "Lieu non précisé"
  const contractLabel = job.contract_type?.trim() || "Contrat non précisé"
  const sourceLabel = job.source?.trim() || null
  const roleLabel = job.subcategory?.trim() || job.category?.trim() || null
  const publishedDate = job.published_at ? new Date(job.published_at) : null
  const publishedLabel =
    publishedDate && Number.isFinite(publishedDate.getTime())
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(publishedDate)
      : typeof job.raw_data?.publication_label === "string" ? job.raw_data.publication_label : null
  const headerItems = [
    roleLabel,
    companyLabel,
    sourceLabel,
    locationLabel,
    contractLabel,
    publishedLabel,
  ].filter((item): item is string => Boolean(item))

  return (
    <AppShell>
      <TooltipProvider>
        {correctPasteOpen ? <PasteJobDialog open onOpenChange={setCorrectPasteOpen}
          correctionJobId={job.id}
          initialText={typeof job.raw_data?.pasted_text === "string" ? job.raw_data.pasted_text : job.description ?? ""}
          onImported={async () => { setCvOptimize(null); await loadJob(); toast.success("Offre corrigée. Actualise son analyse."); }} /> : null}
        <div>
          <Tabs
            value={tab}
            onValueChange={(value) => requestTabChange(value as LabTab)}
            className="gap-4"
          >
            <StickyPageHeader className="mb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <button
                    type="button"
                    onClick={requestBack}
                    className="inline-flex min-h-6 items-center gap-1.5 rounded-[6px] text-base font-medium text-app-text-secondary transition-colors hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Retour aux offres
                  </button>
                  <h1 className="line-clamp-2 break-words text-[32px] font-bold leading-10 tracking-tight text-app-text">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium leading-5 text-app-text-subtle">
                    {headerItems.map((part, index) => (
                      <span key={`${part}-${index}`}>
                        {index > 0 ? <span aria-hidden>·&nbsp;</span> : null}
                        {part}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="outline" size="control" onClick={() => setCorrectPasteOpen(true)} disabled={analyzing}>
                    Corriger l’offre
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="control"
                    onClick={requestAnalyze}
                    disabled={analyzing || hasCv === false}
                    className="text-sm font-medium"
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-4 w-4" aria-hidden />
                    )}
                    {analyzing ? "Actualisation…" : "Actualiser l’analyse"}
                  </Button>
                  <Button
                    type="button"
                    size="control"
                    onClick={() => requestTabChange("optimize")}
                    className="text-sm font-medium"
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden />
                    Adapter mon CV
                  </Button>
                </div>
              </div>

              <TabsList
                aria-label="Sections de l’offre"
                variant="section"
                className="w-full max-w-full max-sm:grid max-sm:grid-cols-2 sm:w-fit"
              >
                <TabsTrigger value="overview" variant="section" className="h-(--app-control-height) px-4 max-sm:justify-center">Analyse</TabsTrigger>
                <TabsTrigger value="offer" variant="section" className="h-(--app-control-height) px-4 max-sm:justify-center">Offre</TabsTrigger>
                <TabsTrigger value="optimize" variant="section" className="h-(--app-control-height) px-4 max-sm:justify-center">Mon CV adapté</TabsTrigger>
                <TabsTrigger value="apply" variant="section" className="h-(--app-control-height) px-4 max-sm:justify-center">Candidature</TabsTrigger>
              </TabsList>
            </StickyPageHeader>

            <TabsContent value="overview" className="space-y-4">
              <JobAnalysisView
                job={job}
                cvText={profileLoading ? undefined : cvTextCurrent}
                analyzing={analyzing}
                analyzeError={analyzeError}
                cvLoading={cvLoading || profileLoading}
                hasCv={hasCv}
                cvAnalysis={cvAnalysis}
                cvOptimize={cvOptimize}
                cvOptLoading={cvOptLoading}
                appliedIds={appliedSuggestionIdSet}
                dismissedIds={dismissedSuggestionIdSet}
                applyingId={applyingSuggestionId}
                onAnalyze={requestAnalyze}
                onGoOptimize={() => requestTabChange("optimize")}
                onAddCv={() => router.push("/profile-ai")}
                onSaveAnswer={handleSaveExperienceAnswer}
                onApplySuggestion={handleApplySuggestion}
                onIgnoreSuggestion={handleIgnoreSuggestion}
                onDirtyChange={setUnsavedChanges}
              />
            </TabsContent>


            <TabsContent value="offer" className="space-y-4">
              <Card variant="app">
                <CardHeader className="gap-4">
                  <CardTitle className="text-lg font-semibold leading-7 text-app-text-strong">
                    Résumé du poste
                  </CardTitle>
                  {job.job_posting_summary ? (
                    <p className="max-w-[70ch] text-base leading-6 text-app-text-subtle">
                      {job.job_posting_summary}
                    </p>
                  ) : (
                    <p className="max-w-[70ch] text-base leading-6 text-app-text-muted">
                      Lance l’analyse pour obtenir un résumé structuré de l’offre.
                    </p>
                  )}
                </CardHeader>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card variant="app">
                  <CardHeader className="gap-4">
                    <CardTitle className="text-lg font-semibold leading-7 text-app-text-strong">
                      Missions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {missions.length > 0 ? (
                      missions.map((mission) => (
                        <div
                          key={mission}
                          className="flex items-start gap-4 text-base leading-6 text-app-text-subtle"
                        >
                          <span aria-hidden className="shrink-0">
                            →
                          </span>
                          <p className="min-w-0 flex-1">{mission}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-base leading-6 text-app-text-muted">
                        Missions non structurées — voir le résumé ou l’offre originale.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card variant="app">
                  <CardHeader className="gap-4">
                    <CardTitle className="text-lg font-semibold leading-7 text-app-text-strong">
                      Compétences recherchées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {skills.hard.length === 0 ? (
                      <p className="text-base leading-6 text-app-text-muted">
                        Aucune compétence structurée — les mots-clés ATS ci-dessous
                        complètent la lecture.
                      </p>
                    ) : (
                      skills.hard.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex h-7 items-center rounded-app-control border border-app-border bg-app-control px-2 text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-subtle"
                        >
                          {skill}
                        </span>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {cvOptimize && ((cvOptimize.keywords_report?.present?.length || 0) + (cvOptimize.keywords_report?.to_confirm?.length || 0)) > 0 ? (
                <Card variant="app">
                  <CardHeader className="gap-2">
                    <CardTitle className="text-lg font-semibold leading-7 text-app-text-strong">
                      Mots-clés de l’offre intégrés
                    </CardTitle>
                    <p className="text-base leading-6 text-app-text-subtle">
                      Termes exacts de l’annonce (présents / intégrés / à confirmer).
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cvOptimize.keywords_report.present?.map((k, idx) => (
                      <div key={`p-${idx}`} className="flex items-center justify-between gap-4 rounded-app-control border border-app-border px-3 py-2">
                        <span className="text-base">{k.term}</span>
                        <Badge variant="outline">
                          {KEYWORD_STATUS_LABELS[k.status] ?? k.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                    {cvOptimize.keywords_report.to_confirm?.map((k, idx) => (
                      <div key={`tc-${idx}`} className="flex items-center justify-between gap-4 rounded-app-control border border-app-warning/40 px-3 py-2">
                        <span className="text-base">{k.term}</span>
                        <span className="text-sm text-app-text-subtle">{k.reason}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <section className="space-y-4">
                <h2 className="text-lg font-semibold leading-7 text-app-text">
                  Mots-clés ATS
                </h2>
                <div className="rounded-app-surface border border-app-border bg-app-surface p-4">
                  {keywordRows.length === 0 ? (
                    <p className="text-base leading-6 text-app-text-muted">
                      Analyse l’offre pour extraire les mots-clés ATS.
                    </p>
                  ) : (
                    <Table className="min-w-[640px] text-base">
                      <TableHeader>
                        <TableRow className="border-app-border hover:bg-transparent">
                          <TableHead className="w-1/4 px-0 py-3 text-base font-normal text-app-text-strong">
                            Mot-clé
                          </TableHead>
                          <TableHead className="w-1/4 px-0 py-3 text-base font-normal text-app-text-strong">
                            Importance
                          </TableHead>
                          <TableHead className="w-1/4 px-0 py-3 text-base font-normal text-app-text-strong">
                            Occurrences
                          </TableHead>
                          <TableHead className="w-1/4 px-0 py-3 text-base font-normal text-app-text-strong">
                            Présence CV
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keywordRows.map((row) => (
                          <TableRow
                            key={row.keyword}
                            className="border-app-border hover:bg-transparent"
                          >
                            <TableCell className="px-0 py-3 align-middle">
                              <span className="inline-flex h-7 items-center rounded-app-control border border-app-border bg-app-control px-2 text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-subtle">
                                {row.keyword}
                              </span>
                            </TableCell>
                            <TableCell className="px-0 py-3 align-middle">
                              <span className="inline-flex h-8 items-center rounded-app-control bg-app-warning-surface px-2 text-base font-medium leading-6 tracking-[-0.02em] text-app-warning">
                                {row.importance}
                              </span>
                            </TableCell>
                            <TableCell className="px-0 py-3 align-middle text-app-text-subtle">
                              {typeof row.occurrences === "number"
                                ? row.occurrences
                                : "—"}
                            </TableCell>
                            <TableCell className="px-0 py-3 align-middle">
                              <span
                                className={cn(
                                  "inline-flex h-8 items-center rounded-app-control px-2 text-base font-medium leading-6 tracking-[-0.02em]",
                                  row.presence === "Présent" &&
                                    "bg-app-success-surface text-app-success",
                                  row.presence === "Absent" &&
                                    "bg-app-warning-surface text-app-warning",
                                  row.presence === "Inconnu" &&
                                    "bg-app-control text-app-text-subtle"
                                )}
                              >
                                {row.presence}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </section>

              <details className="group rounded-app-surface border border-app-border bg-app-surface p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base leading-6 text-app-text-strong [&::-webkit-details-marker]:hidden">
                  Afficher l’offre originale
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <pre className="mt-4 max-h-[420px] max-w-[80ch] overflow-auto whitespace-pre-wrap text-base leading-6 text-app-text-subtle">
                  {(job.description || job.summary || "").trim() ||
                    "Aucun texte brut importé."}
                </pre>
              </details>
            </TabsContent>

            <TabsContent value="optimize" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle>Reformulations pour cette offre</CardTitle>
                    <p className="mt-1 text-base text-muted-foreground">
                      Comparatif : texte actuel du CV → proposition pour cette offre. Mots-clés exacts intégrés uniquement s’ils sont justifiés.
                    </p>
                    {cvOptimize?.orientation ? (
                      <p className="mt-1 text-base text-foreground/90">{cvOptimize.orientation}</p>
                    ) : null}
                    {optimizePhase === "cached" ? (
                      <p className="mt-1 text-base text-muted-foreground">
                        Analyse déjà à jour — aucun nouvel appel IA.
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        autoOptimizeKeyRef.current = null
                        void fetchCvOptimize(true)
                      }}
                      disabled={cvOptLoading}
                    >
                      {cvOptLoading ? "Génération…" : "Relancer l’optimisation"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewOpen(true)}
                      disabled={selectedOptIds.size === 0}
                    >
                      Aperçu du CV résultant
                    </Button>
                    <Button size="sm" onClick={handleApplySelected} disabled={cvOptApplying || selectedOptIds.size === 0}>
                      {cvOptApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Appliquer {selectedOptIds.size} modification{selectedOptIds.size > 1 ? "s" : ""}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRestoreCv} disabled={cvOptRestoring}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurer la version précédente
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
                    <p className="text-sm font-medium text-muted-foreground">Score actuel</p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Estimation après modifications (indicative, sans gain garanti)
                    </p>
                    <p className={cn("mt-1 text-3xl font-bold tabular-nums", potentialScore !== null && potentialScore === job.match_score ? "text-muted-foreground" : "text-emerald-400")}>
                      {potentialScore ?? "—"}
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                      {potentialScore !== null && potentialScore === job.match_score
                        ? `Estimation inchangée · ${potentialScore}/100`
                        : "Projection indicative ; la reformulation ne change pas le score enregistré."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {((cvOptimize && cvOptimize.questions.length > 0) || (optimize && optimize.toConfirm.length > 0)) ? (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle>Informations à confirmer</CardTitle>
                    <p className="text-base text-muted-foreground">
                      Questions ciblées, séparées des reformulations. Réponse oui/non + détail si utile.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cvOptimize?.questions?.map((q) => (
                      <div key={q.id} className="rounded-xl border border-border/70 p-4">
                        <p className="font-medium">{q.question}</p>
                        <p className="mt-1 text-base text-muted-foreground">{q.reason}</p>
                        <Textarea
                          className="mt-3"
                          placeholder="Complément factuel (facultatif)"
                          value={answeringQuestionId === q.id ? questionDetail : ""}
                          onChange={(e) => {
                            setAnsweringQuestionId(q.id)
                            setQuestionDetail(e.target.value)
                          }}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void handleAnswerQuestion(q.id, "yes")} disabled={answeringQuestionId === q.id}>
                            Oui
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void handleAnswerQuestion(q.id, "no")} disabled={answeringQuestionId === q.id}>
                            Non
                          </Button>
                        </div>
                      </div>
                    ))}
                    {optimize?.toConfirm
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
                  <CardTitle>Modifications concrètes</CardTitle>
                  <p className="text-base text-muted-foreground">
                    Sélectionne les modifications à appliquer. Les propositions nécessitant confirmation sont exclues du CV avant réponse.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cvOptimize && cvOptimize.modifications.filter((m) => !m.confirmation_required && m.proposed_text?.trim()).length === 0 && (!optimize || optimize.safe.filter((item) => !ignoredIds.has(item.id)).length === 0) ? (
                    <p className="text-base text-muted-foreground">
                      {(cvOptLoading || cvLoading || analyzing)
                        ? "Chargement des suggestions…"
                        : "Ton CV est déjà bien optimisé."}
                      {cvOptimize && cvOptimize.questions.length > 0 ? (
                        <span className="block mt-1">Des informations restent à confirmer (voir « Informations à confirmer »).</span>
                      ) : null}
                    </p>
                  ) : cvOptimize && cvOptimize.modifications.filter((m) => !m.confirmation_required && m.proposed_text?.trim()).length > 0 ? (
                    cvOptimize.modifications
                      .filter((m) => !m.confirmation_required && m.proposed_text?.trim())
                      .map((m, index) => {
                        const checked = selectedOptIds.has(m.id)
                        const currentProposed = editedTexts[m.id] ?? m.proposed_text
                        return (
                          <div key={m.id} className="overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-4 py-3">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedOptIds((prev) => {
                                      const next = new Set(prev)
                                      if (e.target.checked) next.add(m.id)
                                      else next.delete(m.id)
                                      return next
                                    })
                                  }}
                                />
                                <div>
                                  <p className="font-medium">{index + 1}. {m.justification}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Rubrique : {m.section}
                                    {(m as any).element_label ? ` — ${(m as any).element_label}` : ""}
                                    {m.keywords_added?.length ? ` • Mots-clés de l'offre intégrés : ${m.keywords_added.join(", ")}` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditedTexts((prev) => ({ ...prev, [m.id]: m.proposed_text }))}>
                                  Réinitialiser l&apos;édition
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => void handleDismissProposal(m.id)}>
                                  Refuser
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-0 md:grid-cols-2">
                              <div className="border-border/70 bg-muted/40 p-4 md:border-r">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Texte actuel</p>
                                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{m.original_text || (m.type === "ajout" ? "— (ajout)" : "—")}</p>
                                {m.sources?.length ? (
                                  <p className="mt-2 text-xs text-muted-foreground">Source : {m.sources[0].quote}</p>
                                ) : null}
                              </div>
                              <div className="p-4">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposition pour cette offre</p>
                                <Textarea
                                  value={currentProposed}
                                  onChange={(e) => setEditedTexts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                  className="min-h-[120px]"
                                />
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Reformulation concrète</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                  ) : !optimize ||
                  optimize.safe.filter((item) => !ignoredIds.has(item.id)).length ===
                    0 ? (
                    <p className="text-base text-muted-foreground">
                      {cvLoading || analyzing
                        ? "Chargement des suggestions…"
                        : "Aucune reformulation sûre pour cette offre."}
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
                                      handleApplyLocalSuggestion(item.id, rewrite)
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

              {previewOpen ? (
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>Aperçu du CV résultant</CardTitle>
                      <p className="mt-1 text-base text-muted-foreground">
                        Prévisualisation basée sur les reformulations sélectionnées et éditées.
                        Rien n’est enregistré tant que tu n’as pas cliqué sur « Appliquer ».
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
                      Fermer
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={previewText}
                      readOnly
                      className="min-h-[320px] font-mono text-sm"
                      aria-label="Aperçu du CV résultant"
                    />
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="apply" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Statut de la candidature</CardTitle>
                  <p className="max-w-[70ch] text-base text-muted-foreground">
                    Aucun envoi automatique : tu envoies depuis le site ou ton
                    messagerie, puis tu mets à jour le statut ici.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="application-status" className="text-sm text-app-text-label">
                    Statut
                  </Label>
                  <Select
                    value={job.status}
                    onValueChange={(value) => {
                      if (!value) return
                      void updateJob({ status: value as JobStatus })
                    }}
                  >
                    <SelectTrigger
                      id="application-status"
                      variant="control"
                      className="w-56"
                    >
                      <SelectValue>
                        {(value) => jobStatusLabel(value as JobStatus)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {jobStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" aria-hidden />
                    Lettre de motivation
                  </CardTitle>
                  <p className="max-w-[70ch] text-base text-muted-foreground">
                    Prépare ta lettre, relis-la et copie-la avant de l’envoyer
                    toi-même. JobTracker n’envoie pas la candidature.
                  </p>
                  {job.cover_letter_angle_briefing ? (
                    <p className="max-w-[70ch] whitespace-pre-wrap text-base text-muted-foreground">
                      {job.cover_letter_angle_briefing}
                    </p>
                  ) : job.cover_letter_angle ? (
                    <p className="max-w-[70ch] text-base text-muted-foreground">
                      Angle suggéré : {job.cover_letter_angle}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {!job.cover_letter ? (
                    <Button
                      onClick={() => void handleGenerateCoverLetter()}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                          Préparation…
                        </>
                      ) : (
                        "Préparer une lettre"
                      )}
                    </Button>
                  ) : null}
                  {coverLetterError ? (
                    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      <p>La lettre n’a pas pu être générée. Le brouillon existant est conservé.</p>
                      <p className="mt-1 text-muted-foreground">{coverLetterError}</p>
                      <Button className="mt-2" size="sm" variant="outline" onClick={() => void handleGenerateCoverLetter()} disabled={generating}>Réessayer</Button>
                    </div>
                  ) : null}
                  {job.cover_letter ? <p role="status" className="text-sm text-muted-foreground">Brouillon enregistré — relis-le avant de le copier ou de l’envoyer.</p> : null}
                  {job.cover_letter_subject ? (
                    <p className="text-sm text-muted-foreground">
                      Objet :{" "}
                      <span className="text-foreground">
                        {job.cover_letter_subject}
                      </span>
                    </p>
                  ) : null}
                  {job.cover_letter ? (
                    <div className="max-w-[80ch] space-y-3">
                      <Textarea
                        aria-label="Lettre de motivation"
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
                      <div className="flex flex-wrap items-center gap-2 border-t border-app-border pt-3">
                        <Button onClick={() => setCoverOpen(true)}>
                          Relire et copier
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleGenerateCoverLetter()}
                          disabled={generating}
                        >
                          {generating ? (
                            <>
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                              Régénération…
                            </>
                          ) : (
                            "Régénérer"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="sm:ml-auto"
                          disabled={job.status === "applied"}
                          onClick={() => setSentDialogOpen(true)}
                        >
                          <CircleCheck className="mr-1.5 h-4 w-4" aria-hidden />
                          {job.status === "applied"
                            ? "Candidature marquée envoyée"
                            : "J’ai envoyé ma candidature"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog
            open={sentDialogOpen}
            onOpenChange={setSentDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Marquer comme envoyée ?</DialogTitle>
                <DialogDescription>
                  Confirme seulement si tu as envoyé ta candidature toi-même,
                  depuis le site de l’entreprise ou ta messagerie. JobTracker ne
                  peut pas vérifier l’envoi.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSentDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    setSentDialogOpen(false)
                    void updateJob({ status: "applied" })
                    toast.success("Candidature marquée envoyée")
                  }}
                >
                  Oui, j’ai envoyé
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={pendingTab !== null || pendingBack || pendingRefresh}
            onOpenChange={(open) => {
              if (!open) {
                setPendingTab(null)
                setPendingBack(false)
                setPendingRefresh(false)
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifications non enregistrées</DialogTitle>
                <DialogDescription>
                  Ta réponse ou ta formulation en cours n’a pas été enregistrée.
                  {pendingRefresh
                    ? " Actualiser l’analyse peut remplacer les données auxquelles elle se rapporte."
                    : pendingBack
                      ? " Retourner aux offres la perdra."
                      : " Quitter cet onglet la perdra."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingTab(null)
                    setPendingBack(false)
                    setPendingRefresh(false)
                  }}
                >
                  Rester
                </Button>
                <Button onClick={confirmTabChange}>Quitter sans enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
