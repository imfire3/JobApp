import {
  ATS_KEYWORD_DEFINITIONS,
  ATS_ROLE_DEFINITIONS,
  ATS_ROLE_IMPORTANCE,
} from "@/lib/ats/catalog"
import { normalizeAtsName } from "@/lib/ats/types"
import type {
  AtsCatalogEntry,
  AtsLookupHit,
  AtsPriority,
  AtsSkillType,
} from "@/lib/ats/types"

export { normalizeAtsName } from "@/lib/ats/types"

/** Deduplicate keyword definitions by normalized_name (first wins). */
export function buildAtsCatalog(
  definitions = ATS_KEYWORD_DEFINITIONS
): AtsCatalogEntry[] {
  const seen = new Set<string>()
  const rows: AtsCatalogEntry[] = []

  for (const def of definitions) {
    const normalized_name = normalizeAtsName(def.canonical_name)
    if (!normalized_name || seen.has(normalized_name)) continue
    seen.add(normalized_name)
    rows.push({ ...def, normalized_name })
  }

  return rows
}

function collectAliasTerms(entry: AtsCatalogEntry): string[] {
  return [
    entry.canonical_name,
    ...(entry.aliases_en ?? []),
    ...(entry.aliases_fr ?? []),
  ]
    .map((term) => term.trim())
    .filter(Boolean)
}

/** Map normalized alias/canonical → catalog entry (exact/alias lookup). */
export function buildAtsLookupIndex(
  catalog: AtsCatalogEntry[] = buildAtsCatalog()
): Map<string, { entry: AtsCatalogEntry; matched_term: string; match_type: "exact" | "alias" }> {
  const index = new Map<
    string,
    { entry: AtsCatalogEntry; matched_term: string; match_type: "exact" | "alias" }
  >()

  for (const entry of catalog) {
    const terms = collectAliasTerms(entry)
    for (const term of terms) {
      const key = normalizeAtsName(term)
      if (!key || index.has(key)) continue
      const isCanonical = key === entry.normalized_name
      index.set(key, {
        entry,
        matched_term: term,
        match_type: isCanonical ? "exact" : "alias",
      })
    }
  }

  return index
}

/**
 * Find catalog hits for free text (job posting or CV).
 * Exact/alias only — semantic matching belongs to a later AI/embeddings layer.
 */
export function findAtsKeywordMatches(
  text: string,
  options?: {
    catalog?: AtsCatalogEntry[]
    index?: ReturnType<typeof buildAtsLookupIndex>
  }
): AtsLookupHit[] {
  const catalog = options?.catalog ?? buildAtsCatalog()
  const index = options?.index ?? buildAtsLookupIndex(catalog)
  const haystack = normalizeAtsName(text)
  if (!haystack) return []

  const hits: AtsLookupHit[] = []
  const seenCanonical = new Set<string>()

  // Longer keys first to prefer "product management" over "product"
  const keys = [...index.keys()].sort((a, b) => b.length - a.length)

  for (const key of keys) {
    if (key.length < 2) continue
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(key)}([^a-z0-9]|$)`,
      "i"
    )
    if (!pattern.test(haystack)) continue
    const hit = index.get(key)
    if (!hit || seenCanonical.has(hit.entry.normalized_name)) continue
    seenCanonical.add(hit.entry.normalized_name)
    hits.push({
      canonical_name: hit.entry.canonical_name,
      normalized_name: hit.entry.normalized_name,
      category: hit.entry.category,
      subcategory: hit.entry.subcategory ?? null,
      skill_type: (hit.entry.skill_type as AtsSkillType | null) ?? null,
      priority: (hit.entry.priority as AtsPriority | null) ?? null,
      ats_weight: hit.entry.ats_weight ?? 0.5,
      specificity_weight: hit.entry.specificity_weight ?? 0.5,
      match_type: hit.match_type,
      matched_term: hit.matched_term,
    })
  }

  return hits
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function roleImportanceFor(
  roleName: string,
  canonicalName: string
): number | null {
  const byRole = ATS_ROLE_IMPORTANCE[roleName]
  if (!byRole) return null
  if (typeof byRole[canonicalName] === "number") return byRole[canonicalName]
  return null
}

export function listAtsRoles() {
  return ATS_ROLE_DEFINITIONS
}

export function countAtsCatalogStats(catalog = buildAtsCatalog()) {
  const byCategory = new Map<string, number>()
  for (const row of catalog) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1)
  }
  return {
    keywordCount: catalog.length,
    roleCount: ATS_ROLE_DEFINITIONS.length,
    categories: Object.fromEntries(byCategory),
  }
}
