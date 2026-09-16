import type { SupabaseClient } from "@supabase/supabase-js"
import { buildJobInsertPayload } from "@/lib/jobs/mapper"
import {
  analyzeAndPersistJob,
  loadAnalyzeContext,
} from "@/lib/jobs/analyze-persisted-job"
import type { ResearchCandidate } from "@/lib/research/run-research"
import type { ImportedJob } from "@/types"

export type ResearchImportResult = {
  imported: number
  skipped: number
  analyzed: number
  below_threshold: number
  above_threshold: number
  job_ids: string[]
  below_threshold_ids: string[]
  above_threshold_ids: string[]
  analyze_errors: number
}

function toImportedJob(candidate: ResearchCandidate): ImportedJob {
  return {
    title: candidate.title,
    company: candidate.company,
    source: candidate.source || "france_travail",
    location: candidate.location,
    remote: candidate.remote,
    contract_type: candidate.contract_type,
    salary: candidate.salary,
    posted_at: candidate.posted_at || new Date().toISOString(),
    url: candidate.url,
    description: candidate.description,
  }
}

export async function importResearchCandidates(
  supabase: SupabaseClient,
  userId: string,
  candidates: ResearchCandidate[],
  minMatchScore: number | null
): Promise<ResearchImportResult> {
  const jobIds: string[] = []
  let imported = 0
  let skipped = 0

  const liveCandidates = candidates.filter((c) => c.origin !== "imported")
  const importedCandidates = candidates.filter((c) => c.origin === "imported")

  // Already-in-board: use job_id directly
  for (const candidate of importedCandidates) {
    if (candidate.job_id) {
      jobIds.push(candidate.job_id)
      skipped += 1
    } else if (candidate.url) {
      const { data: row } = await supabase
        .from("jobs")
        .select("id")
        .eq("user_id", userId)
        .eq("url", candidate.url)
        .maybeSingle()
      if (row?.id) {
        jobIds.push(row.id)
        skipped += 1
      }
    }
  }

  // Live: insert if new
  const liveUrls = liveCandidates.map((c) => c.url).filter(Boolean)
  const existingUrls = new Set<string>()
  if (liveUrls.length > 0) {
    const { data: existing } = await supabase
      .from("jobs")
      .select("url,id")
      .eq("user_id", userId)
      .in("url", liveUrls)
    for (const row of existing ?? []) {
      if (typeof row.url === "string") {
        existingUrls.add(row.url)
        if (typeof row.id === "string" && !jobIds.includes(row.id)) {
          jobIds.push(row.id)
          skipped += 1
        }
      }
    }
  }

  const toInsert = liveCandidates.filter(
    (c) => c.url && !existingUrls.has(c.url)
  )
  const scrapedAt = new Date().toISOString()

  if (toInsert.length > 0) {
    const payload = toInsert.map((candidate) =>
      buildJobInsertPayload({
        userId,
        job: toImportedJob(candidate),
        rawData: {
          ...toImportedJob(candidate),
          seeded: "research-ia",
          research_candidate_id: candidate.id,
          research_origin: "live",
        },
        scrapedAt,
      })
    )
    const { data: inserted, error: insertError } = await supabase
      .from("jobs")
      .insert(payload as never)
      .select("id,url")
    if (insertError && insertError.code !== "23505") {
      throw new Error(insertError.message)
    }
    imported = inserted?.length ?? 0
    for (const row of inserted ?? []) {
      if (typeof row.id === "string") jobIds.push(row.id)
    }
  }

  const contextResult = await loadAnalyzeContext(supabase, userId)
  if (!contextResult.ok) {
    throw new Error(contextResult.error)
  }

  let analyzed = 0
  let analyzeErrors = 0
  const belowThresholdIds: string[] = []
  const aboveThresholdIds: string[] = []
  const uniqueJobIds = Array.from(new Set(jobIds))

  for (const jobId of uniqueJobIds) {
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .maybeSingle()
    if (error || !job) {
      analyzeErrors += 1
      continue
    }

    try {
      const { matchScore } = await analyzeAndPersistJob(
        supabase,
        userId,
        job as Record<string, unknown>,
        contextResult.context
      )
      analyzed += 1

      const score =
        typeof matchScore === "number" && Number.isFinite(matchScore)
          ? matchScore
          : null
      const meets =
        minMatchScore == null || (score != null && score >= minMatchScore)

      if (meets) {
        aboveThresholdIds.push(jobId)
        await supabase
          .from("jobs")
          .update({ selected: true })
          .eq("id", jobId)
          .eq("user_id", userId)
      } else {
        belowThresholdIds.push(jobId)
        await supabase
          .from("jobs")
          .update({ selected: false })
          .eq("id", jobId)
          .eq("user_id", userId)
      }
    } catch {
      analyzeErrors += 1
    }
  }

  return {
    imported,
    skipped,
    analyzed,
    below_threshold: belowThresholdIds.length,
    above_threshold: aboveThresholdIds.length,
    job_ids: uniqueJobIds,
    below_threshold_ids: belowThresholdIds,
    above_threshold_ids: aboveThresholdIds,
    analyze_errors: analyzeErrors,
  }
}
