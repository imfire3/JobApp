import type { SourceStatus } from "@/types"
import { DEFAULT_SOURCE_SEARCHES, SOURCE_CATALOG } from "@/lib/sources/constants"
import { buildNextSyncAt, normalizeCriteria } from "@/lib/sources/utils"

/**
 * Ensure the user has all catalog job_sources (and default searches for new rows).
 * Idempotent: inserts only missing slugs.
 */
export async function ensureUserSources(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from("job_sources")
    .select("id,slug")
    .eq("user_id", userId)

  const existingBySlug = new Map(
    ((existing ?? []) as Array<{ id: string; slug: string }>).map((s) => [
      s.slug,
      s.id,
    ])
  )

  const missing = SOURCE_CATALOG.filter(
    (entry) => !existingBySlug.has(entry.slug)
  )

  if (missing.length === 0) return

  const sourcesPayload = missing.map((source) => ({
    user_id: userId,
    name: source.name,
    slug: source.slug,
    status: source.status as SourceStatus,
    enabled: true,
    sync_schedule: "daily",
    sync_time: "08:00",
    next_sync_at: buildNextSyncAt("08:00"),
  }))

  const { data: insertedSources, error } = await supabase
    .from("job_sources")
    .insert(sourcesPayload)
    .select("id,slug")
  if (error || !insertedSources) return

  for (const row of insertedSources as Array<{ id: string; slug: string }>) {
    existingBySlug.set(row.slug, row.id)
  }

  const searchesPayload = DEFAULT_SOURCE_SEARCHES.flatMap((search) => {
    const wasJustInserted = missing.some((m) => m.slug === search.sourceSlug)
    if (!wasJustInserted) return []
    const sourceId = existingBySlug.get(search.sourceSlug)
    if (!sourceId) return []
    return {
      user_id: userId,
      source_id: sourceId,
      name: search.name,
      enabled: true,
      criteria: normalizeCriteria(search.criteria),
    }
  })

  if (searchesPayload.length > 0) {
    await supabase.from("source_searches").insert(searchesPayload)
  }
}
