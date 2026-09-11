import {
  getFranceTravailAccessToken,
  readFranceTravailAuthConfig,
} from "@/lib/connectors/france-travail/auth"
import {
  mapFranceTravailOffres,
  type FranceTravailOffre,
} from "@/lib/connectors/france-travail/map"
import type { ImportedJob } from "@/types"

const SEARCH_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"

/** Rough département mapping for common city labels (MVP). */
const CITY_TO_DEPARTEMENT: Record<string, string> = {
  paris: "75",
  lyon: "69",
  marseille: "13",
  lille: "59",
  toulouse: "31",
  nantes: "44",
  bordeaux: "33",
  nice: "06",
  rennes: "35",
  montpellier: "34",
  strasbourg: "67",
}

export type FranceTravailSearchParams = {
  motsCles: string
  location?: string | null
  contractTypes?: string[]
  /** Offres publiées depuis au plus N jours (API: publieeDepuis) */
  publieeDepuis?: number
  maxResults?: number
}

function departementFromLocation(location: string | null | undefined): string | null {
  if (!location?.trim()) return null
  const raw = location.trim()
  if (/^\d{2,3}$/.test(raw)) return raw.padStart(2, "0").slice(0, 3)
  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[,\s]/)[0]
  return CITY_TO_DEPARTEMENT[key] ?? null
}

function typeContratCodes(types: string[] | undefined): string | null {
  if (!types?.length) return null
  const mapped: string[] = []
  for (const t of types) {
    const u = t.toUpperCase()
    if (u.includes("CDI")) mapped.push("CDI")
    else if (u.includes("CDD")) mapped.push("CDD")
    else if (u.includes("ALTERN") || u.includes("APPRENTI")) mapped.push("FRA")
    else if (u.includes("STAGE")) mapped.push("MIS")
  }
  return mapped.length > 0 ? mapped[0]! : null
}

export async function searchFranceTravailOffres(
  params: FranceTravailSearchParams,
  fetchImpl: typeof fetch = fetch
): Promise<{ jobs: ImportedJob[]; rawCount: number }> {
  const config = readFranceTravailAuthConfig()
  if (!config) {
    throw new Error(
      "France Travail API non configurée. Ajoute FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET."
    )
  }

  const token = await getFranceTravailAccessToken(config, fetchImpl)
  const maxResults = Math.min(Math.max(params.maxResults ?? 50, 1), 150)
  const rangeEnd = Math.max(maxResults - 1, 0)

  const query = new URLSearchParams()
  query.set("motsCles", params.motsCles.trim() || "Product Owner")
  query.set("range", `0-${rangeEnd}`)
  if (params.publieeDepuis && params.publieeDepuis > 0) {
    query.set("publieeDepuis", String(Math.min(params.publieeDepuis, 31)))
  }
  const dept = departementFromLocation(params.location)
  if (dept) query.set("departement", dept)
  const contrat = typeContratCodes(params.contractTypes)
  if (contrat) query.set("typeContrat", contrat)

  const response = await fetchImpl(`${SEARCH_URL}?${query.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  if (response.status === 204) {
    return { jobs: [], rawCount: 0 }
  }

  const payload = (await response.json().catch(() => ({}))) as {
    resultats?: FranceTravailOffre[]
    message?: string
  }

  if (!response.ok) {
    throw new Error(
      payload.message ||
        `France Travail search failed (HTTP ${response.status})`
    )
  }

  const resultats = Array.isArray(payload.resultats) ? payload.resultats : []
  return {
    jobs: mapFranceTravailOffres(resultats).slice(0, maxResults),
    rawCount: resultats.length,
  }
}
