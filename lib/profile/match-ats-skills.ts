import { buildAtsCatalog, findAtsKeywordMatches } from "@/lib/ats"

/** Extract ATS catalog skills mentioned in CV text (deterministic, no AI). */
export function matchAtsSkillsFromCvText(
  cvText: string,
  limit = 40
): string[] {
  const catalog = buildAtsCatalog()
  const hits = findAtsKeywordMatches(cvText, { catalog })
  const names: string[] = []
  const seen = new Set<string>()
  for (const hit of hits) {
    const key = hit.normalized_name
    if (seen.has(key)) continue
    seen.add(key)
    names.push(hit.canonical_name)
    if (names.length >= limit) break
  }
  return names
}

/** Flat option list for searchable skill pickers. */
export function listAtsSkillOptions(): string[] {
  return buildAtsCatalog()
    .map((entry) => entry.canonical_name)
    .sort((a, b) => a.localeCompare(b, "fr"))
}

export function mergeSkillLists(
  primary: string[],
  secondary: string[],
  limit = 40
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const skill of [...primary, ...secondary]) {
    const trimmed = skill.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
    if (out.length >= limit) break
  }
  return out
}
