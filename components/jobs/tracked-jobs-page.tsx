"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobFiltersBar, JobDateFilter } from "@/components/dashboard/job-filters";
import { JobCard } from "@/components/dashboard/job-card";
import { JobTable } from "@/components/dashboard/job-table";
import { JobBulkActions } from "@/components/dashboard/job-bulk-actions";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { filterJobs } from "@/lib/jobs/utils";
import type { Job, JobFilters, JobStatus, TrackedSearch } from "@/types";
import { List, Play, Plus, RefreshCw, Trash2, LayoutGrid, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { JobScoringProgress } from "@/components/jobs/job-scoring-progress";
import { nativeSelectClassName, nativeSelectChevronStyle } from "@/components/ui/native-select";
import {
  emptyTrackedSearchForm,
  TrackedSearchForm,
  type TrackedSearchFormValues,
} from "@/components/jobs/tracked-search-form";
import { useRouter } from "next/navigation";

const defaultFilters: JobFilters = {};

type TrackedSearchPayload = TrackedSearchFormValues;

const CSV_ACCEPT =
  ".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ImportedJobRef = {
  id: string;
  url: string;
  title: string;
  company: string;
  was_duplicate: boolean;
};

type ImportJobsPayload = {
  error?: string;
  message?: string;
  jobs?: ImportedJobRef[];
  summary?: {
    imported?: number;
    duplicates?: number;
  };
};

const emptySearch: TrackedSearchPayload = emptyTrackedSearchForm();

export function TrackedJobsPage() {
  const router = useRouter();
  const [trackedSearches, setTrackedSearches] = useState<TrackedSearch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [view, setView] = useState<"cards" | "table">("table");
  const [searchForm, setSearchForm] = useState<TrackedSearchPayload>(emptySearch);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [analysisByJobId, setAnalysisByJobId] = useState<
    Record<string, JobScoringProgress>
  >({});
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [editingSearch, setEditingSearch] = useState<TrackedSearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningSearchId, setRunningSearchId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState<string>("all");
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
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
      const [searchesRes, jobsRes] = await Promise.all([
        fetch("/api/tracked-searches"),
        fetch("/api/jobs"),
      ]);
      const searchesData = await readJsonSafe(searchesRes);
      const jobsData = await readJsonSafe(jobsRes);
      if (!searchesRes.ok) {
        throw new Error(
          typeof searchesData.error === "string"
            ? searchesData.error
            : "Failed to load searches"
        );
      }
      if (!jobsRes.ok) {
        throw new Error(
          typeof jobsData.error === "string" ? jobsData.error : "Failed to load jobs"
        );
      }
      setTrackedSearches((searchesData.tracked_searches as TrackedSearch[]) ?? []);
      setJobs((jobsData.jobs as Job[]) ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load jobs");
      setTrackedSearches([]);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredJobs = useMemo(() => {
    const bySearch =
      selectedSearchId === "all"
        ? jobs
        : jobs.filter((job) => job.tracked_search_id === selectedSearchId);
    return filterJobs(bySearch, filters);
  }, [jobs, filters, selectedSearchId]);
  const selectedSearch = useMemo(
    () => trackedSearches.find((search) => search.id === selectedSearchId) ?? null,
    [trackedSearches, selectedSearchId]
  );
  const sources = useMemo(() => [...new Set(jobs.map((job) => job.source))].sort(), [jobs]);
  const lastSyncAt = useMemo(() => {
    const timestamps = trackedSearches
      .map((search) => search.last_run)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime());
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [trackedSearches]);
  const nextSyncAt = useMemo(() => {
    const timestamps = trackedSearches
      .filter((search) => search.enabled && search.next_run)
      .map((search) => new Date(search.next_run as string).getTime());
    if (timestamps.length === 0) return null;
    return new Date(Math.min(...timestamps)).toISOString();
  }, [trackedSearches]);

  async function saveSearch() {
    try {
      const isEdit = Boolean(editingSearch);
      const endpoint = isEdit
        ? `/api/tracked-searches/${editingSearch!.id}`
        : "/api/tracked-searches";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchForm),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Failed to save search (${res.status} ${res.statusText})`
        );
      }
      toast.success(isEdit ? "Alerte mise à jour" : "Alerte créée");
      setDialogOpen(false);
      setEditingSearch(null);
      setSearchForm(emptySearch);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save search");
    }
  }

  async function deleteSearch(searchId: string) {
    const res = await fetch(`/api/tracked-searches/${searchId}`, { method: "DELETE" });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Failed to delete search");
      return;
    }
    toast.success("Alerte supprimée");
    if (selectedSearchId === searchId) {
      setSelectedSearchId("all");
    }
    await loadAll();
  }

  async function runNow(searchId: string) {
    setRunningSearchId(searchId);
    try {
      const res = await fetch(`/api/tracked-searches/${searchId}/run`, { method: "POST" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to run search"
        );
      }
      const imported = typeof data.imported === "number" ? data.imported : 0;
      const duplicates = typeof data.duplicates === "number" ? data.duplicates : 0;
      const ignoredOld =
        typeof data.ignored_old === "number" ? data.ignored_old : 0;
      toast.success(
        `Run complete: ${imported} imported · ${duplicates} duplicates · ${ignoredOld} older than 24h`
      );
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run search");
    } finally {
      setRunningSearchId(null);
    }
  }

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

  function editSearch(search: TrackedSearch) {
    setEditingSearch(search);
    setSearchForm({
      name: search.name,
      enabled: search.enabled,
      job_titles: search.job_titles ?? [],
      keywords: search.keywords ?? [],
      excluded_keywords: search.excluded_keywords ?? [],
      locations: search.locations ?? [],
      remote_preference: search.remote_preference ?? "any",
      hybrid: search.hybrid ?? false,
      on_site: search.on_site ?? false,
      experience: search.experience ?? [],
      contract_types: search.contract_types ?? [],
      minimum_salary: search.minimum_salary ?? null,
      maximum_salary: search.maximum_salary ?? null,
      salary_period: search.salary_period ?? "year",
      currency: search.currency ?? "EUR",
      industries: search.industries ?? [],
      excluded_industries: search.excluded_industries ?? [],
      company_size: search.company_size ?? null,
      company_culture: search.company_culture ?? null,
      company_names: search.company_names ?? [],
      languages: search.languages ?? [],
      expertises: search.expertises ?? [],
      only_with_salary: search.only_with_salary ?? false,
      exclusive_only: search.exclusive_only ?? false,
      top_recruiter_only: search.top_recruiter_only ?? false,
      start_date_preference: search.start_date_preference ?? null,
      publish_window: search.publish_window ?? null,
      ai_preferences: search.ai_preferences ?? {},
      minimum_match_score: search.minimum_match_score ?? null,
    });
    setDialogOpen(true);
  }

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
    updates: Partial<Pick<Job, "status" | "selected">>
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

  const handleOpenCsvPicker = () => {
    if (csvImporting) return;
    csvInputRef.current?.click();
  };

  async function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      toast.error("Choisis un fichier CSV ou Excel.");
      return;
    }

    setCsvImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-jobs", {
        method: "POST",
        body: formData,
      });
      const payload = (await readJsonSafe(response)) as ImportJobsPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Import impossible"
        );
      }

      const importedJobs = (payload.jobs ?? []).filter((job) => !job.was_duplicate);
      toast.success(payload.message ?? "Offres importées");

      if (importedJobs.length === 0) {
        await loadAll({ silent: true });
        return;
      }

      setView("cards");
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
      );
      await loadAll({ silent: true });
      setJobs((prev) => {
        const importedIds = new Set(importedJobs.map((job) => job.id));
        const imported = prev.filter((job) => importedIds.has(job.id));
        const rest = prev.filter((job) => !importedIds.has(job.id));
        return [...imported, ...rest];
      });
      await analyzeImportedJobs(importedJobs.map((job) => job.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import impossible");
    } finally {
      setCsvImporting(false);
    }
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

  return (
    <div className="space-y-6">
      <StickyPageHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Offres</h1>
            <p className="text-base text-muted-foreground">
              Choisis une alerte pour voir ses offres. Collecte auto tous les jours à 08:00.
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              Dernière sync : {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Jamais"} ·
              Prochaine : {nextSyncAt ? new Date(nextSyncAt).toLocaleString() : "Non planifiée"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PageHelpButton pageId="jobs" />
            <Button variant="outline" onClick={syncAllEnabled} disabled={syncingAll}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
              {syncingAll ? "Sync…" : "Sync toutes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenCsvPicker}
              disabled={csvImporting}
              aria-label="Importer un fichier CSV ou Excel"
            >
              <Upload className={`mr-2 h-4 w-4 ${csvImporting ? "animate-pulse" : ""}`} />
              {csvImporting ? "Import…" : "Importer CSV"}
            </Button>
            <Button

              onClick={() => {
                setEditingSearch(null);
                setSearchForm(emptySearch);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle alerte
            </Button>
          </div>
        </div>
      </StickyPageHeader>

      <Card>
        <CardContent className="space-y-4 pt-2">
          <Field>
            <Label htmlFor="tracked-search-select" className="mb-0">
              Alerte
            </Label>
            {loading ? (
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
            ) : trackedSearches.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-base text-muted-foreground">
                Aucune alerte pour l’instant. Crée-en une pour suivre des offres, ou importe un
                CSV.
              </p>
            ) : (
              <select
                id="tracked-search-select"
                className={nativeSelectClassName}
                style={nativeSelectChevronStyle}
                value={selectedSearchId}
                onChange={(e) => setSelectedSearchId(e.target.value)}
              >
                <option value="all">Toutes les offres ({jobs.length})</option>
                {trackedSearches.map((search) => {
                  const count = jobs.filter((job) => job.tracked_search_id === search.id).length;
                  return (
                    <option key={search.id} value={search.id}>
                      {search.name} · {count} offre{count === 1 ? "" : "s"}
                      {!search.enabled ? " (désactivée)" : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </Field>

          {selectedSearch ? (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-base text-muted-foreground">
                <p className="truncate font-medium text-foreground">{selectedSearch.name}</p>
                <p className="truncate">
                  {(selectedSearch.job_titles.join(", ") || "Tous postes") +
                    " · " +
                    (selectedSearch.locations.join(", ") || "Tous lieux")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runNow(selectedSearch.id)}
                  disabled={runningSearchId === selectedSearch.id}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {runningSearchId === selectedSearch.id ? "…" : "Lancer"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => editSearch(selectedSearch)}>
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    fetch(`/api/tracked-searches/${selectedSearch.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ enabled: !selectedSearch.enabled }),
                    }).then(() => loadAll())
                  }
                >
                  {selectedSearch.enabled ? "Désactiver" : "Activer"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteSearch(selectedSearch.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          {selectedSearch ? `Offres · ${selectedSearch.name}` : "Toutes les offres"}
        </h2>
        <Button variant="outline" onClick={() => void loadAll()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Rafraîchir
        </Button>
      </div>

      <JobBulkActions
        selectedCount={jobs.filter((job) => job.selected).length}
        loading={bulkStatusLoading}
        coverLetterLoading={bulkLoading}
        onBulkUpdate={handleBulkStatusUpdate}
        onGenerateCoverLetters={handleBulkGenerateCoverLetters}
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

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as "cards" | "table")}

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
          </TabsList>
          <JobDateFilter filters={filters} onChange={setFilters} />
        </div>
        {jobs.length > 0 && filteredJobs.length !== jobs.length ? (
          <p className="mb-3 text-base text-muted-foreground">
            {filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} affichée
            {filteredJobs.length > 1 ? "s" : ""} sur {jobs.length} — élargis le filtre Date
            ou désactive « 24 h seulement ».
          </p>
        ) : null}

        <TabsContent value="cards" className="mt-0">
          {filteredJobs.length === 0 ? (
            jobs.length > 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-base text-muted-foreground">
                Aucune offre ne correspond aux filtres actifs. Élargis la date ou
                désactive « 24 h seulement ».
              </p>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center space-y-4">
                <p className="text-base text-muted-foreground">
                  Aucune offre pour l’instant. Choisis comment en ajouter :
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(true);
                    }}
                  >
                    Créer une alerte
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenCsvPicker}
                    disabled={csvImporting}
                  >
                    {csvImporting ? "Import…" : "Importer un CSV"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/extension")}
                  >
                    Installer l’extension
                  </Button>
                </div>
              </div>
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
                Aucune offre ne correspond aux filtres actifs. Élargis la date ou
                désactive « 24 h seulement ».
              </p>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center space-y-4">
                <p className="text-base text-muted-foreground">
                  Aucune offre pour l’instant. Choisis comment en ajouter :
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(true)}>
                    Créer une alerte
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenCsvPicker}
                    disabled={csvImporting}
                  >
                    {csvImporting ? "Import…" : "Importer un CSV"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/extension")}
                  >
                    Installer l’extension
                  </Button>
                </div>
              </div>
            )
          ) : (
            <JobTable
              jobs={filteredJobs}
              onSelect={(id, selected) => updateJob(id, { selected })}
              onStatusChange={(id, status) => updateJob(id, { status })}
              onAnalyze={handleAnalyze}
              onViewCoverLetter={setCoverLetterJob}
              onOpen={(opened) => router.push(`/jobs/${opened.id}`)}
            />
          )}
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

      <input
        ref={csvInputRef}
        type="file"
        accept={CSV_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleCsvFileChange(event)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSearch ? "Modifier l’alerte" : "Nouvelle alerte"}
            </DialogTitle>
          </DialogHeader>
          <TrackedSearchForm
            value={searchForm}
            onChange={setSearchForm}
            onSubmit={saveSearch}
            submitLabel={editingSearch ? "Enregistrer" : "Créer l’alerte"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
