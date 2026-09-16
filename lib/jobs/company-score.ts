import type {
  CompanyOpportunityBreakdown,
  CompanySearchCriteria,
} from "@/types"

export interface CompanyScoreInput {
  name: string
  sector: string | null
  sectors: string[]
  keywords: string[]
  headquarters: string | null
  locations: string[]
  remote_ok: boolean
  size_min: number | null
  size_max: number | null
}

export interface CompanyProfileWeights {
  skills: string[]
  keywords: string[]
  targetRoles: string[]
  targetLocations: string[]
  preferredIndustries: string[]
  remote: boolean
  yearsExperience: number | null
}

const ACCENTS: Record<string, string> = {
  à: "a", â: "a", ä: "a", é: "e", è: "e", ê: "e", ë: "e", î: "i", ï: "i",
  ô: "o", ö: "o", ù: "u", û: "u", ü: "u", ç: "c", œ: "oe", æ: "ae",
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => ACCENTS[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function overlapRatio(needles: string[], haystack: string): number {
  if (needles.length === 0) return 0
  const hay = normalizeText(haystack)
  if (!hay) return 0
  let hits = 0
  for (const needle of needles) {
    const n = normalizeText(needle)
    if (!n) continue
    if (hay.includes(n)) hits++
  }
  return hits / needles.length
}

export function computeCompanyMatchScore(
  criteria: CompanySearchCriteria,
  company: CompanyScoreInput,
  profile: CompanyProfileWeights | null
): number {
  const sectorTerms = [
    company.sector ?? "",
    ...company.sectors,
    ...(profile?.preferredIndustries ?? []),
  ].join(" ")
  const sectorScore =
    criteria.sectors.length > 0
      ? Math.round(overlapRatio(criteria.sectors, sectorTerms) * 25)
      : profile && profile.preferredIndustries.length > 0
        ? Math.round(overlapRatio(profile.preferredIndustries, sectorTerms) * 25)
        : 15

  const skillPool = [...(profile?.skills ?? []), ...(profile?.keywords ?? [])].filter(
    Boolean
  )
  const keywordPool = [company.keywords.join(" "), company.sector ?? ""].join(" ")
  const keywordScore =
    skillPool.length > 0
      ? Math.round(overlapRatio(skillPool.slice(0, 12), keywordPool) * 40)
      : 20

  const locationHay = [company.headquarters ?? "", ...company.locations].join(" ")
  const locationNeedles =
    criteria.locations.length > 0 ? criteria.locations : (profile?.targetLocations ?? [])
  let locationScore = 10
  if (locationNeedles.length > 0) {
    locationScore = Math.round(overlapRatio(locationNeedles, locationHay) * 15)
  }
  if (criteria.remote && !company.remote_ok && !company.locations.includes("Remote France")) {
    locationScore = Math.min(locationScore, 5)
  }

  const roleScore =
    criteria.roles.length > 0 && profile && profile.targetRoles.length > 0
      ? Math.round(overlapRatio(profile.targetRoles, criteria.roles.join(" ")) * 15)
      : 10

  return Math.max(0, Math.min(100, sectorScore + keywordScore + locationScore + roleScore))
}

function sizeBucket(sizeMin: number | null, sizeMax: number | null): number | null {
  if (sizeMin == null && sizeMax == null) return null
  if (sizeMax != null && sizeMax <= 20) return 1
  if (sizeMax != null && sizeMin != null && sizeMin >= 5000) return 4
  if (sizeMax != null && sizeMax <= 250) return 2
  if (sizeMin != null && sizeMin >= 200) return 3
  if (sizeMax != null) return 3
  return null
}

const PRODUCT_TEAM_BY_BUCKET: Record<number, number> = {
  1: 6,
  2: 14,
  3: 12,
  4: 8,
}

const GROWTH_BY_BUCKET: Record<number, number> = {
  1: 12,
  2: 15,
  3: 12,
  4: 6,
}

export function computeOpportunityScore(input: {
  matchScore: number | null
  criteria: CompanySearchCriteria
  company: CompanyScoreInput
  contacts: { relevance_score: number | null }[]
}): { score: number; breakdown: CompanyOpportunityBreakdown } {
  const { matchScore, criteria, company, contacts } = input

  const profileMatch = Math.round((matchScore ?? 50) * 0.3)
  const sector =
    criteria.sectors.length > 0
      ? Math.round(overlapRatio(criteria.sectors, [company.sector ?? "", ...company.sectors].join(" ")) * 15)
      : 10

  const locationNeedles = criteria.locations.filter(
    (location) => !location.toLowerCase().includes("remote")
  )
  const location =
    locationNeedles.length === 0
      ? criteria.remote
        ? company.remote_ok
          ? 10
          : 4
        : 8
      : Math.round(overlapRatio(locationNeedles, [company.headquarters ?? "", ...company.locations].join(" ")) * 10)

  const bucket = sizeBucket(company.size_min, company.size_max)
  const productTeam = bucket == null ? 10 : PRODUCT_TEAM_BY_BUCKET[bucket]
  const growth = bucket == null ? 10 : GROWTH_BY_BUCKET[bucket]

  const bestContact = Math.max(0, ...contacts.map((contact) => contact.relevance_score ?? 0))
  const contactAvailable =
    contacts.length === 0 ? 0 : Math.round((bestContact / 100) * 15)

  const score = Math.max(
    0,
    Math.min(100, profileMatch + sector + location + productTeam + growth + contactAvailable)
  )

  const categories: { label: string; score: number }[] = [
    { label: "Adéquation profil", score: profileMatch },
    { label: "Secteur", score: sector },
    { label: "Localisation", score: location },
    { label: "Équipe produit", score: productTeam },
    { label: "Croissance", score: growth },
    { label: "Contact trouvé", score: contactAvailable },
  ]

  return {
    score,
    breakdown: {
      profile_match: profileMatch,
      sector,
      location,
      product_team: productTeam,
      growth,
      contact_available: contactAvailable,
      why: categories
        .filter((category) => category.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(
          (category) =>
            `${category.label} (${category.score}${category.score === 15 ? "" : ""})`
        ),
    },
  }
}