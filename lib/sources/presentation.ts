import {
  getSourceCatalogEntry,
  type SourceIngestionMode,
} from "@/lib/sources/constants"
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
  displayStatus: "api_ready" | "api_needs_config" | "extension" | "url_or_extension"
  displayStatusLabel: string
}

export function presentSource(slug: string): SourcePresentation {
  const entry = getSourceCatalogEntry(slug)
  const ingestionMode = entry?.ingestionMode ?? "url_or_extension"

  if (ingestionMode === "api" && slug === "france-travail") {
    const ready = isFranceTravailConfigured()
    return {
      slug,
      ingestionMode,
      supportsServerSync: ready,
      modeLabel: "API officielle",
      alternateHref: ready ? null : null,
      alternateLabel: ready ? null : "Configurer FRANCE_TRAVAIL_* dans .env",
      displayStatus: ready ? "api_ready" : "api_needs_config",
      displayStatusLabel: ready ? "API connectée" : "Configurer l’API",
    }
  }

  if (ingestionMode === "extension") {
    return {
      slug,
      ingestionMode,
      supportsServerSync: false,
      modeLabel: "Via extension Chrome",
      alternateHref: "/extension",
      alternateLabel: "Installer l’extension",
      displayStatus: "extension",
      displayStatusLabel: "Via extension Chrome",
    }
  }

  return {
    slug,
    ingestionMode,
    supportsServerSync: false,
    modeLabel: "Via extension / URL",
    alternateHref: "/imports?paste=1",
    alternateLabel: "Importer (URL / collage)",
    displayStatus: "url_or_extension",
    displayStatusLabel: "Via extension / URL",
  }
}
