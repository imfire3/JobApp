import type { SourceStatus } from "@/types";
import { DEFAULT_SOURCE_SEARCHES, SOURCE_CATALOG } from "@/lib/sources/constants";
import { buildNextSyncAt, normalizeCriteria } from "@/lib/sources/utils";

export async function ensureUserSources(
  supabase: any,
  userId: string
) {
  const { data: existing } = await supabase
    .from("job_sources")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const sourcesPayload = SOURCE_CATALOG.map((source) => ({
    user_id: userId,
    name: source.name,
    slug: source.slug,
    status: source.status as SourceStatus,
    enabled: true,
    sync_schedule: "daily",
    sync_time: "08:00",
    next_sync_at: buildNextSyncAt("08:00"),
  }));

  const { data: insertedSources, error } = await supabase
    .from("job_sources")
    .insert(sourcesPayload)
    .select("id,slug");
  if (error || !insertedSources) return;

  const sourceIdBySlug = new Map(
    (insertedSources as Array<{ id: string; slug: string }>).map((s) => [s.slug, s.id])
  );
  const searchesPayload = DEFAULT_SOURCE_SEARCHES.flatMap((search) => {
    const sourceId = sourceIdBySlug.get(search.sourceSlug);
    if (!sourceId) return [];
    return {
      user_id: userId,
      source_id: sourceId,
      name: search.name,
      enabled: true,
      criteria: normalizeCriteria(search.criteria),
    };
  });

  if (searchesPayload.length > 0) {
    await supabase.from("source_searches").insert(searchesPayload);
  }
}
