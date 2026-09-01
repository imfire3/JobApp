"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatRelativeDate,
  getMatchScoreColor,
  getStatusColor,
} from "@/lib/jobs/utils";
import type { Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";
import { ChevronDown, ExternalLink } from "lucide-react";

interface JobTableProps {
  jobs: Job[];
  onSelect: (jobId: string, selected: boolean) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onAnalyze: (jobId: string) => void;
  onViewCoverLetter: (job: Job) => void;
}

export function JobTable({
  jobs,
  onSelect,
  onStatusChange,
  onAnalyze,
  onViewCoverLetter,
}: JobTableProps) {
  const cellBorder = "border-r border-border/50 last:border-r-0";

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={`w-10 ${cellBorder}`} />
            <TableHead className={cellBorder}>Role</TableHead>
            <TableHead className={cellBorder}>Company</TableHead>
            <TableHead className={cellBorder}>Source</TableHead>
            <TableHead className={cellBorder}>Location</TableHead>
            <TableHead className={cellBorder}>Contract</TableHead>
            <TableHead className={cellBorder}>Salary</TableHead>
            <TableHead className={cellBorder}>Match</TableHead>
            <TableHead className={cellBorder}>Posted</TableHead>
            <TableHead className={cellBorder}>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className={cellBorder}>
                <Checkbox
                  checked={job.selected}
                  onCheckedChange={(checked) =>
                    onSelect(job.id, checked === true)
                  }
                />
              </TableCell>
              <TableCell className={`font-medium ${cellBorder}`}>
                <div className="flex items-center gap-2">
                  {job.company_logo_url ? (
                    <img
                      src={job.company_logo_url}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded border object-contain"
                    />
                  ) : null}
                  <span className="line-clamp-2">{job.title}</span>
                </div>
              </TableCell>
              <TableCell className={cellBorder}>{job.company}</TableCell>
              <TableCell className={cellBorder}>
                <Badge variant="outline">{job.source}</Badge>
              </TableCell>
              <TableCell className={cellBorder}>
                <div className="flex flex-col gap-0.5">
                  <span>{job.city ?? job.location ?? "—"}</span>
                  {job.remote_mode && job.remote_mode !== "unknown" ? (
                    <span className="text-xs text-muted-foreground">{job.remote_mode}</span>
                  ) : job.remote ? (
                    <span className="text-xs text-muted-foreground">remote</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className={cellBorder}>
                <div className="flex flex-col gap-0.5">
                  <span>{job.contract_type ?? "—"}</span>
                  {job.experience_level !== null && job.experience_level !== undefined ? (
                    <span className="text-xs text-muted-foreground">
                      {job.experience_level}+ yrs
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className={cellBorder}>{job.salary ?? "—"}</TableCell>
              <TableCell className={cellBorder}>
                {job.match_score !== null ? (
                  <span className={getMatchScoreColor(job.match_score)}>
                    {job.match_score}%
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className={cellBorder}>
                {job.posted_at ? formatRelativeDate(job.posted_at) : "—"}
              </TableCell>
              <TableCell className={cellBorder}>
                <Badge className={getStatusColor(job.status)} variant="secondary">
                  {job.status.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAnalyze(job.id)}
                  >
                    Analyze
                  </Button>
                  {job.cover_letter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewCoverLetter(job)}
                    >
                      CL
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <ChevronDown className="h-4 w-4" />
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
