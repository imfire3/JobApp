import { hashCvContent } from "@/lib/cv-analysis/hash"

export const CV_EXTRACT_CONTENT_HASH_KEY = "_cv_content_hash" as const

/** Max CV characters sent to the extract LLM (keeps latency low). */
export const CV_EXTRACT_MAX_CHARS = 14_000

export function getStoredCvExtractHash(
  extractedCv: unknown
): string | null {
  if (!extractedCv || typeof extractedCv !== "object") return null
  const value = (extractedCv as Record<string, unknown>)[CV_EXTRACT_CONTENT_HASH_KEY]
  return typeof value === "string" && value.length > 0 ? value : null
}

export function withCvExtractHash<T extends Record<string, unknown>>(
  snapshot: T,
  cvText: string
): T & { [CV_EXTRACT_CONTENT_HASH_KEY]: string } {
  return {
    ...snapshot,
    [CV_EXTRACT_CONTENT_HASH_KEY]: hashCvContent(cvText),
  }
}

export function isCvExtractCacheHit(
  cvText: string,
  extractedCv: unknown
): boolean {
  const stored = getStoredCvExtractHash(extractedCv)
  if (!stored) return false
  return stored === hashCvContent(cvText)
}

export function truncateCvTextForExtract(
  cvText: string,
  maxChars = CV_EXTRACT_MAX_CHARS
): { text: string; truncated: boolean } {
  const normalized = cvText.trim()
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false }
  }
  return {
    text: `${normalized.slice(0, maxChars)}\n\n[…truncated for extract…]`,
    truncated: true,
  }
}

export function snapshotHasUsefulExtract(extractedCv: unknown): boolean {
  if (!extractedCv || typeof extractedCv !== "object") return false
  const row = extractedCv as Record<string, unknown>
  const first =
    typeof row.first_name === "string" ? row.first_name.trim() : ""
  const last =
    typeof row.last_name === "string" ? row.last_name.trim() : ""
  const skills = Array.isArray(row.skills) ? row.skills : []
  const experiences = Array.isArray(row.experience_entries)
    ? row.experience_entries
    : Array.isArray(row.experiences)
      ? row.experiences
      : []
  return Boolean(first || last || skills.length > 0 || experiences.length > 0)
}
