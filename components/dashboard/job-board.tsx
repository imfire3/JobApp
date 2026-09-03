"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { JobFiltersBar } from "@/components/dashboard/job-filters";
import { JobCard } from "@/components/dashboard/job-card";
import { JobTable } from "@/components/dashboard/job-table";
import { JobBulkActions } from "@/components/dashboard/job-bulk-actions";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { computeKpis, filterJobs } from "@/lib/jobs/utils";
import type { Job, JobFilters, JobStatus } from "@/types";
import { Download, LayoutGrid, List, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

const defaultFilters: JobFilters = {
  postedWithinHours: 24,
};

export function JobBoard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sourceSummary, setSourceSummary] = useState<{
    last_sync_time: string | null;
    next_sync_time: string | null;
    source_health: { connected: number; notConfigured: number; error: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    current: number;
    success: number;
    failed: number;
    currentJob: string | null;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  async function readJsonSafe(res: Response) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async function getErrorMessage(res: Response, fallback: string) {
    const text = await res.text();
    if (!text) return `${fallback} (${res.status} ${res.statusText})`;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.error === "string") return parsed.error;
      return `${fallback} (${res.status} ${res.statusText})`;
    } catch {
      return `${fallback} (${res.status} ${res.statusText})`;
    }
  }

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      const data = (await readJsonSafe(res)) as any;
      if (!res.ok) throw new Error("Failed to fetch jobs");
      setJobs(data.jobs ?? []);
      setSourceSummary({
        last_sync_time: data.last_sync_time ?? null,
        next_sync_time: data.next_sync_time ?? null,
        source_health: data.source_health ?? {
          connected: 0,
          notConfigured: 0,
          error: 0,
        },
      });
    } catch {
      setJobs([]);
      setSourceSummary({
        last_sync_time: null,
        next_sync_time: null,
        source_health: { connected: 0, notConfigured: 0, error: 0 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = useMemo(
    () => filterJobs(jobs, filters),
    [jobs, filters]
  );

  const kpis = useMemo(() => {
    const computed = computeKpis(jobs);
    return {
      ...computed,
      lastSyncTime: sourceSummary?.last_sync_time ?? null,
      nextSyncTime: sourceSummary?.next_sync_time ?? null,
      sourceHealth: sourceSummary?.source_health ?? computed.sourceHealth,
    };
  }, [jobs, sourceSummary]);

  const sources = useMemo(
    () => [...new Set(jobs.map((j) => j.source))].sort(),
    [jobs]
  );

  const selectedCount = jobs.filter((j) => j.selected).length;

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/import-jobs/sample", { method: "POST" });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Sample import failed"));
      }
      const data = (await readJsonSafe(res)) as any;
      toast.success(`Imported ${data.imported} sample jobs`);
      await fetchJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sample import failed");
      router.push("/imports");
    } finally {
      setImporting(false);
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
    if (!res.ok) {
      toast.error("Failed to update job");
      return;
    }
    const data = (await readJsonSafe(res)) as any;
    setJobs((prev) => prev.map((j) => (j.id === id ? data.job : j)));
    if (coverLetterJob?.id === id) {
      setCoverLetterJob(data.job);
    }
  }

  async function handleBulkStatusUpdate(
    updates: Partial<Pick<Job, "status" | "selected">>
  ) {
    const selected = jobs.filter((j) => j.selected);
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
      const data = (await readJsonSafe(res)) as {
        jobs?: Job[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Mise à jour groupée échouée");
      }
      const updatedJobs = data.jobs ?? [];
      if (updatedJobs.length) {
        const byId = new Map(updatedJobs.map((job) => [job.id, job]));
        setJobs((prev) => prev.map((job) => byId.get(job.id) ?? job));
      } else {
        await fetchJobs();
      }
      toast.success(`Mise à jour appliquée à ${selected.length} offre(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour groupée échouée");
    } finally {
      setBulkStatusLoading(false);
    }
  }

  async function handleAnalyze(jobId: string) {
    setAnalyzingId(jobId);
    try {
      const res = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = (await readJsonSafe(res)) as any;
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
      toast.success(`Match score: ${data.analysis.match_score}%`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalyzingId(null);
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
      const data = (await readJsonSafe(res)) as any;
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
      setCoverLetterJob(data.job);
      toast.success("Cover letter generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleBulkGenerateCoverLetters() {
    const selected = jobs.filter((j) => j.selected);
    if (selected.length === 0) {
      toast.error("Select at least one job");
      return;
    }
    if (selected.length > 10) {
      toast.error("Select at most 10 jobs per batch");
      return;
    }
    const cvRes = await fetch("/api/profile");
    const cvData = (await readJsonSafe(cvRes)) as any;
    if (!cvRes.ok || !cvData.profile?.cv_text) {
      toast.error("Add your CV text in CV Context before generating cover letters");
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
      const data = (await readJsonSafe(res)) as any;
      if (!res.ok) {
        throw new Error(data.error ?? "Batch generation failed");
      }

      setBulkProgress({
        total: data.total ?? selected.length,
        current: data.total ?? selected.length,
        success: data.success ?? 0,
        failed: data.failed ?? 0,
        currentJob: null,
      });

      await fetchJobs();

      const firstSuccess = (data.results as Array<{ status: string; jobId: string }> | undefined)?.find(
        (item) => item.status === "success"
      );
      if (firstSuccess) {
        const jobsRes = await fetch("/api/jobs");
        const jobsData = (await readJsonSafe(jobsRes)) as any;
        const refreshed = (jobsData.jobs as Job[]) ?? [];
        const jobToShow = refreshed.find((job) => job.id === firstSuccess.jobId);
        if (jobToShow?.cover_letter) {
          setCoverLetterJob(jobToShow);
        }
      }

      toast.success(
        `Generated ${data.success ?? 0}/${data.total ?? selected.length} cover letters (${data.failed ?? 0} failed)`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch generation failed");
    } finally {
      setBulkLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job board</h1>
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} jobs · {selectedCount} selected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchJobs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            <Download className="mr-2 h-4 w-4" />
            {importing ? "Importing..." : "Import 10 sample jobs"}
          </Button>
        </div>
      </div>

      <JobBulkActions
        selectedCount={selectedCount}
        loading={bulkStatusLoading}
        coverLetterLoading={bulkLoading}
        onBulkUpdate={handleBulkStatusUpdate}
        onGenerateCoverLetters={handleBulkGenerateCoverLetters}
      />

      <KpiCards kpis={kpis} />
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

      <Tabs value={view} onValueChange={(v) => setView(v as "cards" | "table")}>
        <TabsList>
          <TabsTrigger value="cards" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <List className="h-4 w-4" />
            Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 py-10 text-center">
                <p className="text-muted-foreground">
                  No jobs yet. Import sample jobs or configure your sources.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={handleImport}>Import sample jobs</Button>
                  <Link href="/sources" className={buttonVariants({ variant: "outline" })}>
                    Configure sources
                  </Link>
                  <Button variant="secondary" onClick={handleImport}>
                    Run sync now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSelect={(id, selected) => updateJob(id, { selected })}
                  onStatusChange={(id, status: JobStatus) =>
                    updateJob(id, { status })
                  }
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
          {filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              No jobs match your filters.
            </div>
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
    </div>
  );
}
