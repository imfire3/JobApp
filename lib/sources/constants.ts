import type { SearchCriteria, SourceStatus } from "@/types"

export type SourceIngestionMode = "api" | "extension" | "url_or_extension"

export type SourceCatalogEntry = {
  name: string
  slug: string
  /** Default DB status for newly bootstrapped rows */
  status: SourceStatus
  ingestionMode: SourceIngestionMode
}

export const SOURCE_CATALOG: readonly SourceCatalogEntry[] = [
  {
    name: "France Travail",
    slug: "france-travail",
    status: "not_configured",
    ingestionMode: "api",
  },
  {
    name: "Welcome to the Jungle",
    slug: "welcome-to-the-jungle",
    status: "not_configured",
    ingestionMode: "url_or_extension",
  },
  {
    name: "LinkedIn Jobs",
    slug: "linkedin-jobs",
    status: "not_configured",
    ingestionMode: "extension",
  },
  {
    name: "Indeed",
    slug: "indeed",
    status: "not_configured",
    ingestionMode: "extension",
  },
  {
    name: "APEC",
    slug: "apec",
    status: "not_configured",
    ingestionMode: "url_or_extension",
  },
  {
    name: "Hellowork",
    slug: "hellowork",
    status: "not_configured",
    ingestionMode: "url_or_extension",
  },
  {
    name: "LesJeudis",
    slug: "lesjeudis",
    status: "not_configured",
    ingestionMode: "url_or_extension",
  },
  {
    name: "Talent.io",
    slug: "talent-io",
    status: "not_configured",
    ingestionMode: "url_or_extension",
  },
] as const

export function getSourceCatalogEntry(
  slug: string
): SourceCatalogEntry | undefined {
  return SOURCE_CATALOG.find((entry) => entry.slug === slug)
}

export function isApiIngestionSource(slug: string): boolean {
  return getSourceCatalogEntry(slug)?.ingestionMode === "api"
}

export const DEFAULT_SOURCE_SEARCHES = [
  {
    sourceSlug: "france-travail",
    name: "Product Owner / PM Paris",
    criteria: {
      job_titles: ["Product Owner", "Product Manager"],
      location: "Paris",
      remote_preference: "hybrid",
      contract_types: ["CDI"],
      experience_levels: ["mid", "senior"],
      keywords: ["Product Owner", "Product Manager"],
    },
  },
  {
    sourceSlug: "welcome-to-the-jungle",
    name: "Product Owner Paris",
    criteria: {
      job_titles: ["Product Owner"],
      location: "Paris",
      remote_preference: "hybrid",
      contract_types: ["CDI"],
      experience_levels: ["mid", "senior"],
    },
  },
  {
    sourceSlug: "welcome-to-the-jungle",
    name: "Product Manager Paris",
    criteria: {
      job_titles: ["Product Manager"],
      location: "Paris",
      remote_preference: "hybrid",
      contract_types: ["CDI"],
      experience_levels: ["mid", "senior"],
    },
  },
] as const

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
  job_titles: [],
  similar_jobs: true,
  experience_levels: [],
  location: "Paris",
  remote_preference: "any",
  contract_types: [],
  minimum_salary: null,
  salary_currency: "EUR",
  only_jobs_with_salary: false,
  company_preferences: "",
  industries: [],
  excluded_industries: [],
  keywords: [],
  excluded_keywords: [],
  source_specific: {},
}
