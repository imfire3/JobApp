import { fuzzyScore, normalizeLabel } from "@/lib/resume/matchers"

export type AtsOfferBreakdown = {
  skills: number | null
  keywords: number | null
  experience: number | null
  title: number | null
  tools: number | null
}

export type AtsOfferScoreResult = {
  ats_score: number | null
  ats_breakdown: AtsOfferBreakdown
}

export type AtsOfferScoreInput = {
  keywordsMatched: string[] | null | undefined
  keywordsMissing: string[] | null | undefined
  jobSkills: string[] | null | undefined
  jobTools: string[] | null | undefined
  jobTitle: string
  jobExperienceYears: number | null | undefined
  cvText: string
  cvSkills: string[] | null | undefined
  cvTools: string[] | null | undefined
  cvTargetRoles: string[] | null | undefined
  cvYearsExperience: number | null | undefined
}

const WEIGHTS: Record<keyof AtsOfferBreakdown, number> = {
  keywords: 25,
  skills: 25,
  experience: 20,
  title: 15,
  tools: 15,
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function cleanList(values: string[] | null | undefined): string[] {
  if (!values?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeLabel(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function itemPresentInCv(
  item: string,
  cvTextNormalized: string,
  catalog: string[]
): boolean {
  const needle = normalizeLabel(item)
  if (!needle) return false
  if (cvTextNormalized.includes(needle)) return true

  const tokens = needle.split(" ").filter((token) => token.length >= 3)
  if (tokens.length >= 2) {
    const hits = tokens.filter((token) => cvTextNormalized.includes(token)).length
    if (hits >= Math.ceil(tokens.length * 0.75)) return true
  } else if (tokens.length === 1 && tokens[0].length >= 4) {
    if (cvTextNormalized.includes(tokens[0])) return true
  }

  return catalog.some((entry) => fuzzyScore(entry, item) >= 0.85)
}

function scoreListCoverage(
  required: string[],
  cvText: string,
  catalog: string[]
): number | null {
  if (required.length === 0) return null
  const cvNorm = normalizeLabel(cvText)
  if (!cvNorm) return 0
  const hits = required.filter((item) => itemPresentInCv(item, cvNorm, catalog))
  return clampScore((hits.length / required.length) * 100)
}

function scoreKeywords(
  matched: string[],
  missing: string[]
): number | null {
  const total = matched.length + missing.length
  if (total === 0) return null
  return clampScore((matched.length / total) * 100)
}

function scoreTitle(
  jobTitle: string,
  cvText: string,
  targetRoles: string[]
): number | null {
  const title = jobTitle.trim()
  if (!title) return null

  let best = 0
  for (const role of targetRoles) {
    best = Math.max(best, fuzzyScore(title, role))
  }

  const cvNorm = normalizeLabel(cvText)
  const titleNorm = normalizeLabel(title)
  if (cvNorm && titleNorm) {
    if (cvNorm.includes(titleNorm)) {
      best = Math.max(best, 1)
    } else {
      const tokens = titleNorm.split(" ").filter((token) => token.length >= 4)
      if (tokens.length > 0) {
        const hits = tokens.filter((token) => cvNorm.includes(token)).length
        best = Math.max(best, hits / tokens.length)
      }
    }
  }

  if (best === 0 && targetRoles.length === 0 && !cvNorm) return null
  return clampScore(best * 100)
}

function scoreExperience(
  jobYears: number | null | undefined,
  cvYears: number | null | undefined,
  cvText: string
): number | null {
  if (typeof jobYears !== "number" || !Number.isFinite(jobYears) || jobYears <= 0) {
    return null
  }

  let years = typeof cvYears === "number" && Number.isFinite(cvYears) ? cvYears : null
  if (years == null) {
    const match = cvText.match(/(\d{1,2})\s*\+?\s*(ans|years?)/i)
    if (match) years = Number(match[1])
  }
  if (years == null || !Number.isFinite(years)) return null

  if (years >= jobYears) return 100
  if (years >= jobYears * 0.85) return 85
  if (years >= jobYears * 0.7) return 70
  return clampScore((years / jobYears) * 100)
}

function weightedAverage(breakdown: AtsOfferBreakdown): number | null {
  let sum = 0
  let weight = 0
  for (const key of Object.keys(WEIGHTS) as Array<keyof AtsOfferBreakdown>) {
    const value = breakdown[key]
    if (typeof value !== "number") continue
    sum += value * WEIGHTS[key]
    weight += WEIGHTS[key]
  }
  if (weight <= 0) return null
  return clampScore(sum / weight)
}

/**
 * Deterministic ATS offer↔CV score (0–100) from analysis artifacts + CV signals.
 * Does not invent facts — only overlaps and coverage ratios.
 */
export function computeAtsOfferScore(input: AtsOfferScoreInput): AtsOfferScoreResult {
  const keywordsMatched = cleanList(input.keywordsMatched)
  const keywordsMissing = cleanList(input.keywordsMissing)
  const jobSkills = cleanList(input.jobSkills)
  const jobTools = cleanList(input.jobTools)
  const cvSkills = cleanList(input.cvSkills)
  const cvTools = cleanList(input.cvTools)
  const cvTargetRoles = cleanList(input.cvTargetRoles)
  const cvText = input.cvText ?? ""

  const ats_breakdown: AtsOfferBreakdown = {
    keywords: scoreKeywords(keywordsMatched, keywordsMissing),
    skills: scoreListCoverage(jobSkills, cvText, cvSkills),
    tools: scoreListCoverage(jobTools, cvText, cvTools),
    title: scoreTitle(input.jobTitle, cvText, cvTargetRoles),
    experience: scoreExperience(
      input.jobExperienceYears,
      input.cvYearsExperience,
      cvText
    ),
  }

  return {
    ats_score: weightedAverage(ats_breakdown),
    ats_breakdown,
  }
}

export function parseAtsBreakdown(value: unknown): AtsOfferBreakdown | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const read = (key: keyof AtsOfferBreakdown): number | null => {
    const raw = row[key]
    return typeof raw === "number" && Number.isFinite(raw) ? clampScore(raw) : null
  }
  return {
    skills: read("skills"),
    keywords: read("keywords"),
    experience: read("experience"),
    title: read("title"),
    tools: read("tools"),
  }
}
