import type {
  EvidenceLevel,
  JobCriterionAssessment,
} from "@/lib/jobs/criteria-score"

/** Collapse accents/case/whitespace for quote checks. */
export function normalizeEvidenceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/**
 * Returns true when `quote` appears as a verifiable span inside `cvText`
 * (exact normalized substring, or ≥3 significant tokens all present).
 */
export function isVerifiableCvQuote(
  cvText: string,
  quote: string | null | undefined
): boolean {
  const evidence = quote?.trim() ?? ""
  if (evidence.length < 8) return false

  const cv = normalizeEvidenceText(cvText)
  const needle = normalizeEvidenceText(evidence)
  if (!cv || !needle) return false
  if (cv.includes(needle)) return true

  const tokens = needle.split(" ").filter((token) => token.length >= 4)
  if (tokens.length < 3) return false
  const hits = tokens.filter((token) => cv.includes(token)).length
  return hits >= Math.ceil(tokens.length * 0.75)
}

function clampLevel(value: number): EvidenceLevel {
  const rounded = Math.round(value)
  if (rounded <= 0) return 0
  if (rounded === 1) return 1
  if (rounded === 2) return 2
  return 3
}

/**
 * Cap evidence levels so the score only reflects documented CV proof.
 * - no CV quote → level 0
 * - unverified quote / transferable / mentioned_only → max level 1
 * - verified quote → keep LLM level (still capped 0–3)
 */
export function enforceCriteriaEvidenceAgainstCv(
  criteria: JobCriterionAssessment[],
  cvText: string
): JobCriterionAssessment[] {
  return criteria.map((item) => {
    const quote = item.evidence_from_cv?.trim() || null
    const verified = isVerifiableCvQuote(cvText, quote)
    let level = clampLevel(item.evidence_level)
    let cvStatus = item.cv_status

    if (!quote) {
      level = 0
      if (cvStatus === "demonstrated" || cvStatus === "transferable") {
        cvStatus = "not_evidenced"
      }
    } else if (!verified) {
      level = Math.min(level, 1) as EvidenceLevel
      if (cvStatus === "demonstrated") cvStatus = "mentioned_only"
    } else if (
      cvStatus === "transferable" ||
      cvStatus === "mentioned_only"
    ) {
      level = Math.min(level, 1) as EvidenceLevel
    } else if (cvStatus === "contradicted" || cvStatus === "not_evidenced") {
      level = 0
    }

    return {
      ...item,
      evidence_level: level,
      cv_status: cvStatus,
      evidence_from_cv: quote,
    }
  })
}
