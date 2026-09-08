/** Normalize for matching: lowercase, strip accents, collapse spaces. */
export function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const FIELD_ALIASES: Record<string, string[]> = {
  email: ["email", "e-mail", "mail", "contact email", "adresse email", "courriel"],
  phone: [
    "phone",
    "telephone",
    "téléphone",
    "tel",
    "tél",
    "mobile",
    "portable",
    "cellphone",
  ],
  currentPosition: [
    "poste actuel",
    "current position",
    "job title",
    "title",
    "headline",
    "poste",
    "fonction",
    "intitulé",
  ],
  location: [
    "ville",
    "location",
    "residence",
    "résidence",
    "adresse",
    "city",
    "lieu",
    "based in",
  ],
  linkedin: ["linkedin", "linkedin profile", "profil linkedin"],
  github: ["github", "gh", "profil github"],
  website: ["website", "site", "site internet", "portfolio", "web"],
}

/** Simple token overlap similarity 0–1. */
export function fuzzyScore(a: string, b: string): number {
  const na = normalizeLabel(a)
  const nb = normalizeLabel(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const ta = new Set(na.split(" "))
  const tb = new Set(nb.split(" "))
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter += 1
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

export function matchesAlias(label: string, fieldKey: keyof typeof FIELD_ALIASES): boolean {
  const aliases = FIELD_ALIASES[fieldKey] ?? []
  const n = normalizeLabel(label)
  return aliases.some((alias) => {
    const a = normalizeLabel(alias)
    return n === a || n.startsWith(`${a} `) || n.includes(` ${a}`) || fuzzyScore(n, a) >= 0.85
  })
}
