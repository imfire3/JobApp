"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobFiltersBar, JobDateFilter } from "@/components/dashboard/job-filters";
import { JobCard } from "@/components/dashboard/job-card";
import { JobTable } from "@/components/dashboard/job-table";
import { JobBulkActions } from "@/components/dashboard/job-bulk-actions";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { filterJobs } from "@/lib/jobs/utils";
import type { Job, JobFilters, JobStatus } from "@/types";
import { ClipboardPaste, List, RefreshCw, LayoutGrid, Upload } from "lucide-react";
import { toast } from "sonner";
import type { JobScoringProgress } from "@/components/jobs/job-scoring-progress";
import { useRouter } from "next/navigation";

const defaultFilters: JobFilters = {};

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

export function TrackedJobsPage({
  allowLocalDevTools = false,
}: {
  allowLocalDevTools?: boolean
}) {
  const router = useRouter();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [view, setView] = useState<"cards" | "table">("table");
  const [seedingFakeJobs, setSeedingFakeJobs] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [analysisByJobId, setAnalysisByJobId] = useState<
    Record<string, JobScoringProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
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

  const filteredJobs = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const sources = useMemo(() => [...new Set(jobs.map((job) => job.source))].sort(), [jobs]);

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

  async function handleSelectAllVisible(selected: boolean) {
    const ids = filteredJobs.map((job) => job.id);
    if (ids.length === 0) return;

    setBulkStatusLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, selected, selection_only: true }),
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

  async function handleBulkDelete() {
    const selected = jobs.filter((job) => job.selected);
    if (selected.length === 0) {
      toast.error("Sélectionne au moins une offre");
      return;
    }
    if (
      !window.confirm(
        `Supprimer définitivement ${selected.length} offre${selected.length > 1 ? "s" : ""} ?`
      )
    ) {
      return;
    }

    setBulkDeleteLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected.map((job) => job.id) }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
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
          <div className="flex flex-wrap gap-2">
            <PageHelpButton pageId="jobs" />
            {allowLocalDevTools ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void seedFakeJobs()}
                disabled={seedingFakeJobs}
                aria-label="Ajouter des offres d’emploi de test"
              >
                {seedingFakeJobs ? "Fake fill…" : "Fake fill data"}
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              onClick={openCsvPicker}
              disabled={importingCsv}
              aria-label="Importer mes offres"
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              {importingCsv ? "Import…" : "Importer mes offres"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={() => router.push("/imports?paste=1")}
              aria-label="Copier-coller l’offre"
            >
              <ClipboardPaste className="mr-2 h-4 w-4" aria-hidden />
              Copier-coller l’offre
            </Button>
          </div>
        </div>
      </StickyPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          {loading ? "Offres…" : `Toutes les offres (${jobs.length})`}
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
                Aucune offre ne correspond aux filtres actifs. Élargis la date ou
                désactive « 24 h seulement ».
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
    </div>
  );
}
