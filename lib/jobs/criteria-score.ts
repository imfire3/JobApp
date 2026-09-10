export type EvidenceLevel = 0 | 1 | 2 | 3

export type ConfirmationStatus = "none" | "asked" | "confirmed" | "denied"

export type RecruiterBlockRisk = "low" | "medium" | "high"

export type CriterionCvStatus =
  | "demonstrated"
  | "mentioned_only"
  | "transferable"
  | "not_evidenced"
  | "contradicted"

export type JobCriterionAssessment = {
  id: string
  label: string
  weight_percent: number
  evidence_level: EvidenceLevel
  cv_status: CriterionCvStatus
  evidence_from_job: string
  evidence_from_cv: string | null
  question_to_candidate: string | null
  confirmation_status: ConfirmationStatus
  recruiter_block_risk: RecruiterBlockRisk
}

export type CriterionConfirmation = {
  criterion_id: string
  answer: "yes" | "no"
  detail?: string | null
  updated_at: string
}

export type CriteriaScoreResult = {
  match_score: number | null
  total_weight: number
  criteria: JobCriterionAssessment[]
}

function clampLevel(value: number): EvidenceLevel {
  const rounded = Math.round(value)
  if (rounded <= 0) return 0
  if (rounded === 1) return 1
  if (rounded === 2) return 2
  return 3
}

function normalizeWeights(
  criteria: JobCriterionAssessment[]
): JobCriterionAssessment[] {
  const positive = criteria.filter((item) => item.weight_percent > 0)
  if (positive.length === 0) return criteria
  const sum = positive.reduce((acc, item) => acc + item.weight_percent, 0)
  if (sum <= 0) return criteria
  return criteria.map((item) => {
    if (item.weight_percent <= 0) return { ...item, weight_percent: 0 }
    return {
      ...item,
      weight_percent: Math.round((item.weight_percent / sum) * 1000) / 10,
    }
  })
}

/**
 * Deterministic score: round(100 * Σ (weight/100) * (level/3))
 * Weights are renormalized to 100 among criteria with weight > 0.
 */
export function computeScoreFromCriteria(
  criteria: JobCriterionAssessment[]
): CriteriaScoreResult {
  const cleaned = criteria
    .filter((item) => item.label.trim().length > 0)
    .map((item) => ({
      ...item,
      id: item.id.trim() || slugFromLabel(item.label),
      label: item.label.trim(),
      weight_percent: Math.max(0, item.weight_percent),
      evidence_level: clampLevel(item.evidence_level),
    }))

  if (cleaned.length === 0) {
    return { match_score: null, total_weight: 0, criteria: [] }
  }

  const normalized = normalizeWeights(cleaned)
  const totalWeight = normalized.reduce((sum, item) => sum + item.weight_percent, 0)
  if (totalWeight <= 0) {
    return { match_score: null, total_weight: 0, criteria: normalized }
  }

  const weighted =
    normalized.reduce(
      (sum, item) =>
        sum + (item.weight_percent / 100) * (item.evidence_level / 3),
      0
    ) * 100

  return {
    match_score: Math.max(0, Math.min(100, Math.round(weighted))),
    total_weight: Math.round(totalWeight * 10) / 10,
    criteria: normalized,
  }
}

/**
 * Apply a user confirmation without inventing CV facts.
 * Confirmations are candidate claims, not CV proof:
 * - no → level 0
 * - yes without detail → at most level 1
 * - yes with detail → at most level 2 (never 3 without CV text)
 */
export function applyConfirmation(
  criteria: JobCriterionAssessment[],
  confirmation: CriterionConfirmation
): JobCriterionAssessment[] {
  return criteria.map((item) => {
    if (item.id !== confirmation.criterion_id) return item

    if (confirmation.answer === "no") {
      return {
        ...item,
        evidence_level: 0,
        confirmation_status: "denied",
        cv_status: "not_evidenced",
        evidence_from_cv: item.evidence_from_cv,
        question_to_candidate: null,
      }
    }

    const detail = confirmation.detail?.trim() ?? ""
    if (!detail) {
      return {
        ...item,
        evidence_level: clampLevel(Math.max(item.evidence_level, 1)),
        confirmation_status: "confirmed",
        cv_status:
          item.cv_status === "not_evidenced" ? "mentioned_only" : item.cv_status,
        evidence_from_cv:
          item.evidence_from_cv?.trim() ||
          "Confirmé par le candidat sans détail d’expérience.",
        question_to_candidate: null,
      }
    }

    return {
      ...item,
      evidence_level: clampLevel(Math.max(item.evidence_level, 2)),
      confirmation_status: "confirmed",
      cv_status: "transferable",
      evidence_from_cv: `Confirmé par le candidat: ${detail}`,
      question_to_candidate: null,
      recruiter_block_risk:
        item.recruiter_block_risk === "high" ? "medium" : item.recruiter_block_risk,
    }
  })
}

export function slugFromLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "criterion"
}

export function mapCvStatusToLevel(
  status: CriterionCvStatus,
  hasResults: boolean
): EvidenceLevel {
  switch (status) {
    case "demonstrated":
      return hasResults ? 3 : 2
    case "transferable":
      return 1
    case "mentioned_only":
      return 1
    case "contradicted":
    case "not_evidenced":
    default:
      return 0
  }
}
