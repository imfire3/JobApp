"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import type { Job, JobStatus } from "@/types"
import {
  formatRelativeDate,
  getMatchScoreColor,
  getStatusColor,
} from "@/lib/jobs/utils"
import {
  KANBAN_COLUMN_LABELS,
  KANBAN_PIPELINE_COLUMNS,
  kanbanColumnForStatus,
  jobStatusLabel,
  type KanbanPipelineColumn,
} from "@/lib/jobs/status-labels"
import { cn } from "@/lib/utils"
import { MapPin } from "lucide-react"

type JobKanbanProps = {
  jobs: Job[]
  loading?: boolean
  onJobsChange: (jobs: Job[]) => void
}

function pipelineSelectedFlag(status: JobStatus): boolean | undefined {
  if (
    status === "selected" ||
    status === "cover_generated" ||
    status === "applied" ||
    status === "interview" ||
    status === "offer"
  ) {
    return true
  }
  if (status === "rejected" || status === "archived") return false
  return undefined
}

export function JobKanban({ jobs, loading, onJobsChange }: JobKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<KanbanPipelineColumn | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const columns = useMemo(() => {
    const byColumn = Object.fromEntries(
      KANBAN_PIPELINE_COLUMNS.map((col) => [col, [] as Job[]])
    ) as Record<KanbanPipelineColumn, Job[]>

    for (const job of jobs) {
      const column = kanbanColumnForStatus(job.status)
      if (!column) continue
      byColumn[column].push(job)
    }

    for (const col of KANBAN_PIPELINE_COLUMNS) {
      byColumn[col].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    }

    return byColumn
  }, [jobs])

  async function handleMove(jobId: string, column: KanbanPipelineColumn) {
    const job = jobs.find((item) => item.id === jobId)
    if (!job) return

    const currentColumn = kanbanColumnForStatus(job.status)
    if (currentColumn === column && job.status === column) return
    // Already in Sauvegardé bucket as selected — no-op
    if (column === "selected" && job.status === "selected") return
    // Dropping into Sauvegardé always persists as selected
    const nextStatus: JobStatus = column

    const previous = jobs
    const selectedFlag = pipelineSelectedFlag(nextStatus)
    onJobsChange(
      jobs.map((item) =>
        item.id === jobId
          ? {
              ...item,
              status: nextStatus,
              selected:
                selectedFlag === undefined ? item.selected : selectedFlag,
            }
          : item
      )
    )
    setUpdatingId(jobId)

    try {
      const res = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: jobId,
          status: nextStatus,
          ...(selectedFlag === undefined ? {} : { selected: selectedFlag }),
        }),
      })
      const data = (await res.json()) as { job?: Job; error?: string }
      if (!res.ok || !data.job) {
        throw new Error(data.error ?? "Mise à jour impossible")
      }
      onJobsChange(
        previous.map((item) => (item.id === jobId ? data.job! : item))
      )
    } catch (error) {
      onJobsChange(previous)
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible"
      )
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_PIPELINE_COLUMNS.map((status) => (
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
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {KANBAN_PIPELINE_COLUMNS.map((column) => {
        const columnJobs = columns[column] ?? []
        const isActive = dropTarget === column

        return (
          <section
            key={column}
            className={cn(
              "flex min-w-[240px] max-w-[300px] flex-1 flex-col rounded-xl border bg-muted/30 p-3 transition-colors",
              isActive && "border-primary bg-primary/5"
            )}
            onDragOver={(event) => {
              event.preventDefault()
              setDropTarget(column)
            }}
            onDragLeave={() => {
              setDropTarget((current) => (current === column ? null : current))
            }}
            onDrop={(event) => {
              event.preventDefault()
              const jobId =
                event.dataTransfer.getData("text/job-id") || draggingId
              setDropTarget(null)
              setDraggingId(null)
              if (jobId) void handleMove(jobId, column)
            }}
          >
            <header className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <h3 className="text-base font-semibold uppercase tracking-wide">
                {KANBAN_COLUMN_LABELS[column]}
              </h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-base text-muted-foreground">
                {columnJobs.length}
              </span>
            </header>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2">
              {columnJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-base text-muted-foreground">
                  Glisse une offre ici
                </p>
              ) : (
                columnJobs.map((job) => (
                  <article
                    key={job.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggingId(job.id)
                      event.dataTransfer.setData("text/job-id", job.id)
                      event.dataTransfer.effectAllowed = "move"
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDropTarget(null)
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
                        if (draggingId) event.preventDefault()
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-base font-medium leading-snug">
                          {job.title}
                        </p>
                        {typeof job.match_score === "number" ? (
                          <span
                            className={cn(
                              "shrink-0 text-base font-semibold",
                              getMatchScoreColor(job.match_score)
                            )}
                          >
                            {job.match_score}%
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-base text-muted-foreground">
                        {job.company}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <Badge variant="tag">{job.source}</Badge>
                        <Badge
                          className={getStatusColor(job.status)}
                          variant="secondary"
                        >
                          {jobStatusLabel(job.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                        <span className="flex min-w-0 items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {job.location || "—"}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {job.posted_at
                            ? formatRelativeDate(job.posted_at)
                            : "—"}
                        </span>
                      </div>
                    </Link>
                  </article>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
