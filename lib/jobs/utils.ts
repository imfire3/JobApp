import type { DashboardKpis, Job, JobFilters } from "@/types";
import { subHours } from "date-fns";

export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  return jobs.filter((job) => {
    if (filters.source && job.source !== filters.source) return false;
    if (filters.location && !job.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.remote !== undefined && job.remote !== filters.remote) return false;
    if (filters.hybrid === true) {
      const location = (job.location ?? "").toLowerCase();
      if (!location.includes("hybrid")) return false;
    }
    if (filters.minSalary !== undefined && (job.salary_min ?? 0) < filters.minSalary) return false;
    if (filters.contractType && (job.contract_type ?? "").toLowerCase() !== filters.contractType.toLowerCase()) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.minMatchScore !== undefined && (job.match_score ?? 0) < filters.minMatchScore) return false;

    if (filters.postedWithinHours !== undefined && job.posted_at) {
      const cutoff = subHours(new Date(), filters.postedWithinHours);
      if (new Date(job.posted_at) < cutoff) return false;
    }
    if (filters.postedWithinDays !== undefined && job.posted_at) {
      const cutoff = subHours(new Date(), filters.postedWithinDays * 24);
      if (new Date(job.posted_at) < cutoff) return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${job.title} ${job.company} ${job.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function computeKpis(
  jobs: Job[],
  options?: { applicationsSent?: number }
): DashboardKpis {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const jobsFoundToday = jobs.filter(
    (j) => j.posted_at && new Date(j.posted_at) >= todayStart
  ).length;

  const selectedJobs = jobs.filter((j) => j.selected || j.status === "selected").length;
  const newJobs = jobs.filter((j) => j.status === "new").length;
  const coverLettersGenerated = jobs.filter((j) => j.cover_letter).length;
  // Prefer CRM count when provided; otherwise fall back to job pipeline statuses.
  const applicationsSent =
    typeof options?.applicationsSent === "number"
      ? options.applicationsSent
      : jobs.filter((j) =>
          ["applied", "interview", "rejected"].includes(j.status)
        ).length;

  const scored = jobs.filter((j) => j.match_score !== null);
  const averageMatchScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, j) => sum + (j.match_score ?? 0), 0) / scored.length)
      : null;

  return {
    jobsFoundToday,
    newJobs,
    selectedJobs,
    coverLettersGenerated,
    applicationsSent,
    averageMatchScore,
    lastSyncTime: null,
    nextSyncTime: null,
    sourceHealth: {
      connected: 0,
      notConfigured: 0,
      error: 0,
    },
  };
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function getStatusColor(status: Job["status"]): string {
  const colors: Record<Job["status"], string> = {
    new: "bg-status-new text-status-new-foreground",
    selected: "bg-status-selected text-status-selected-foreground",
    cover_generated: "bg-status-cover-generated text-status-cover-generated-foreground",
    applied: "bg-status-applied text-status-applied-foreground",
    interview: "bg-status-interview text-status-interview-foreground",
    offer: "bg-status-offer text-status-offer-foreground",
    rejected: "bg-status-rejected text-status-rejected-foreground",
    archived: "bg-status-archived text-status-archived-foreground",
  };
  return colors[status];
}

export function getMatchScoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}
