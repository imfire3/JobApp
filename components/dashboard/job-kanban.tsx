"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";
import { getMatchScoreColor } from "@/lib/jobs/utils";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

const COLUMN_LABELS: Record<JobStatus, string> = {
  new: "Nouveaux",
  selected: "Sélectionnés",
  cover_generated: "Lettres",
  applied: "Candidatés",
  interview: "Entretiens",
  rejected: "Refusés",
  archived: "Archivés",
};

const KANBAN_COLUMNS: JobStatus[] = [
  "new",
  "selected",
  "cover_generated",
  "applied",
  "interview",
  "rejected",
];

type JobKanbanProps = {
  jobs: Job[];
  loading?: boolean;
  onJobsChange: (jobs: Job[]) => void;
};

export function JobKanban({ jobs, loading, onJobsChange }: JobKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<JobStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const columns = useMemo(() => {
    const byStatus = Object.fromEntries(
      JOB_STATUSES.map((status) => [status, [] as Job[]])
    ) as Record<JobStatus, Job[]>;

    for (const job of jobs) {
      if (job.status === "archived") continue;
      byStatus[job.status]?.push(job);
    }

    for (const status of KANBAN_COLUMNS) {
      byStatus[status].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    }

    return byStatus;
  }, [jobs]);

  async function handleMove(jobId: string, status: JobStatus) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job || job.status === status) return;

    const previous = jobs;
    onJobsChange(
      jobs.map((item) =>
        item.id === jobId
          ? {
              ...item,
              status,
              selected: status === "selected" || status === "cover_generated" || status === "applied" || status === "interview"
                ? true
                : status === "rejected" || status === "archived"
                  ? false
                  : item.selected,
            }
          : item
      )
    );
    setUpdatingId(jobId);

    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: jobId,
          status,
          ...(status === "selected" || status === "cover_generated" || status === "applied" || status === "interview"
            ? { selected: true }
            : status === "rejected" || status === "archived"
              ? { selected: false }
              : {}),
        }),
      });
      const data = (await res.json()) as { job?: Job; error?: string };
      if (!res.ok || !data.job) {
        throw new Error(data.error ?? "Mise à jour impossible");
      }
      onJobsChange(previous.map((item) => (item.id === jobId ? data.job! : item)));
    } catch (error) {
      onJobsChange(previous);
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((status) => (
          <div
            key={status}
            className="min-w-[220px] flex-1 rounded-xl border bg-muted/40 p-3"
          >
            <div className="mb-3 h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {KANBAN_COLUMNS.map((status) => {
        const columnJobs = columns[status] ?? [];
        const isActive = dropTarget === status;

        return (
          <section
            key={status}
            className={cn(
              "flex min-w-[220px] max-w-[280px] flex-1 flex-col rounded-xl border bg-muted/30 p-3 transition-colors",
              isActive && "border-primary bg-primary/5"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTarget(status);
            }}
            onDragLeave={() => {
              setDropTarget((current) => (current === status ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const jobId = event.dataTransfer.getData("text/job-id") || draggingId;
              setDropTarget(null);
              setDraggingId(null);
              if (jobId) void handleMove(jobId, status);
            }}
          >
            <header className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {columnJobs.length}
              </span>
            </header>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2">
              {columnJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                  Glisse une offre ici
                </p>
              ) : (
                columnJobs.map((job) => (
                  <article
                    key={job.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggingId(job.id);
                      event.dataTransfer.setData("text/job-id", job.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-lg border bg-background p-3 shadow-sm transition active:cursor-grabbing",
                      draggingId === job.id && "opacity-50",
                      updatingId === job.id && "opacity-60"
                    )}
                  >
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block space-y-1.5"
                      onClick={(event) => {
                        if (draggingId) event.preventDefault();
                      }}
                    >
                      <p className="line-clamp-2 text-sm font-medium leading-snug">
                        {job.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {job.company}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{job.location || "—"}</span>
                        </span>
                        {typeof job.match_score === "number" ? (
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              getMatchScoreColor(job.match_score)
                            )}
                          >
                            {job.match_score}%
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
