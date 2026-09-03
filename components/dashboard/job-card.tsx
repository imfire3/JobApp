"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatRelativeDate,
  getMatchScoreColor,
  getStatusColor,
} from "@/lib/jobs/utils";
import type { Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  MapPin,
  Sparkles,
  Wifi,
} from "lucide-react";

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
}

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
}: JobCardProps) {
  const handleOpen = () => {
    onOpen?.(job);
  };

  return (
    <Card
      className={`flex flex-col shadow-sm transition-shadow hover:shadow-md ${
        onOpen ? "cursor-pointer" : ""
      }`}
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
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={job.selected}
            onCheckedChange={(checked) => onSelect(job.id, checked === true)}
            onClick={(event) => event.stopPropagation()}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt=""
                  className="h-8 w-8 rounded-md border object-contain"
                />
              ) : null}
              <h3 className="font-semibold leading-tight">{job.title}</h3>
              {job.match_score !== null && (
                <span
                  className={`text-sm font-bold ${getMatchScoreColor(job.match_score)}`}
                >
                  {job.match_score}%
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
          <Badge className={getStatusColor(job.status)} variant="secondary">
            {job.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{job.source}</Badge>
          {job.tracked_search_name && (
            <Badge variant="outline">Search: {job.tracked_search_name}</Badge>
          )}
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.contract_type && (
            <Badge variant="outline">{job.contract_type}</Badge>
          )}
          {job.remote_mode && job.remote_mode !== "unknown" && (
            <span className="inline-flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              {job.remote_mode}
            </span>
          )}
          {job.experience_level !== null && job.experience_level !== undefined && (
            <Badge variant="outline">{job.experience_level}+ yrs</Badge>
          )}
          {job.salary && <Badge variant="outline">{job.salary}</Badge>}
          {job.posted_at && (
            <span>{formatRelativeDate(job.posted_at)}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {job.summary ?? job.ai_summary ?? job.description}
        </p>

        {job.match_reasons && job.match_reasons.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-foreground">Top matches</p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {job.match_reasons.slice(0, 2).map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter
        className="flex flex-wrap gap-2 border-t pt-4"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          View
        </a>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onAnalyze(job.id)}
          disabled={isAnalyzing}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </Button>

        {job.cover_letter ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewCoverLetter(job)}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Cover letter
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateCoverLetter(job.id)}
            disabled={isGenerating}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            {isGenerating ? "Generating..." : "Generate CL"}
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={() => onStatusChange(job.id, "applied")}>
          Apply
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onStatusChange(job.id, "rejected")}>
          Reject
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onStatusChange(job.id, "selected")}>
          Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Status
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {JOB_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onStatusChange(job.id, status)}
              >
                {status.replace(/_/g, " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
