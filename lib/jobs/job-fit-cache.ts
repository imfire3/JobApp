import { createHash } from "node:crypto"
import { hashCvContent, normalizeCvContent } from "@/lib/cv-analysis/hash"
import { hasJobFitResult } from "@/lib/jobs/job-detail-lab-model"
import { readJobFitCacheMeta } from "@/lib/jobs/job-fit-cache-client"
import type { Job } from "@/types"

export { readJobFitCacheMeta } from "@/lib/jobs/job-fit-cache-client"

export function hashJobContent(input: {
  title?: string | null
  company?: string | null
  description?: string | null
  summary?: string | null
}): string {
  const payload = [
    input.title ?? "",
    input.company ?? "",
    input.description ?? "",
    input.summary ?? "",
  ]
    .map((part) => normalizeCvContent(part))
    .join("\n---\n")
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

/**
 * Server-side: cache valid when fit exists and CV + job content + prompt match.
 * Missing hashes (legacy) → invalid.
 */
export function isJobFitCacheValid(
  job: Job,
  cvText: string,
  currentPromptVersion: string
): boolean {
  if (!hasJobFitResult(job)) return false
  const meta = readJobFitCacheMeta(job)
  if (!meta.cv_content_hash || !meta.job_content_hash || !meta.prompt_version) {
    return false
  }
  if (meta.prompt_version !== currentPromptVersion) return false
  if (!cvText.trim()) return false
  if (meta.cv_content_hash !== hashCvContent(cvText)) return false
  const jobHash = hashJobContent({
    title: job.title,
    company: job.company,
    description: job.description,
    summary: job.summary ?? job.ai_summary,
  })
  return meta.job_content_hash === jobHash
}
