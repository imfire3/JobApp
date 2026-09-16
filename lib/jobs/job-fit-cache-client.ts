import { hasJobFitResult } from "@/lib/jobs/job-detail-lab-model"
import type { Job } from "@/types"

export function readJobFitCacheMeta(job: Job): {
  cv_content_hash: string | null
  job_content_hash: string | null
  prompt_version: string | null
} {
  const fit =
    job.raw_data &&
    typeof job.raw_data === "object" &&
    !Array.isArray(job.raw_data) &&
    job.raw_data.job_fit &&
    typeof job.raw_data.job_fit === "object" &&
    !Array.isArray(job.raw_data.job_fit)
      ? (job.raw_data.job_fit as Record<string, unknown>)
      : null

  const fromFit = (key: string): string | null => {
    const value = fit?.[key]
    return typeof value === "string" && value.trim() ? value : null
  }

  return {
    cv_content_hash: job.job_fit_cv_hash ?? fromFit("cv_content_hash"),
    job_content_hash: job.job_fit_job_hash ?? fromFit("job_content_hash"),
    prompt_version: job.job_fit_prompt_version ?? fromFit("prompt_version"),
  }
}

/**
 * Browser-safe cache check: CV analysis hash + stale + stored job_fit meta.
 */
export function isJobFitCacheValidClient(
  job: Job,
  cvAnalysis: { cv_content_hash: string; is_stale: boolean } | null,
  currentPromptVersion: string
): boolean {
  if (!hasJobFitResult(job)) return false
  if (!cvAnalysis || cvAnalysis.is_stale) return false
  const meta = readJobFitCacheMeta(job)
  if (!meta.cv_content_hash || !meta.job_content_hash || !meta.prompt_version) {
    return false
  }
  if (meta.prompt_version !== currentPromptVersion) return false
  return meta.cv_content_hash === cvAnalysis.cv_content_hash
}
