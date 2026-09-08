/** Normalize an ATS term for dedupe / lookup (lowercase, strip accents, collapse punctuation). */
export function normalizeAtsName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[/·•]/g, " ")
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export type AtsSkillType =
  | "hard"
  | "soft"
  | "tool"
  | "method"
  | "certification"
  | "domain"
  | "metric"
  | "language"

export type AtsPriority = "critical" | "important" | "secondary"

export type AtsKeywordDefinition = {
  canonical_name: string
  category: string
  subcategory?: string | null
  skill_type?: AtsSkillType | null
  priority?: AtsPriority | null
  aliases_fr?: string[]
  aliases_en?: string[]
  ats_weight?: number
  specificity_weight?: number
  description?: string | null
}

export type AtsRoleDefinition = {
  role_name: string
  role_family: string
  seniority: string[]
}

/** role_name → canonical_name → importance 0–1 */
export type AtsRoleImportanceMap = Record<string, Record<string, number>>

export type AtsCatalogEntry = AtsKeywordDefinition & {
  normalized_name: string
}

export type AtsLookupHit = {
  canonical_name: string
  normalized_name: string
  category: string
  subcategory: string | null
  skill_type: AtsSkillType | null
  priority: AtsPriority | null
  ats_weight: number
  specificity_weight: number
  match_type: "exact" | "alias"
  matched_term: string
}
