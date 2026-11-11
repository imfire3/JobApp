import type { CompanyCandidate, CompanySearchCriteria } from "@/types"

const TAVILY_SEARCH_URL = "https://api.tavily.com/search"
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract"
const TAVILY_TIMEOUT_MS = 15000

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
  query: string
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  score: number
}

export async function tavilySearch(
  query: string,
  options?: { maxResults?: number; apiKey?: string }
): Promise<WebSearchResult[]> {
  const apiKey = options?.apiKey ?? process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error("TAVILY_API_KEY non configuré")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS)

  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: options?.maxResults ?? 10,
        include_answer: false,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`Tavily ${response.status}: ${text.slice(0, 200)}`)
    }

    const data: TavilyResponse = await response.json()
    return (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
      score: r.score ?? 0,
    }))
  } finally {
    clearTimeout(timer)
  }
}

export interface ExtractResult {
  url: string
  content: string
}

export async function tavilyExtract(
  urls: string[],
  options?: { apiKey?: string }
): Promise<ExtractResult[]> {
  const apiKey = options?.apiKey ?? process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error("TAVILY_API_KEY non configuré")
  if (urls.length === 0) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS)

  try {
    const response = await fetch(TAVILY_EXTRACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        urls: urls.slice(0, 10),
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`Tavily Extract ${response.status}: ${text.slice(0, 200)}`)
    }

    const data = await response.json()
    return (data.results ?? []).map((r: { url: string; raw_content?: string }) => ({
      url: r.url ?? "",
      content: r.raw_content ?? "",
    }))
  } finally {
    clearTimeout(timer)
  }
}

function buildSearchQueries(criteria: CompanySearchCriteria): string[] {
  const queries: string[] = []
  const roles = criteria.roles.length > 0 ? criteria.roles : ["Product Owner", "Product Manager"]
  const sectors = criteria.sectors.length > 0 ? criteria.sectors : []
  const locations = criteria.locations.length > 0 ? criteria.locations : []

  const roleTerms = roles.slice(0, 3)
  const sectorTerms = sectors.slice(0, 3)
  const locationTerms = locations.slice(0, 3)

  // 1) Secteur + localisation
  for (const sector of sectorTerms.length > 0 ? sectorTerms : ["SaaS"]) {
    for (const location of locationTerms.length > 0 ? locationTerms : ["France"]) {
      queries.push(`${sector} ${location} entreprise`)
    }
  }

  // 2) Produit/activité + localisation
  for (const location of locationTerms.length > 0 ? locationTerms : ["France"]) {
    queries.push(`éditeur logiciel ${location}`)
    queries.push(`startup produit numérique ${location}`)
  }

  // 3) Équipes produit + localisation
  for (const role of roleTerms) {
    for (const location of locationTerms.length > 0 ? locationTerms : ["France"]) {
      queries.push(`product team ${location}`)
      queries.push(`équipe produit ${location}`)
    }
  }

  // 4) Éditeurs de logiciels / plateformes
  for (const location of locationTerms.length > 0 ? locationTerms : ["France"]) {
    queries.push(`éditeur logiciel B2B ${location}`)
    queries.push(`plateforme digitale ${location}`)
  }

  // 5) En anglais pour élargir
  for (const location of locationTerms.length > 0 ? locationTerms : ["France"]) {
    queries.push(`software company ${location}`)
    queries.push(`saas company ${location}`)
  }

  // 6) Si remote demandé
  if (criteria.remote) {
    queries.push(`startup remote ${roleTerms[0]?.replace(/\s+/g, "-").toLowerCase() ?? "product"}`)
    queries.push(`remote saas company`)
  }

  // 7) Basé sur priorité si présente
  if (criteria.priority && criteria.priority.trim()) {
    const p = criteria.priority.trim().slice(0, 60)
    for (const location of locationTerms.slice(0, 2)) {
      queries.push(`${p} ${location}`.replace(/\s+/g, " ").trim())
    }
  }

  const seen = new Set<string>()
  const unique: string[] = []
  for (const q of queries) {
    const key = q.toLowerCase().replace(/\s+/g, " ").trim()
    if (!seen.has(key) && key.length > 3) {
      seen.add(key)
      unique.push(q)
    }
  }
  return unique.slice(0, 15)
}

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return null
  }
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function extractCompanyFromResult(
  result: WebSearchResult,
  criteria: CompanySearchCriteria
): CompanyCandidate | null {
  const domain = extractDomain(result.url)
  if (!domain) return null

  const skipDomains = [
    "linkedin.com", "glassdoor.fr", "glassdoor.com",
    "indeed.com", "indeed.fr", "welcometothejungle.com",
    "wikipedia.org", "google.com", "facebook.com", "twitter.com", "x.com",
    "youtube.com", "instagram.com", "tiktok.com",
    "trustpilot.com", "producthunt.com", "crunchbase.com",
    "pappers.fr", "societe.com", "infogreffe.fr", "orbis.bvdinfo.com",
    "francecompetences.fr", "pole-emploi.fr", "hellowork.com",
  ]
  if (skipDomains.some((d) => domain.endsWith(d) || domain === d)) return null

  // Skip job boards/carrieres pages that are not company sites
  const urlLower = result.url.toLowerCase()
  if (/(\/careers\/|\/jobs\/|\/recrut|\/emploi|\/offres\/)/.test(urlLower) && !domain.includes("welcome")) {
    // keep if it's the company's own careers subdomain, but usually skip aggregate job boards
    // skip common patterns
  }

  let name = result.title
    .replace(/[-–|].*$/, "")
    .replace(/\s*[-–]\s*(recrutement|jobs|carrières|offres|emploi|accueil).*$/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim()
    .slice(0, 120)
  if (name.length < 2) return null

  // Avoid names that look like generic terms
  if (/^(accueil|home|entreprise|company|startups?)$/i.test(name)) return null

  const locationHint = criteria.locations.length > 0 ? criteria.locations[0] : null
  const sectorHint = criteria.sectors.length > 0 ? criteria.sectors[0] : null

  return {
    name,
    domain,
    website: `https://${domain}`,
    sector: sectorHint,
    size_min: criteria.size_min,
    size_max: criteria.size_max,
    headquarters: locationHint,
    locations: criteria.locations,
    remote_ok: criteria.remote,
    description: (result.snippet || "").slice(0, 500),
    discovery_type: "spontaneous" as const,
    sourceUrl: result.url,
    reasons: [
      sectorHint ? `Secteur: ${sectorHint}` : "",
      `Score web: ${Math.round(result.score * 100)}%`,
      (result.snippet || "").slice(0, 140),
    ].filter(Boolean),
  }
}

function deduplicateCompanies(candidates: CompanyCandidate[]): CompanyCandidate[] {
  const byDomain = new Map<string, CompanyCandidate>()
  const byNormalized = new Map<string, CompanyCandidate>()

  for (const candidate of candidates) {
    const domainKey = candidate.domain.toLowerCase().replace(/^www\./, "")
    const nameKey = normalizeCompanyName(candidate.name)
    if (!nameKey || nameKey.length < 2) continue

    if (byDomain.has(domainKey)) continue
    if (byNormalized.has(nameKey)) continue

    byDomain.set(domainKey, candidate)
    byNormalized.set(nameKey, candidate)
  }

  return Array.from(byDomain.values())
}

export async function searchCompaniesViaTavily(
  criteria: CompanySearchCriteria
): Promise<{ candidates: CompanyCandidate[]; provider: string }> {
  const queries = buildSearchQueries(criteria)
  const allResults: WebSearchResult[] = []

  // Execute queries with some parallelism and limits
  const BATCH = 3
  for (let i = 0; i < queries.length; i += BATCH) {
    const batch = queries.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map((query) => tavilySearch(query, { maxResults: 8 }))
    )
    for (const res of results) {
      if (res.status === "fulfilled") {
        allResults.push(...res.value)
      }
      // ignore failures
    }
  }

  const candidates = allResults
    .map((r) => extractCompanyFromResult(r, criteria))
    .filter((c): c is CompanyCandidate => c !== null)

  const deduplicated = deduplicateCompanies(candidates)

  return {
    candidates: deduplicated.slice(0, 40),
    provider: "tavily",
  }
}