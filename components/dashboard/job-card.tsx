"use client"

import { useEffect, useRef, useState } from "react";
import { jobStatusLabel } from "@/lib/jobs/status-labels";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeDate } from "@/lib/jobs/utils";
import type { Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";
import {
  Bookmark,
  ChevronDown,
  CircleCheck,
  Eye,
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import {
  JobScoringProgressBar,
  analyzingLabelForProgress,
  type JobScoringProgress,
} from "@/components/jobs/job-scoring-progress";

interface JobCardProps {
  job: Job;
  onSelect: (jobId: string, selected: boolean) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onAnalyze: (jobId: string) => void;
  onGenerateCoverLetter: (jobId: string) => void;
  onViewCoverLetter: (job: Job) => void;
  onOpen?: (job: Job) => void;
  isAnalyzing?: boolean;
  isGenerating?: boolean;
  analysisProgress?: JobScoringProgress;
}

/** Figma "Feedback/Badge" — success chip used for offer metadata. */
const jobTagClassName =
  "flex h-8 max-w-full shrink-0 items-center justify-center rounded-app-badge bg-app-success-surface px-2 text-base font-medium leading-6 tracking-[-0.02em] text-app-success";

/** Figma match-score chip on Card Jobs. */
const jobScoreClassName =
  "flex h-8 shrink-0 items-center justify-center rounded-app-badge bg-app-match-surface px-2 text-base font-medium leading-6 tracking-[-0.02em] tabular-nums text-app-match";

/** Figma "Forms/Select" trigger used in the card footer. */
const jobCardSelectClassName =
  "flex h-(--app-control-height) min-w-0 flex-1 items-center justify-between gap-2 rounded-app-control border-(length:--app-stroke) border-app-border-strong bg-app-surface px-3 text-base leading-6 transition-colors hover:border-app-text-muted focus-visible:border-app-text-secondary focus-visible:ring-2 focus-visible:ring-app-text-secondary/40 focus-visible:outline-none";

export function JobCard({
  job,
  onSelect,
  onStatusChange,
  onAnalyze,
  onGenerateCoverLetter,
  onViewCoverLetter,
  onOpen,
  isAnalyzing,
  isGenerating,
  analysisProgress,
}: JobCardProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [descriptionLineCount, setDescriptionLineCount] = useState(4);
  const scoring =
    analysisProgress ??
    (isAnalyzing ? { status: "analyzing" as const, progress: 55 } : null);
  const showScoringBar =
    scoring !== null &&
    (scoring.status === "queued" ||
      scoring.status === "analyzing" ||
      scoring.status === "error");

  const handleOpen = () => {
    onOpen?.(job);
  };

  const tags = [
    job.source,
    job.contract_type,
    job.posted_at ? formatRelativeDate(job.posted_at) : null,
    job.salary,
    job.remote_mode && job.remote_mode !== "unknown" ? job.remote_mode : null,
    job.experience_level !== null && job.experience_level !== undefined
      ? `${job.experience_level}+ ans`
      : null,
    job.tracked_search_name ? `Recherche : ${job.tracked_search_name}` : null,
  ].filter((tag): tag is string => Boolean(tag)).slice(0, 6);

  useEffect(() => {
    const description = descriptionRef.current;
    if (!description) return;

    const updateLineCount = () => {
      const paragraph = description.querySelector("p");
      if (!paragraph) return;
      const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

      const nextLineCount = Math.max(1, Math.floor(description.clientHeight / lineHeight));
      setDescriptionLineCount((current) =>
        current === nextLineCount ? current : nextLineCount
      );
    };

    updateLineCount();
    const observer = new ResizeObserver(updateLineCount);
    observer.observe(description);
    return () => observer.disconnect();
  }, [job.id]);

  return (
    <div
      className={cn(
        "flex flex-col self-start overflow-hidden rounded-app-surface border border-app-border-strong bg-app-surface transition-colors md:h-[404px]",
        onOpen && "cursor-pointer hover:border-app-text-muted"
      )}
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Ouvrir l’analyse pour ${job.title}` : undefined}
      onClick={onOpen ? handleOpen : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOpen();
              }
            }
          : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={job.selected}
            onCheckedChange={(checked) => onSelect(job.id, checked === true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Sélectionner ${job.title}`}
            className="border-(length:--app-stroke) border-app-text-muted bg-app-control"
          />
          <h3 className="min-w-0 flex-1 truncate text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-strong">
            {job.title}
          </h3>
          {job.match_score !== null && (
            <span className={jobScoreClassName}>
              {job.match_score}%
              <span className="sr-only"> de correspondance</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-app-text-secondary">
          <span className="min-w-0 truncate font-medium text-app-text-strong">
            {job.company || "Entreprise non renseignée"}
          </span>
          {job.location ? (
            <>
              <span aria-hidden>·</span>
              <span className="min-w-0 truncate">{job.location}</span>
            </>
          ) : null}
          <span className="ml-auto inline-flex h-7 shrink-0 items-center rounded-app-badge bg-app-control px-2 text-sm font-medium leading-5 text-app-text-strong">
            {jobStatusLabel(job.status)}
          </span>
        </div>

        {tags.length > 0 && (
          <ul className="flex max-h-[72px] shrink-0 flex-wrap items-end gap-2 overflow-hidden">
            {tags.map((tag, index) => (
              <li key={`${tag}-${index}`} className={cn(jobTagClassName, "truncate")}>
                {tag}
              </li>
            ))}
          </ul>
        )}

        {showScoringBar && scoring ? (
          <JobScoringProgressBar
            progress={scoring.progress}
            status={scoring.status}
            title={job.title}
            error={scoring.error}
            label={
              scoring.status === "analyzing" || scoring.status === "queued"
                ? analyzingLabelForProgress(scoring.progress)
                : null
            }
          />
        ) : null}

        <div ref={descriptionRef} className="min-h-0 flex-1 overflow-hidden">
          <p
            className="overflow-hidden text-ellipsis text-base leading-[26px] tracking-[-0.02em] text-app-text-secondary"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: descriptionLineCount,
            }}
            title={job.summary ?? job.ai_summary ?? job.description ?? undefined}
          >
            {job.summary ??
              job.ai_summary ??
              job.description ??
              "Aucun descriptif pour cette offre. Ouvre-la pour consulter le détail."}
          </p>
        </div>

      </div>

      <div
        className="flex items-center gap-4 bg-app-control p-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(jobCardSelectClassName, "text-app-text-muted")}
          >
            Actions
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                job.url &&
                window.open(job.url, "_blank", "noopener,noreferrer")
              }
              disabled={!job.url}
            >
              <Eye />
              Voir l’offre d’origine
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAnalyze(job.id)}
              disabled={
                isAnalyzing ||
                scoring?.status === "analyzing" ||
                scoring?.status === "queued"
              }
            >
              <Sparkles />
              {isAnalyzing || scoring?.status === "analyzing"
                ? "Analyse…"
                : scoring?.status === "queued"
                  ? "En attente d’analyse…"
                  : "Comparer à mon CV"}
            </DropdownMenuItem>
            {job.cover_letter ? (
              <DropdownMenuItem onClick={() => onViewCoverLetter(job)}>
                <FileText />
                Lire la lettre
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onGenerateCoverLetter(job.id)}
                disabled={isGenerating}
              >
                <FileText />
                {isGenerating ? "Rédaction…" : "Rédiger une lettre"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onStatusChange(job.id, "applied")}>
              <CircleCheck />
              Marquer comme envoyée
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onStatusChange(job.id, "rejected")}
            >
              <X />
              Écarter cette offre
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(job.id, "selected")}>
              <Bookmark />
              Retenir cette offre
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-base leading-6 text-app-text-strong">Statut</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(jobCardSelectClassName, "text-app-text-strong")}
            >
              <span className="truncate">{jobStatusLabel(job.status)}</span>
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {JOB_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onStatusChange(job.id, status)}
                >
                  {jobStatusLabel(status)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
