import type { ResearchPlan } from "@/lib/ai/schemas/research-plan"
import {
  catalogSlugToJobSourceKeys,
  includesAllImportedJobs,
} from "@/lib/sources/capabilities"

export type ImportedJobRow = {
  id: string
  title: string | null
  company: string | null
  url: string | null
  city: string | null
  country: string | null
  description: string | null
  source: string | null
  published_at: string | null
  scraped_at: string | null
  remote_mode: string | null
  contract_type: string | null
  salary_min: number | null
  salary_max: number | null
}

/** Pure filter used by search + unit tests. */
export function filterImportedJobRows(
  rows: ImportedJobRow[],
  plan: Pick<
    ResearchPlan,
    "roles" | "keywords" | "location" | "published_within_hours" | "source_slugs"
  >,
  options?: { maxResults?: number; now?: Date }
): ImportedJobRow[] {
  const maxResults = options?.maxResults ?? 50
  const now = options?.now ?? new Date()
  const cutoffMs = now.getTime() - plan.published_within_hours * 60 * 60 * 1000

  const matchAllSources = includesAllImportedJobs(plan.source_slugs)
  const allowedSources = new Set<string>()
  if (!matchAllSources) {
    for (const slug of plan.source_slugs) {
      for (const key of catalogSlugToJobSourceKeys(slug)) {
        allowedSources.add(key.toLowerCase())
      }
    }
  }

  const terms = [...plan.roles, ...plan.keywords]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const location = plan.location.trim().toLowerCase()

  const filtered = rows.filter((row) => {
    if (!row.url?.trim()) return false

    if (!matchAllSources) {
      const source = (row.source ?? "").toLowerCase()
      if (allowedSources.size > 0 && source && !allowedSources.has(source)) {
        // Also allow fuzzy: source contains slug fragment
        const matchAlias = Array.from(allowedSources).some(
          (key) => source.includes(key) || key.includes(source)
        )
        if (!matchAlias) return false
      }
    }

    const published =
      row.published_at || row.scraped_at
        ? new Date(row.published_at || row.scraped_at || "").getTime()
        : null
    if (published != null && Number.isFinite(published) && published < cutoffMs) {
      return false
    }

    if (location) {
      const hay = `${row.city ?? ""} ${row.country ?? ""} ${row.description ?? ""}`.toLowerCase()
      if (!hay.includes(location)) return false
    }

    if (terms.length > 0) {
      const hay = `${row.title ?? ""} ${row.description ?? ""} ${row.company ?? ""}`.toLowerCase()
      const hit = terms.some((term) => hay.includes(term))
      if (!hit) return false
    }

    return true
  })

  // #region agent log
  fetch("http://127.0.0.1:7429/ingest/b889d056-e3b9-407b-aa47-98348f117b99", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e47afc",
    },
    body: JSON.stringify({
      sessionId: "e47afc",
      runId: "research-empty",
      hypothesisId: "A",
      location: "lib/research/search-imported-jobs.ts:filterImportedJobRows",
      message: "filter summary",
      data: {
        input: rows.length,
        output: filtered.length,
        matchAllSources,
        location,
        hours: plan.published_within_hours,
        termsCount: terms.length,
        terms: terms.slice(0, 8),
        sourceSlugCount: plan.source_slugs.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  return filtered.slice(0, maxResults)
}
