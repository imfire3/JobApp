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
 * Returns true when `quote` appears as a verifiable span inside `cvText`.
 * - Exact normalized substring → verified.
 * - Scattered tokens are not a verifiable quote.
 * Conservative by design: an unverified quote can only yield evidence level ≤ 1.
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

  // Scattered words across a CV are not a quote or proof of the same activity.
  return false
}

/** Questions are about candidate facts, never a ready-to-apply invented claim. */
export function questionForRequirement(label: string): string {
  const key = normalizeEvidenceText(label)
  if (/\bia\b|intelligence artificielle/.test(key) && /cycle|developpement|projet/.test(key)) {
    return "As-tu participé à une étape d’un projet IA, par exemple au cadrage, au prototypage ou à la mise en production ? Quel a été ton rôle ?"
  }
  if (/reglement|conformite/.test(key)) {
    return "As-tu déjà contribué à la vérification d’une exigence réglementaire sur un projet ? Si oui, laquelle et qu’as-tu fait concrètement ?"
  }
  return `As-tu une expérience concrète liée à « ${label} » ? Précise ton rôle et le contexte.`
}

/** A practice quote alone cannot prove the duration in a compound requirement. */
export function hasRequiredDurationEvidence(label: string, quote: string): boolean {
  const required = normalizeEvidenceText(label).match(/\b(\d+)\s+(?:ans|annees|years)\b/)
  if (!required) return true
  const durations = [...normalizeEvidenceText(quote).matchAll(/\b(\d+)\s+(?:ans|annees|years)\b/g)]
  // Dates can overlap or describe non-product roles. Do not sum them speculatively.
  return durations.some((match) => Number(match[1]) >= Number(required[1]))
}

export function isDemonstratedCriterion(item: JobCriterionAssessment): boolean {
  return item.cv_status === "demonstrated" && item.evidence_level >= 2 &&
    Boolean(item.evidence_from_cv?.trim()) &&
    !/^confirm[ée] par le candidat/i.test(item.evidence_from_cv ?? "") &&
    hasRequiredDurationEvidence(item.label, item.evidence_from_cv ?? "")
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

    if (cvStatus === "demonstrated" && (level < 2 || !hasRequiredDurationEvidence(item.label, quote ?? ""))) {
      level = Math.min(level, 1) as EvidenceLevel
      cvStatus = "mentioned_only"
    }

    return {
      ...item,
      evidence_level: level,
      cv_status: cvStatus,
      evidence_from_cv: quote,
      question_to_candidate: cvStatus !== "demonstrated"
        ? item.question_to_candidate || questionForRequirement(item.label)
        : item.question_to_candidate,
    }
  })
}
