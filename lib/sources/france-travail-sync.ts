import type { SupabaseClient } from "@supabase/supabase-js"
import { isFranceTravailConfigured } from "@/lib/connectors/france-travail/auth"
import { franceTravailConnector } from "@/lib/connectors/france-travail"
import { buildJobInsertPayload } from "@/lib/jobs/mapper"
import { normalizeCriteria } from "@/lib/sources/utils"
import type { ImportedJob, SearchCriteria } from "@/types"

export type FranceTravailSyncResult = {
  imported: number
  skipped: number
  found: number
  jobIds: string[]
  error?: string
}

function criteriaToMotsCles(criteria: SearchCriteria): string {
  const parts = [
    ...(criteria.job_titles ?? []),
    ...(criteria.keywords ?? []),
  ]
    .map((p) => p.trim())
    .filter(Boolean)
  return Array.from(new Set(parts)).slice(0, 6).join(" ") || "Product Owner"
}

async function loadFranceTravailSearch(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string
): Promise<{
  searchId: string | null
  criteria: SearchCriteria
  trackedSearchStub: {
    id: string
    name: string
    criteria: SearchCriteria
    enabled: boolean
    user_id: string
  }
}> {
  const { data: searches } = await supabase
    .from("source_searches")
    .select("id,name,criteria,enabled")
    .eq("user_id", userId)
    .eq("source_id", sourceId)
    .eq("enabled", true)
    .order("created_at", { ascending: true })
    .limit(1)

  const search = searches?.[0]
  const criteria = normalizeCriteria(
    (search?.criteria as Partial<SearchCriteria> | null) ?? {
      job_titles: ["Product Owner", "Product Manager"],
      location: "Paris",
      keywords: ["Product Owner", "Product Manager"],
      contract_types: ["CDI"],
    }
  )

  return {
    searchId: typeof search?.id === "string" ? search.id : null,
    criteria,
    trackedSearchStub: {
      id: typeof search?.id === "string" ? search.id : "france-travail-default",
      name:
        typeof search?.name === "string"
          ? search.name
          : "Product Owner / PM Paris",
      criteria,
      enabled: true,
      user_id: userId,
    },
  }
}

/**
 * Sync France Travail offres for one job_sources row into jobs.
 */
export async function syncFranceTravailSource(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string
): Promise<FranceTravailSyncResult> {
  if (!isFranceTravailConfigured()) {
    return {
      imported: 0,
      skipped: 0,
      found: 0,
      jobIds: [],
      error:
        "France Travail API non configurée. Ajoute FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET dans .env.",
    }
  }

  const { data: source, error: sourceError } = await supabase
    .from("job_sources")
    .select("id,slug,name")
    .eq("id", sourceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (sourceError || !source || source.slug !== "france-travail") {
    return {
      imported: 0,
      skipped: 0,
      found: 0,
      jobIds: [],
      error: "Source France Travail introuvable",
    }
  }

  const startedAt = new Date().toISOString()
  const { searchId, criteria, trackedSearchStub } =
    await loadFranceTravailSearch(supabase, userId, sourceId)

  const { data: logRow } = await supabase
    .from("sync_logs")
    .insert({
      user_id: userId,
      source_id: sourceId,
      source_search_id: searchId,
      status: "running",
      phase: "fetch",
      message: "France Travail sync started",
      started_at: startedAt,
    })
    .select("id")
    .single()

  const logId = logRow?.id as string | undefined

  try {
    const jobs = await franceTravailConnector.fetchJobs({
      trackedSearch: trackedSearchStub as never,
      query: criteriaToMotsCles(criteria),
      location: criteria.location,
      roles: criteria.job_titles,
      keywords: criteria.keywords,
      maxResults: 50,
    })

    const urls = jobs.map((j) => j.url)
    const existingUrls = new Set<string>()
    if (urls.length > 0) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("url")
        .eq("user_id", userId)
        .in("url", urls)
      for (const row of existing ?? []) {
        if (typeof row.url === "string") existingUrls.add(row.url)
      }
    }

    const toInsert = jobs.filter((j) => !existingUrls.has(j.url))
    const skipped = jobs.length - toInsert.length
    const scrapedAt = new Date().toISOString()
    let imported = 0
    const jobIds: string[] = []

    if (toInsert.length > 0) {
      const payload = toInsert.map((job: ImportedJob) =>
        buildJobInsertPayload({
          userId,
          job,
          rawData: { ...job, seeded: "france-travail-sync" },
          scrapedAt,
        })
      )
      const { data: inserted, error: insertError } = await supabase
        .from("jobs")
        .insert(payload as never)
        .select("id")
      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message)
      }
      imported = inserted?.length ?? 0
      for (const row of inserted ?? []) {
        if (typeof row.id === "string") jobIds.push(row.id)
      }
    }

    const finishedAt = new Date().toISOString()
    await supabase
      .from("job_sources")
      .update({
        last_sync_at: finishedAt,
        jobs_imported_today: imported,
        status: "connected",
      })
      .eq("id", sourceId)
      .eq("user_id", userId)

    if (logId) {
      await supabase
        .from("sync_logs")
        .update({
          status: "success",
          phase: "done",
          message: `France Travail: ${imported} importée(s), ${skipped} doublon(s)`,
          finished_at: finishedAt,
          jobs_found: jobs.length,
          jobs_imported: imported,
          jobs_skipped_duplicates: skipped,
        })
        .eq("id", logId)
    }

    return { imported, skipped, found: jobs.length, jobIds }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    const finishedAt = new Date().toISOString()
    await supabase
      .from("job_sources")
      .update({ status: "error", last_sync_at: finishedAt })
      .eq("id", sourceId)
      .eq("user_id", userId)

    if (logId) {
      await supabase
        .from("sync_logs")
        .update({
          status: "failed",
          phase: "error",
          finished_at: finishedAt,
          error_message: message,
          message,
        })
        .eq("id", logId)
    }

    return {
      imported: 0,
      skipped: 0,
      found: 0,
      jobIds: [],
      error: message,
    }
  }
}
