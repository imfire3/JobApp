"use client";

<<<<<<< Updated upstream
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
=======
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
>>>>>>> Stashed changes
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobFiltersBar, JobDateFilter, JobFilterMenu } from "@/components/dashboard/job-filters";
import { JobCard } from "@/components/dashboard/job-card";
import { JobTable } from "@/components/dashboard/job-table";
import { JobKanban } from "@/components/dashboard/job-kanban";
import { JobBulkActions } from "@/components/dashboard/job-bulk-actions";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { filterJobs } from "@/lib/jobs/utils";
<<<<<<< Updated upstream
import type { Job, JobFilters, JobStatus } from "@/types";
import { ClipboardPaste, Columns3, List, RefreshCw, LayoutGrid, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { JobScoringProgress } from "@/components/jobs/job-scoring-progress";
import { useRouter } from "next/navigation";
=======
import type { Job, JobFilters, JobStatus, TrackedSearch } from "@/types";
import { Copy, List, Play, Plus, RefreshCw, Trash2, LayoutGrid, Briefcase, Inbox } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
>>>>>>> Stashed changes

const defaultFilters: JobFilters = {};

type ImportedJobRef = {
  id: string;
  url: string;
  title: string;
  company: string;
  was_duplicate: boolean;
};

<<<<<<< Updated upstream
type ImportJobsPayload = {
  error?: string;
  message?: string;
  jobs?: ImportedJobRef[];
  summary?: {
    imported?: number;
    duplicates?: number;
  };
};

export function TrackedJobsPage({
  allowLocalDevTools = false,
}: {
  allowLocalDevTools?: boolean
}) {
  const router = useRouter();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [view, setView] = useState<"cards" | "table" | "kanban">("table");
  const [seedingFakeJobs, setSeedingFakeJobs] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [analysisByJobId, setAnalysisByJobId] = useState<
    Record<string, JobScoringProgress>
  >({});
=======


export function TrackedJobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupMode = searchParams.get("setup") === "1";
  const [trackedSearches, setTrackedSearches] = useState<TrackedSearch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [mainTab, setMainTab] = useState<"collected" | "jobs">("collected");
  const [view, setView] = useState<"cards" | "table">("table");
>>>>>>> Stashed changes
  const [loading, setLoading] = useState(true);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
<<<<<<< Updated upstream
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
=======
  const [deleteLoading, setDeleteLoading] = useState(false);
>>>>>>> Stashed changes
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    current: number;
    success: number;
    failed: number;
    currentJob: string | null;
  } | null>(null);

  async function readJsonSafe(res: Response) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async function loadAll(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const jobsRes = await fetch("/api/jobs");
      const jobsData = await readJsonSafe(jobsRes);
      if (!jobsRes.ok) {
        throw new Error(
          typeof jobsData.error === "string" ? jobsData.error : "Failed to load jobs"
        );
      }
      setJobs((jobsData.jobs as Job[]) ?? []);
      if (setupMode) {
        router.replace("/jobs/searches/new");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
    // Initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sources");
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Impossible de charger les sources"
        );
      }
      const sources = (data.sources ?? []) as Array<{
        id: string;
        slug: string;
        supports_server_sync?: boolean;
        ingestion_mode?: string;
      }>;
      const syncable = sources.filter(
        (source) => source.supports_server_sync || source.ingestion_mode === "api"
      );
      if (syncable.length === 0) {
        toast.message(
          "Aucune source avec sync serveur. Utilise Imports ou l’extension Chrome."
        );
        return;
      }

      let imported = 0;
      let skipped = 0;
      for (const source of syncable) {
        const path =
          source.slug === "france-travail"
            ? "/api/sources/france-travail/sync"
            : `/api/sync/source/${source.id}`;
        const sres = await fetch(path, { method: "POST" });
        const sdata = await readJsonSafe(sres);
        if (sres.ok) {
          imported += typeof sdata.imported === "number" ? sdata.imported : 0;
          skipped += typeof sdata.skipped === "number" ? sdata.skipped : 0;
        }
      }
      await loadAll({ silent: true });
      toast.success(
        `Synchronisation terminée : ${imported} importée(s), ${skipped} doublon(s)`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Synchronisation échouée");
    } finally {
      setSyncing(false);
    }
  }

  const filteredJobs = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const sources = useMemo(() => [...new Set(jobs.map((job) => job.source))].sort(), [jobs]);

<<<<<<< Updated upstream
  async function seedFakeJobs() {
    if (!allowLocalDevTools) return
    setSeedingFakeJobs(true)
    try {
      const res = await fetch("/api/dev/seed-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = (await readJsonSafe(res)) as ImportJobsPayload & {
        imported?: number
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Impossible d’ajouter les offres fake"
        )
      }
      await ingestImportedJobs(data, {
        successSingular: "1 offre fake ajoutée — analyse du match…",
        successPlural: (n) => `${n} offres fake ajoutées — analyse du match…`,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d’ajouter les offres fake"
      )
    } finally {
      setSeedingFakeJobs(false)
    }
  }
=======
>>>>>>> Stashed changes

  async function ingestImportedJobs(
    data: ImportJobsPayload,
    labels: { successSingular: string; successPlural: (n: number) => string }
  ) {
    const importedJobs = (data.jobs ?? []).filter((job) => !job.was_duplicate)
    const imported = importedJobs.length
    if (imported === 0) {
      toast.message(
        typeof data.message === "string"
          ? data.message
          : "Aucune nouvelle offre à importer"
      )
      await loadAll({ silent: true })
      return
    }

    toast.success(
      imported === 1 ? labels.successSingular : labels.successPlural(imported)
    )

    setAnalysisByJobId(
      Object.fromEntries(
        importedJobs.map((job, index) => [
          job.id,
          {
            status: index === 0 ? "analyzing" : "queued",
            progress: index === 0 ? 12 : 5,
          } satisfies JobScoringProgress,
        ])
      )
    )
    await loadAll({ silent: true })
    setJobs((prev) => {
      const importedIds = new Set(importedJobs.map((job) => job.id))
      const first = prev.filter((job) => importedIds.has(job.id))
      const rest = prev.filter((job) => !importedIds.has(job.id))
      return [...first, ...rest]
    })
    await analyzeImportedJobs(importedJobs.map((job) => job.id))
  }

  function openCsvPicker() {
    if (importingCsv) return
    csvInputRef.current?.click()
  }

  async function handleCsvFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!file) return

    setImportingCsv(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/import-jobs", {
        method: "POST",
        body: formData,
      })
      const data = (await readJsonSafe(res)) as ImportJobsPayload
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Import échoué"
        )
      }
      await ingestImportedJobs(data, {
        successSingular: "1 offre importée — analyse du match…",
        successPlural: (n) => `${n} offres importées — analyse du match…`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import échoué")
    } finally {
      setImportingCsv(false)
    }
  }

<<<<<<< Updated upstream
=======
  async function syncAllEnabled() {
    setSyncingAll(true);
    try {
      const res = await fetch("/api/tracked-searches/run-all", { method: "POST" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Sync failed");
      }
      const imported = typeof data.imported === "number" ? data.imported : 0;
      toast.success(`Sync all complete: ${imported} new jobs imported`);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncingAll(false);
    }
  }

  async function duplicateSearch(search: TrackedSearch) {
    const payload: TrackedSearchPayload = {
      ...search,
      name: `${search.name} (Copy)`,
      company_size: search.company_size ?? null,
      company_culture: search.company_culture ?? null,
      minimum_salary: search.minimum_salary ?? null,
      minimum_match_score: search.minimum_match_score ?? null,
    };
    const res = await fetch("/api/tracked-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Failed to duplicate search");
      return;
    }
    toast.success("Search duplicated");
    await loadAll();
  }

  function editSearch(search: TrackedSearch) {
    router.push(`/jobs/searches/${search.id}`);
  }

>>>>>>> Stashed changes
  async function updateJob(
    id: string,
    updates: Partial<Pick<Job, "status" | "selected" | "cover_letter">>
  ) {
    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Failed to update job");
      return;
    }
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? ((data.job as Job | undefined) ?? job) : job))
    );
  }

  async function handleBulkStatusUpdate(
    updates: Partial<Pick<Job, "status" | "selected">> & {
      selection_only?: boolean;
    }
  ) {
    const selected = jobs.filter((job) => job.selected);
    if (selected.length === 0) {
      toast.error("Sélectionne au moins une offre");
      return;
    }

    setBulkStatusLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected.map((job) => job.id),
          ...updates,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Mise à jour groupée échouée"
        );
      }
      const updatedJobs = Array.isArray(data.jobs) ? (data.jobs as Job[]) : [];
      if (updatedJobs.length) {
        const byId = new Map(updatedJobs.map((job) => [job.id, job]));
        setJobs((prev) => prev.map((job) => byId.get(job.id) ?? job));
      } else {
        await loadAll();
      }
      const label = updates.status
        ? `Statut « ${updates.status.replace(/_/g, " ")} »`
        : updates.selected === false
          ? "Désélection"
          : "Mise à jour";
      toast.success(`${label} appliqué à ${selected.length} offre(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour groupée échouée");
    } finally {
      setBulkStatusLoading(false);
    }
  }

<<<<<<< Updated upstream
  async function handleSelectAllVisible(selected: boolean) {
=======
  async function handleSelectAll(selected: boolean) {
>>>>>>> Stashed changes
    const ids = filteredJobs.map((job) => job.id);
    if (ids.length === 0) return;

    setBulkStatusLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ ids, selected, selection_only: true }),
=======
        body: JSON.stringify({ ids, selected }),
>>>>>>> Stashed changes
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Sélection groupée échouée"
        );
      }
      const updatedJobs = Array.isArray(data.jobs) ? (data.jobs as Job[]) : [];
      if (updatedJobs.length) {
        const byId = new Map(updatedJobs.map((job) => [job.id, job]));
        setJobs((prev) => prev.map((job) => byId.get(job.id) ?? job));
      } else {
        await loadAll();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sélection groupée échouée");
    } finally {
      setBulkStatusLoading(false);
    }
  }

<<<<<<< Updated upstream
  async function handleBulkDelete() {
=======
  async function handleDeleteSelected() {
>>>>>>> Stashed changes
    const selected = jobs.filter((job) => job.selected);
    if (selected.length === 0) {
      toast.error("Sélectionne au moins une offre");
      return;
    }
    if (
      !window.confirm(
<<<<<<< Updated upstream
        `Supprimer définitivement ${selected.length} offre${selected.length > 1 ? "s" : ""} ?`
=======
        `Supprimer ${selected.length} offre(s) ? Cette action est définitive.`
>>>>>>> Stashed changes
      )
    ) {
      return;
    }

<<<<<<< Updated upstream
    setBulkDeleteLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected.map((job) => job.id) }),
=======
    setDeleteLoading(true);
    try {
      const ids = selected.map((job) => job.id);
      const res = await fetch("/api/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
>>>>>>> Stashed changes
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
<<<<<<< Updated upstream
          typeof data.error === "string" ? data.error : "Suppression groupée échouée"
        );
      }
      const deletedIds = new Set(
        Array.isArray(data.ids)
          ? data.ids.filter((id): id is string => typeof id === "string")
          : selected.map((job) => job.id)
      );
      setJobs((prev) => prev.filter((job) => !deletedIds.has(job.id)));
      toast.success(
        `${deletedIds.size} offre${deletedIds.size > 1 ? "s" : ""} supprimée${deletedIds.size > 1 ? "s" : ""}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression groupée échouée");
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  function bumpScoringProgress(jobId: string) {
    setAnalysisByJobId((prev) => {
      const current = prev[jobId];
      if (!current || current.status !== "analyzing") return prev;
      return {
        ...prev,
        [jobId]: { ...current, progress: Math.min(90, current.progress + 4) },
      };
    });
  }

  async function analyzeJobById(
    jobId: string,
    options?: { silent?: boolean }
  ): Promise<"ok" | "error" | "missing_cv"> {
=======
          typeof data.error === "string" ? data.error : "Suppression échouée"
        );
      }
      const deletedIds = new Set(
        Array.isArray(data.ids) ? (data.ids as string[]) : ids
      );
      setJobs((prev) => prev.filter((job) => !deletedIds.has(job.id)));
      if (coverLetterJob && deletedIds.has(coverLetterJob.id)) {
        setCoverLetterJob(null);
      }
      toast.success(`${deletedIds.size} offre(s) supprimée(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression échouée");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAnalyze(jobId: string) {
>>>>>>> Stashed changes
    setAnalyzingId(jobId);
    setAnalysisByJobId((prev) => ({
      ...prev,
      [jobId]: { status: "analyzing", progress: Math.max(prev[jobId]?.progress ?? 15, 18) },
    }));

    const ticker = window.setInterval(() => bumpScoringProgress(jobId), 450);
    try {
      const res = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        const message =
          typeof data.error === "string" ? data.error : "Analyse échouée";
        const missingCv = /cv/i.test(message);
        setAnalysisByJobId((prev) => ({
          ...prev,
          [jobId]: { status: "error", progress: 100, error: message },
        }));
        if (!options?.silent) {
          toast.error(message);
        }
        return missingCv ? "missing_cv" : "error";
      }

      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? ((data.job as Job | undefined) ?? job) : job
        )
      );
      setAnalysisByJobId((prev) => ({
        ...prev,
        [jobId]: { status: "done", progress: 100 },
      }));
      if (!options?.silent) {
        toast.success("Analyse terminée");
      }
      return "ok";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyse échouée";
      setAnalysisByJobId((prev) => ({
        ...prev,
        [jobId]: { status: "error", progress: 100, error: message },
      }));
      if (!options?.silent) {
        toast.error(message);
      }
      return "error";
    } finally {
      window.clearInterval(ticker);
      setAnalyzingId(null);
    }
  }

  async function analyzeImportedJobs(jobIds: string[]) {
    if (jobIds.length === 0) return;

    setAnalysisByJobId(
      Object.fromEntries(
        jobIds.map((id, index) => [
          id,
          {
            status: index === 0 ? "analyzing" : "queued",
            progress: index === 0 ? 18 : 5,
          } satisfies JobScoringProgress,
        ])
      )
    );

    let success = 0;
    let failed = 0;
    for (let index = 0; index < jobIds.length; index += 1) {
      const jobId = jobIds[index];
      const result = await analyzeJobById(jobId, { silent: true });
      if (result === "ok") {
        success += 1;
      } else {
        failed += 1;
      }

      if (result === "missing_cv") {
        setAnalysisByJobId((prev) => {
          const next = { ...prev };
          for (const remainingId of jobIds.slice(index + 1)) {
            next[remainingId] = {
              status: "error",
              progress: 100,
              error: "Ajoute ton CV dans Profil & CV avant d’analyser une offre.",
            };
          }
          return next;
        });
        toast.error("Ajoute ton CV dans Profil & CV avant d’analyser une offre.");
        return;
      }

      const nextId = jobIds[index + 1];
      if (nextId) {
        setAnalysisByJobId((prev) => ({
          ...prev,
          [nextId]: { status: "analyzing", progress: 15, error: null },
        }));
      }
    }

    if (failed === 0) {
      toast.success(
        success === 1
          ? "Analyse terminée pour 1 offre"
          : `Analyse terminée pour ${success} offres`
      );
    } else {
      toast.error(`Analyse : ${success} réussie(s), ${failed} échec(s)`);
    }
  }

  async function handleAnalyze(jobId: string) {
    await analyzeJobById(jobId);
  }

  async function handleGenerateCoverLetter(jobId: string) {
    setGeneratingId(jobId);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Cover letter generation failed"
        );
      }
      const updated = data.job as Job | undefined;
      setJobs((prev) => prev.map((job) => (job.id === jobId ? updated ?? job : job)));
      if (updated) setCoverLetterJob(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cover letter generation failed");
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleBulkGenerateCoverLetters() {
    const selected = jobs.filter((job) => job.selected);
    if (selected.length === 0) {
      toast.error("Select at least one job");
      return;
    }
    if (selected.length > 10) {
      toast.error("Select at most 10 jobs per batch");
      return;
    }
    const cvRes = await fetch("/api/profile");
    const cvData = await readJsonSafe(cvRes);
    if (!cvRes.ok || !(cvData.profile as { cv_text?: string } | undefined)?.cv_text) {
      toast.error(
        "Ajoute ton CV dans Profil & CV avant de générer des lettres."
      );
      return;
    }

    setBulkLoading(true);
    setBulkProgress({
      total: selected.length,
      current: 0,
      success: 0,
      failed: 0,
      currentJob: "Generating cover letters...",
    });

    try {
      const res = await fetch("/api/generate-cover-letter/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: selected.map((job) => job.id) }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Batch generation failed");
      }

      const total = typeof data.total === "number" ? data.total : selected.length;
      const success = typeof data.success === "number" ? data.success : 0;
      const failed = typeof data.failed === "number" ? data.failed : 0;

      setBulkProgress({
        total,
        current: total,
        success,
        failed,
        currentJob: null,
      });

      await loadAll();

      const results = Array.isArray(data.results) ? data.results : [];
      const firstSuccess = results.find(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as { status?: string }).status === "success"
      ) as { jobId?: string } | undefined;

      if (firstSuccess?.jobId) {
        const jobsRes = await fetch("/api/jobs");
        const jobsData = await readJsonSafe(jobsRes);
        const refreshed = (jobsData.jobs as Job[]) ?? [];
        const jobToShow = refreshed.find((job) => job.id === firstSuccess.jobId);
        if (jobToShow?.cover_letter) {
          setCoverLetterJob(jobToShow);
        }
      }

      toast.success(`Generated ${success}/${total} cover letters (${failed} failed)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch generation failed");
    } finally {
      setBulkLoading(false);
    }
  }

<<<<<<< Updated upstream
  const emptyJobsCta = (
    <div className="space-y-6 rounded-lg border border-dashed p-8 text-center">
      <p className="text-base text-muted-foreground">
        Aucune offre pour l’instant. Choisis comment en ajouter :
      </p>
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          size="lg"
          className="h-12 min-w-[14rem] px-8 text-base"
          onClick={openCsvPicker}
          disabled={importingCsv}
          aria-label="Importer mes offres"
        >
          <Upload className="mr-2 h-5 w-5" aria-hidden />
          {importingCsv ? "Import…" : "Importer mes offres"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-12 min-w-[14rem] px-8 text-base"
          onClick={() => router.push("/imports?paste=1")}
          aria-label="Copier-coller l’offre"
        >
          <ClipboardPaste className="mr-2 h-5 w-5" aria-hidden />
          Copier-coller l’offre
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,.json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handleCsvFileChange(event)}
      />
      <StickyPageHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Offres</h1>
            <p className="text-base text-muted-foreground">
              Importe ou colle des offres, puis analyse le match avec ton CV.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allowLocalDevTools ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void seedFakeJobs()}
                disabled={seedingFakeJobs}
                aria-label="Ajouter des offres d’emploi de test"
              >
                {seedingFakeJobs ? "Fake fill…" : "Fake fill data"}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={openCsvPicker}
              disabled={importingCsv}
              aria-label="Importer mes offres"
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              {importingCsv ? "Import…" : "Importer mes offres"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
          onClick={() => router.push("/jobs")}
              aria-label="Copier-coller l’offre"
            >
              <ClipboardPaste className="mr-2 h-4 w-4" aria-hidden />
              Copier-coller l’offre
            </Button>
            <PageHelpButton pageId="jobs" />
          </div>
        </div>
      </StickyPageHeader>

      <JobBulkActions
        selectedCount={jobs.filter((job) => job.selected).length}
        loading={bulkStatusLoading}
        coverLetterLoading={bulkLoading}
        deleteLoading={bulkDeleteLoading}
        onBulkUpdate={handleBulkStatusUpdate}
        onGenerateCoverLetters={handleBulkGenerateCoverLetters}
        onBulkDelete={handleBulkDelete}
      />

      {bulkProgress && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-base">
            <span>
              Selected: {bulkProgress.total} · Current: {bulkProgress.current} · Success:{" "}
              {bulkProgress.success} · Failed: {bulkProgress.failed}
            </span>
            <span className="text-muted-foreground">
              {bulkProgress.currentJob ? `Generating: ${bulkProgress.currentJob}` : "Idle"}
            </span>
          </CardContent>
        </Card>
      )}

      <JobFiltersBar filters={filters} onChange={setFilters} sources={sources} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {loading ? "Offres…" : `Toutes les offres (${jobs.length})`}
        </h2>
        <Button variant="outline" onClick={() => void handleSync()} disabled={syncing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Synchronisation…" : "Synchroniser"}
        </Button>
      </div>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as "cards" | "table" | "kanban")}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cards">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Cartes
            </TabsTrigger>
            <TabsTrigger value="table">
              <List className="mr-2 h-4 w-4" />
              Tableau
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <Columns3 className="mr-2 h-4 w-4" />
              Suivi
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-3">
            <JobFilterMenu filters={filters} onChange={setFilters} />
            <JobDateFilter filters={filters} onChange={setFilters} />
          </div>
        </div>
        {jobs.length > 0 && filteredJobs.length !== jobs.length ? (
          <p className="mb-3 text-base text-muted-foreground">
            {filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} affichée
            {filteredJobs.length > 1 ? "s" : ""} sur {jobs.length} — élargis le filtre Date.
          </p>
        ) : null}

        <TabsContent value="cards" className="mt-0">
          {filteredJobs.length === 0 ? (
            jobs.length > 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-base text-muted-foreground">
                Aucune offre ne correspond aux filtres actifs. Élargis le filtre Date.
              </p>
            ) : (
              emptyJobsCta
            )
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSelect={(id, selected) => updateJob(id, { selected })}
                  onStatusChange={(id, status: JobStatus) => updateJob(id, { status })}
                  onAnalyze={handleAnalyze}
                  onGenerateCoverLetter={handleGenerateCoverLetter}
                  onViewCoverLetter={setCoverLetterJob}
                  onOpen={(opened) => router.push(`/jobs/${opened.id}`)}
                  isAnalyzing={analyzingId === job.id}
                  isGenerating={generatingId === job.id}
                  analysisProgress={analysisByJobId[job.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-0">
          {filteredJobs.length === 0 ? (
            jobs.length > 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-base text-muted-foreground">
                Aucune offre ne correspond aux filtres actifs. Élargis le filtre Date.
              </p>
            ) : (
              emptyJobsCta
            )
          ) : (
            <JobTable
              jobs={filteredJobs}
              onSelect={(id, selected) => updateJob(id, { selected })}
              onSelectAll={handleSelectAllVisible}
              onStatusChange={(id, status) => updateJob(id, { status })}
              onAnalyze={handleAnalyze}
              onViewCoverLetter={setCoverLetterJob}
              onOpen={(opened) => router.push(`/jobs/${opened.id}`)}
              analysisByJobId={analysisByJobId}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-0">
          {filteredJobs.length === 0 ? (
            jobs.length > 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-base text-muted-foreground">
                Aucune offre ne correspond aux filtres actifs. Élargis le filtre Date.
              </p>
            ) : (
              emptyJobsCta
            )
          ) : (
            <JobKanban
              jobs={filteredJobs}
              onJobsChange={setJobs}
            />
          )}
=======
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Define tracked searches once, automatic collection runs every day at 08:00.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"} · Next sync:{" "}
            {nextSyncAt ? new Date(nextSyncAt).toLocaleString() : "Not scheduled"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mainTab === "jobs" ? (
            <>
              <Button variant="outline" onClick={syncAllEnabled} disabled={syncingAll}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
                {syncingAll ? "Syncing..." : "Sync all enabled searches"}
              </Button>
              <Link href="/jobs/searches/new" className={buttonVariants()}>
                <Plus className="mr-2 h-4 w-4" />
                New Search
              </Link>
            </>
          ) : (
            <Button variant="outline" onClick={loadAll}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={mainTab}
        onValueChange={(value) => setMainTab(value as "collected" | "jobs")}
        className="space-y-4"
      >
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="collected" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Collected jobs
            <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {filteredJobs.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Jobs
            <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {trackedSearches.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Searches</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="h-44 animate-pulse" />
                  ))}
                </div>
              ) : trackedSearches.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Define tracked searches once
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Automatic collection runs every day at 08:00. Create your first search to start, or
                    import jobs manually from the Imports page.
                  </p>
                  <Link href="/jobs/searches/new" className={buttonVariants({ className: "mt-4" })}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Search
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {trackedSearches.map((search) => (
                    <Card key={search.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{search.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>{search.job_titles.join(", ") || "No job title"}</p>
                        <p>{search.locations.join(", ") || "Any location"}</p>
                        <p>
                          {search.minimum_salary
                            ? `${search.minimum_salary.toLocaleString()}${search.currency}`
                            : "No salary floor"}{" "}
                          · {search.remote_preference.replace(/_/g, " ")}
                        </p>
                        <p>
                          Last run:{" "}
                          {search.last_run ? new Date(search.last_run).toLocaleString() : "Never"}
                        </p>
                        <p>
                          Next sync:{" "}
                          {search.next_run
                            ? new Date(search.next_run).toLocaleString()
                            : "Not scheduled"}
                        </p>
                        <p>Jobs found: {search.jobs_found_today}</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runNow(search.id)}
                            disabled={runningSearchId === search.id}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {runningSearchId === search.id ? "Running..." : "Run now"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => editSearch(search)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicateSearch(search)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              fetch(`/api/tracked-searches/${search.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ enabled: !search.enabled }),
                              }).then(loadAll)
                            }
                          >
                            {search.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSearch(search.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collected" className="mt-0 space-y-4">
          <JobBulkActions
            selectedCount={jobs.filter((job) => job.selected).length}
            loading={bulkStatusLoading}
            coverLetterLoading={bulkLoading}
            deleteLoading={deleteLoading}
            onBulkUpdate={handleBulkStatusUpdate}
            onGenerateCoverLetters={handleBulkGenerateCoverLetters}
            onDeleteSelected={handleDeleteSelected}
          />

          {bulkProgress && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <span>
                  Selected: {bulkProgress.total} · Current: {bulkProgress.current} · Success:{" "}
                  {bulkProgress.success} · Failed: {bulkProgress.failed}
                </span>
                <span className="text-muted-foreground">
                  {bulkProgress.currentJob ? `Generating: ${bulkProgress.currentJob}` : "Idle"}
                </span>
              </CardContent>
            </Card>
          )}

          <JobFiltersBar filters={filters} onChange={setFilters} sources={sources} />

          <Tabs value={view} onValueChange={(value) => setView(value as "cards" | "table")}>
            <TabsList>
              <TabsTrigger value="cards">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="table">
                <List className="mr-2 h-4 w-4" />
                Table
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="mt-4">
              {filteredJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No collected jobs yet. Use &quot;Run now&quot; on a tracked search or import a CSV
                  from Imports.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onSelect={(id, selected) => updateJob(id, { selected })}
                      onStatusChange={(id, status: JobStatus) => updateJob(id, { status })}
                      onAnalyze={handleAnalyze}
                      onGenerateCoverLetter={handleGenerateCoverLetter}
                      onViewCoverLetter={setCoverLetterJob}
                      onOpen={(opened) => router.push(`/jobs/${opened.id}`)}
                      isAnalyzing={analyzingId === job.id}
                      isGenerating={generatingId === job.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <JobTable
                jobs={filteredJobs}
                onSelect={(id, selected) => updateJob(id, { selected })}
                onSelectAll={handleSelectAll}
                onDeleteSelected={handleDeleteSelected}
                deleteLoading={deleteLoading}
                onStatusChange={(id, status) => updateJob(id, { status })}
                onAnalyze={handleAnalyze}
                onViewCoverLetter={setCoverLetterJob}
                onOpen={(opened) => router.push(`/jobs/${opened.id}`)}
              />
            </TabsContent>
          </Tabs>
>>>>>>> Stashed changes
        </TabsContent>
      </Tabs>

      <CoverLetterModal
        job={coverLetterJob}
        open={!!coverLetterJob}
        onOpenChange={(open) => !open && setCoverLetterJob(null)}
        onSave={async (jobId, coverLetter) => {
          await updateJob(jobId, { cover_letter: coverLetter });
        }}
        onRegenerate={handleGenerateCoverLetter}
        isRegenerating={generatingId === coverLetterJob?.id}
      />
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
    </div>
  );
}
