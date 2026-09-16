import {
  getSourceCatalogEntry,
  type SourceIngestionMode,
} from "@/lib/sources/constants"
import { getSourceCapability } from "@/lib/sources/capabilities"
import { isFranceTravailConfigured } from "@/lib/connectors/france-travail/auth"

export type SourcePresentation = {
  slug: string
  ingestionMode: SourceIngestionMode
  /** True when this source can run a server-side sync */
  supportsServerSync: boolean
  /** UI label for how jobs are ingested */
  modeLabel: string
  /** Primary CTA when sync is not available */
  alternateHref: string | null
  alternateLabel: string | null
  /** Display status for the card */
  displayStatus:
    | "api_ready"
    | "api_needs_config"
    | "extension"
    | "url_or_extension"
    | "imported_library"
  displayStatusLabel: string
  /** Recherche IA capability */
  researchCapability: "live_api" | "imported_only"
  researchLabel: string
  researchDetail: string
}

export function presentSource(slug: string): SourcePresentation {
  const entry = getSourceCatalogEntry(slug)
  const ingestionMode = entry?.ingestionMode ?? "url_or_extension"
  const capability = getSourceCapability(slug)

  if (ingestionMode === "api" && slug === "france-travail") {
    const ready = isFranceTravailConfigured()
    return {
      slug,
      ingestionMode,
      supportsServerSync: ready,
      modeLabel: "API officielle",
      alternateHref: null,
      alternateLabel: ready ? null : "Configurer FRANCE_TRAVAIL_* dans .env",
      displayStatus: ready ? "api_ready" : "api_needs_config",
      displayStatusLabel: ready ? "API connectée" : "Configurer l’API",
      researchCapability: capability.capability,
      researchLabel: capability.label,
      researchDetail: capability.detail,
    }
  }

  if (capability.liveReady) {
    return {
      slug,
      ingestionMode,
      supportsServerSync: false,
      modeLabel: capability.label,
      alternateHref: null,
      alternateLabel: null,
      displayStatus: "api_ready",
      displayStatusLabel: capability.label,
      researchCapability: capability.capability,
      researchLabel: capability.label,
      researchDetail: capability.detail,
    }
  }

  if (ingestionMode === "extension") {
    return {
      slug,
      ingestionMode,
      supportsServerSync: false,
      modeLabel: "Bibliothèque importée",
      alternateHref: "/imports",
      alternateLabel: "Importer des offres",
      displayStatus: "imported_library",
      displayStatusLabel: "Bibliothèque importée",
      researchCapability: "imported_only",
      researchLabel: capability.label,
      researchDetail: capability.detail,
    }
  }

  return {
    slug,
    ingestionMode,
    supportsServerSync: false,
    modeLabel: "Bibliothèque importée",
    alternateHref: "/imports?paste=1",
    alternateLabel: "Importer (URL / collage)",
    displayStatus: "imported_library",
    displayStatusLabel: "Bibliothèque importée",
    researchCapability: "imported_only",
    researchLabel: capability.label,
    researchDetail: capability.detail,
  }
}
