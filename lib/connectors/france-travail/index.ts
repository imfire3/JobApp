import { searchFranceTravailOffres } from "@/lib/connectors/france-travail/client"
import type { JobConnector, JobConnectorOptions } from "@/lib/connectors/types"
import type { ImportedJob } from "@/types"

function buildMotsCles(options: JobConnectorOptions): string {
  const parts = [
    ...(options.roles ?? []),
    ...(options.keywords ?? []),
    options.query?.trim() || "",
  ]
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    const titles = options.trackedSearch.job_titles ?? []
    const kws = options.trackedSearch.keywords ?? []
    return [...titles, ...kws].filter(Boolean).join(" ") || "Product Owner"
  }
  return Array.from(new Set(parts)).slice(0, 6).join(" ")
}

export const franceTravailConnector: JobConnector = {
  key: "france-travail",
  name: "France Travail",
  source: "france_travail",
  async fetchJobs(options: JobConnectorOptions): Promise<ImportedJob[]> {
    const criteria = options.trackedSearch
    const { jobs } = await searchFranceTravailOffres({
      motsCles: buildMotsCles(options),
      location: options.location ?? criteria.locations?.[0] ?? null,
      contractTypes: criteria?.contract_types,
      publieeDepuis: 7,
      maxResults: options.maxResults ?? 50,
    })
    return jobs
  },
}
