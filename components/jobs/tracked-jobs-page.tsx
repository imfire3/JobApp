"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobFiltersBar } from "@/components/dashboard/job-filters";
import { JobCard } from "@/components/dashboard/job-card";
import { JobKanban } from "@/components/dashboard/job-kanban";
import { JobBulkActions } from "@/components/dashboard/job-bulk-actions";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { PasteJobDialog } from "@/components/jobs/paste-job-dialog";
import { filterJobs } from "@/lib/jobs/utils";
import type { Job, JobFilters, JobStatus } from "@/types";
import {
  CircleHelp,
  ClipboardPaste,
  Columns3,
  RefreshCw,
  LayoutGrid,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [view, setView] = useState<"cards" | "kanban">("cards");
  const [seedingFakeJobs, setSeedingFakeJobs] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [analysisByJobId, setAnalysisByJobId] = useState<
    Record<string, JobScoringProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkAnalyzeLoading, setBulkAnalyzeLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
    setLoadError(null);
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
      const message =
        error instanceof Error ? error.message : "Chargement des offres impossible";
      setLoadError(message);
      toast.error(message);
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
  const contracts = useMemo(
    () => [...new Set(jobs.map((job) => job.contract_type?.trim()).filter((value): value is string => Boolean(value)))].sort(),
    [jobs]
  );

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
        successSingular: "1 offre fake ajoutée — comparaison avec ton CV…",
        successPlural: (n) => `${n} offres fake ajoutées — comparaison avec ton CV…`,
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
        successSingular: "1 offre importée — comparaison avec ton CV…",
        successPlural: (n) => `${n} offres importées — comparaison avec ton CV…`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import échoué")
    } finally {
      setImportingCsv(false)
    }
  }

  async function updateJob(
    id: string,
    updates: Partial<Pick<Job, "status" | "selected" | "cover_letter">> & {
      /** When true, only toggles the checkbox and leaves the job status untouched. */
      selection_only?: boolean;
    }
  ) {
    const optimisticUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => key !== "selection_only")
    ) as Partial<Job>;
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...optimisticUpdates } : job))
    );

    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Failed to update job");
      await loadAll({ silent: true });
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

  async function handleBulkAnalyze() {
    const selected = jobs.filter((job) => job.selected);
    if (!selected.length) return;
    setBulkAnalyzeLoading(true);
    try {
      await analyzeImportedJobs(selected.map((job) => job.id));
    } finally {
      setBulkAnalyzeLoading(false);
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

  const selectedCount = jobs.filter((job) => job.selected).length;

  const primaryActionClassName =
    "gap-2 text-sm font-medium";
  const secondaryActionClassName =
    "gap-2 text-sm font-medium";

  const emptyJobsCta = (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-app-control border border-app-border-strong bg-app-surface px-4 py-8 text-center">
      <div className="space-y-2">
        <p className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-strong">
          Aucune offre pour l’instant.
        </p>
        <p className="text-base leading-6 text-app-text-subtle">
          Importe un fichier ou colle une offre pour lancer ta première
          Correspondance.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="control" className={primaryActionClassName} onClick={() => setPasteOpen(true)}>
          <ClipboardPaste className="size-4" aria-hidden />
          Coller une offre
        </Button>
        <Button type="button" variant="outline" size="control" className={secondaryActionClassName} onClick={openCsvPicker} disabled={importingCsv}>
          <Upload className="size-4" aria-hidden />
          Importer mes offres
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-6", selectedCount > 0 && "pb-36")}>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,.json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handleCsvFileChange(event)}
      />

      <header className="flex flex-wrap items-center gap-8 border-b border-app-border-strong pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-10 text-app-text">
            Mes offres
          </h1>
          <p className="text-lg leading-7 tracking-[-0.017em] text-app-text-label">
            Ajoute des offres, compare-les à ton CV et prépare tes prochaines
            candidatures.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {allowLocalDevTools ? (
            <Button
              type="button"
              variant="outline"
              size="control"
              className={secondaryActionClassName}
              onClick={() => void seedFakeJobs()}
              disabled={seedingFakeJobs}
              aria-label="Ajouter des offres d’emploi de test"
            >
              {seedingFakeJobs ? "Ajout des offres de test…" : "Ajouter des offres de test"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="control"
            className={primaryActionClassName}
            onClick={openCsvPicker}
            disabled={importingCsv}
            aria-label="Importer mes offres"
          >
            <Upload className="size-4" aria-hidden />
            {importingCsv ? "Import en cours…" : "Importer mes offres"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="control"
            className={secondaryActionClassName}
            onClick={() => setPasteOpen(true)}
            aria-label="Coller une offre"
          >
            <ClipboardPaste className="size-4" aria-hidden />
            Coller une offre
          </Button>
          <PageHelpButton
            pageId="jobs"
            label="Aide sur les offres"
            trigger={(openHelp) => (
              <button
                type="button"
                onClick={openHelp}
                aria-label="Aide sur les offres"
                className="flex size-(--app-control-height) shrink-0 items-center justify-center rounded-app-control border-(length:--app-stroke) border-app-border-default bg-app-surface text-app-text transition-colors hover:bg-app-control focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:outline-none"
              >
                <CircleHelp className="size-6" aria-hidden />
              </button>
            )}
          />
        </div>
      </header>

      <JobBulkActions
        selectedCount={selectedCount}
        loading={bulkStatusLoading}
        analyzeLoading={bulkAnalyzeLoading}
        coverLetterLoading={bulkLoading}
        deleteLoading={bulkDeleteLoading}
        onBulkUpdate={handleBulkStatusUpdate}
        onBulkAnalyze={handleBulkAnalyze}
        onGenerateCoverLetters={handleBulkGenerateCoverLetters}
        onBulkDelete={handleBulkDelete}
      />

      {bulkProgress && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-base">
            <span>
              Sélection : {bulkProgress.total} · Progression : {bulkProgress.current} · Réussites :{" "}
              {bulkProgress.success} · Échecs : {bulkProgress.failed}
            </span>
            <span className="text-muted-foreground">
              {bulkProgress.currentJob ? `Generating: ${bulkProgress.currentJob}` : "Idle"}
            </span>
          </CardContent>
        </Card>
      )}

      {loadError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-app-control border border-app-warning/40 bg-app-warning/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-base font-medium text-app-text-strong">
              Les offres n’ont pas pu être chargées.
            </p>
            <p className="text-sm leading-6 text-app-text-subtle">{loadError}</p>
          </div>
          <Button type="button" variant="outline" size="control" onClick={() => void loadAll()}>
            <RefreshCw className="size-4" aria-hidden />
            Réessayer
          </Button>
        </div>
      ) : null}

      <JobFiltersBar filters={filters} onChange={setFilters} sources={sources} contracts={contracts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold leading-7 tracking-[-0.03em] text-app-text">
          {!loading && <span className="flex min-w-8 h-8 items-center justify-center rounded-app-control bg-app-action px-2 text-lg font-medium text-app-text-inverse">{jobs.length}</span>}
          {loading ? "Chargement des offres…" : "Liste des offres"}
        </h2>
        <Button
          variant="outline"
          size="control"
          className={secondaryActionClassName}
          onClick={() => void handleSync()}
          disabled={syncing}
        >
          <RefreshCw className={cn("size-4", syncing && "animate-spin")} aria-hidden />
          {syncing ? "Synchronisation…" : "Synchroniser"}
        </Button>
      </div>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as "cards" | "kanban")}
        className="gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList variant="section" className="h-auto w-fit max-w-full flex-wrap gap-1">
            <TabsTrigger
              value="cards"
              variant="section"
              className="h-(--app-control-height) gap-2 px-4"
            >
              <LayoutGrid className="size-4" aria-hidden />
              Cartes
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              variant="section"
              className="h-(--app-control-height) gap-2 px-4"
            >
              <Columns3 className="size-4" aria-hidden />
              Suivi des candidatures
            </TabsTrigger>
          </TabsList>
        </div>
        {jobs.length > 0 && filteredJobs.length !== jobs.length ? (
          <p className="text-base text-app-text-secondary">
            {filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} affichée
            {filteredJobs.length > 1 ? "s" : ""} sur {jobs.length} — ajuste tes filtres pour afficher davantage d’offres.
          </p>
        ) : null}

        <TabsContent value="cards" className="mt-0">
          {loadError ? null : loading ? (
            <div role="status" aria-live="polite" className="rounded-app-control border border-app-border-strong bg-app-surface px-4 py-8 text-center text-base text-app-text-secondary">Chargement des offres…</div>
          ) : filteredJobs.length === 0 ? (
            jobs.length > 0 ? (
              <p className="rounded-app-control border border-app-border-strong bg-app-surface px-4 py-8 text-center text-lg font-medium leading-6 text-app-text-subtle">
                Aucune offre ne correspond aux filtres actifs. Ajuste tes filtres pour afficher davantage d’offres.
              </p>
            ) : (
              emptyJobsCta
            )
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSelect={(id, selected) =>
                    updateJob(id, { selected, selection_only: true })
                  }
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

        <TabsContent value="kanban" className="mt-0">
          {loadError ? null : loading ? (
            <div role="status" aria-live="polite" className="rounded-app-control border border-app-border-strong bg-app-surface px-4 py-8 text-center text-base text-app-text-secondary">Chargement des offres…</div>
          ) : filteredJobs.length === 0 ? (
            jobs.length > 0 ? (
              <p className="rounded-app-control border border-app-border-strong bg-app-surface px-4 py-8 text-center text-lg font-medium leading-6 text-app-text-subtle">
                Aucune offre ne correspond aux filtres actifs. Ajuste tes filtres pour afficher davantage d’offres.
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

      <PasteJobDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        onImported={(data) =>
          ingestImportedJobs(data, {
            successSingular: "1 offre importée — comparaison avec ton CV…",
            successPlural: (n) => `${n} offres importées — comparaison avec ton CV…`,
          })
        }
      />
    </div>
  );
}
