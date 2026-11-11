import { normalizeEvidenceText } from "@/lib/jobs/verify-criteria-evidence"

const NUMBER_PATTERN = /\d+(?:[.,]\d+)?\s*%?/g

/** Normalized numeric tokens (`18%`, `4 ans`, `2,5` → stable comparison keys). */
export function extractNumbers(value: string): string[] {
  return (value.match(NUMBER_PATTERN) ?? [])
    .map((token) => token.replace(/\s+/g, "").replace(",", "."))
    .filter(Boolean)
}

function words(value: string): string[] {
  return normalizeEvidenceText(value).split(" ").filter(Boolean)
}

/** Tolerates light morphology (géré / gérer, projets / projet) without accepting new concepts. */
function isCovered(word: string, allowed: Set<string>): boolean {
  if (allowed.has(word)) return true
  if (word.length < 5) return false
  for (const candidate of allowed) {
    if (candidate.length < 5) continue
    const shared = Math.min(candidate.length, word.length)
    if (shared >= 5 && (candidate.startsWith(word.slice(0, shared)) || word.startsWith(candidate.slice(0, shared)))) {
      return true
    }
  }
  return false
}

/**
 * Deterministic guard for `cv_improvements.safe`.
 *
 * A rewrite is auto-applicable only when it preserves the original facts:
 * - no number appears in the rewrite that is absent from the original;
 * - the rewrite does not grow beyond a reasonable phrasing adjustment;
 * - significant words must already be grounded in the original; declaring
 *   them in `keywords_added` never proves a new activity or experience.
 *
 * It is intentionally conservative: when in doubt, `safe` stays false.
 */
export function isFactuallySafeRewrite(input: {
  original: string
  rewrite: string | null | undefined
  keywordsAdded?: string[]
}): boolean {
  const original = input.original.trim()
  const rewrite = input.rewrite?.trim() ?? ""
  if (!original || !rewrite) return false

  const originalNumbers = new Set(extractNumbers(original))
  for (const number of extractNumbers(rewrite)) {
    if (!originalNumbers.has(number)) return false
  }

  const originalWords = words(original)
  const rewriteWords = words(rewrite)
  if (originalWords.length === 0 || rewriteWords.length === 0) return false
  if (rewriteWords.length > originalWords.length + 25) return false

  const allowed = new Set(originalWords)
  // An offer keyword is not evidence of a candidate fact. Never whitelist it.

  return rewriteWords.every((word) => word.length < 4 || isCovered(word, allowed))
}
