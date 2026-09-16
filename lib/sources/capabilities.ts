import { isFranceTravailConfigured } from "@/lib/connectors/france-travail/auth"
import {
  getSourceCatalogEntry,
  MY_IMPORTED_SOURCE,
  MY_IMPORTED_SOURCE_SLUG,
  SOURCE_CATALOG,
} from "@/lib/sources/constants"
import { normalizeSourceKey } from "@/lib/jobs/normalize"

export type ResearchCapability = "live_api" | "imported_only"

export type SourceCapability = {
  slug: string
  capability: ResearchCapability
  /** True when live fetch can run right now */
  liveReady: boolean
  label: string
  detail: string
}

export function isMyImportedSourceSlug(slug: string): boolean {
  return slug === MY_IMPORTED_SOURCE_SLUG
}

/** True when research should ignore platform source filtering on imported jobs */
export function includesAllImportedJobs(sourceSlugs: readonly string[]): boolean {
  return sourceSlugs.some(isMyImportedSourceSlug)
}

function isApifyMode(): boolean {
  return (process.env.JOB_SYNC_MODE ?? "mock").toLowerCase() === "apify"
}

export function isApifyConfiguredForSlug(slug: string): boolean {
  if (!isApifyMode()) return false
  if (!process.env.APIFY_TOKEN?.trim()) return false
  if (slug === "welcome-to-the-jungle") {
    return Boolean(process.env.APIFY_WTTJ_ACTOR_ID?.trim())
  }
  if (slug === "linkedin-jobs") {
    return Boolean(process.env.APIFY_LINKEDIN_ACTOR_ID?.trim())
  }
  return false
}

/** Map catalog slug → values that may appear in jobs.source */
export function catalogSlugToJobSourceKeys(slug: string): string[] {
  const keys = new Set<string>()
  keys.add(normalizeSourceKey(slug.replace(/-/g, "_")))
  keys.add(normalizeSourceKey(slug))
  keys.add(slug)
  keys.add(slug.replace(/-/g, "_"))
  if (slug === "france-travail") {
    keys.add("france_travail")
    keys.add("france-travail")
  }
  if (slug === "welcome-to-the-jungle") {
    keys.add("welcome_to_the_jungle")
    keys.add("Welcome to the Jungle")
  }
  if (slug === "linkedin-jobs") {
    keys.add("linkedin_jobs")
    keys.add("linkedin")
    keys.add("LinkedIn")
  }
  return Array.from(keys)
}

export function getSourceCapability(slug: string): SourceCapability {
  if (isMyImportedSourceSlug(slug)) {
    return {
      slug: MY_IMPORTED_SOURCE_SLUG,
      capability: "imported_only",
      liveReady: false,
      label: "Bibliothèque",
      detail: "Filtre tout ton board, toutes sources confondues",
    }
  }

  const entry = getSourceCatalogEntry(slug)
  const name = entry?.name ?? slug

  if (slug === "france-travail") {
    const ready = isFranceTravailConfigured()
    return {
      slug,
      capability: ready ? "live_api" : "imported_only",
      liveReady: ready,
      label: ready ? "API live" : "Bibliothèque importée",
      detail: ready
        ? "Recherche France Travail en direct"
        : "API non configurée — recherche dans tes offres importées",
    }
  }

  if (slug === "welcome-to-the-jungle" || slug === "linkedin-jobs") {
    const ready = isApifyConfiguredForSlug(slug)
    return {
      slug,
      capability: ready ? "live_api" : "imported_only",
      liveReady: ready,
      label: ready ? "API Apify" : "Bibliothèque importée",
      detail: ready
        ? `Recherche live via Apify (${name})`
        : `Pas d’API Apify — recherche dans tes offres ${name} déjà importées`,
    }
  }

  return {
    slug,
    capability: "imported_only",
    liveReady: false,
    label: "Bibliothèque importée",
    detail: `Pas d’API publique — filtre tes offres ${name} déjà importées`,
  }
}

export function listSourceCapabilities(): SourceCapability[] {
  return [
    getSourceCapability(MY_IMPORTED_SOURCE.slug),
    ...SOURCE_CATALOG.map((entry) => getSourceCapability(entry.slug)),
  ]
}
