"use client";

import { Loader2 } from "lucide-react";

export type JobScoringStatus = "queued" | "analyzing" | "done" | "error";

export type JobScoringProgress = {
  status: JobScoringStatus;
  progress: number;
  error?: string | null;
};

type JobScoringProgressBarProps = {
  progress: number;
  status: JobScoringStatus;
  title: string;
  error?: string | null;
};

export function JobScoringProgressBar({
  progress,
  status,
  title,
  error,
}: JobScoringProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const label =
    status === "analyzing"
      ? "Analyse du match…"
      : status === "queued"
        ? "En file d’attente…"
        : status === "error"
          ? error || "Analyse impossible"
          : "Analyse terminée";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-base">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {status === "analyzing" ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{pct}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full border bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Progression de l’analyse pour ${title}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            status === "error" ? "bg-destructive" : "bg-primary"
          } ${status === "analyzing" ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
