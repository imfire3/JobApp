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

/**
 * Renormalize positive weights so they sum to exactly 100.0 (tenths precision).
 * Uses the largest-remainder method so no criterion is silently under/over weighted
 * by rounding, and the total stays deterministic across runs.
 */
function normalizeWeights(
  criteria: JobCriterionAssessment[]
): JobCriterionAssessment[] {
  const positive = criteria.filter((item) => item.weight_percent > 0)
  if (positive.length === 0) return criteria
  const sum = positive.reduce((acc, item) => acc + item.weight_percent, 0)
  if (sum <= 0) return criteria

  // If weights already sum very close to 100, still normalize precisely
  const rawTenths = criteria.map((item) =>
    item.weight_percent > 0 ? (item.weight_percent / sum) * 1000 : 0
  )
  const tenths = rawTenths.map((value) => Math.floor(value))
  const assigned = tenths.reduce((acc, value) => acc + value, 0)
  let remaining = 1000 - assigned

  const byFraction = rawTenths
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .filter(({ index }) => criteria[index].weight_percent > 0)
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  let offset = 0
  while (remaining > 0 && byFraction.length > 0) {
    tenths[byFraction[offset % byFraction.length].index] += 1
    remaining -= 1
    offset += 1
  }
  // If somehow negative due to floating point, adjust down from largest
  while (remaining < 0 && byFraction.length > 0) {
    tenths[byFraction[offset % byFraction.length].index] -= 1
    remaining += 1
    offset += 1
  }

  return criteria.map((item, index) => ({
    ...item,
    weight_percent: Math.max(0, tenths[index] / 10),
  }))
}

export type CriteriaCoverage = {
  total: number
  /** Criteria with at least a mention / transferable signal (level ≥ 1). */
  evidenced: number
  /** Criteria clearly demonstrated in the CV (level ≥ 2). */
  documented: number
  /** Share of criteria with any evidence, 0–1. */
  evidenced_ratio: number
  /** Share of criteria demonstrated, 0–1. */
  documented_ratio: number
  confidence: "low" | "medium" | "high"
}

/**
 * Confidence reflects how much of the job requirement is covered by evidence.
 * It never feeds back into the adequacy score — it only qualifies the analysis.
 */
export function computeCriteriaCoverage(
  criteria: JobCriterionAssessment[]
): CriteriaCoverage {
  const total = criteria.length
  if (total === 0) {
    return {
      total: 0,
      evidenced: 0,
      documented: 0,
      evidenced_ratio: 0,
      documented_ratio: 0,
      confidence: "low",
    }
  }

  const documented = criteria.filter((item) => item.evidence_level >= 2).length
  const evidenced = criteria.filter((item) => item.evidence_level >= 1).length
  const documented_ratio = documented / total
  const evidenced_ratio = evidenced / total

  const confidence: CriteriaCoverage["confidence"] =
    total >= 3 && documented_ratio >= 0.6 && evidenced_ratio >= 0.8
      ? "high"
      : total >= 2 && evidenced_ratio >= 0.5
        ? "medium"
        : "low"

  return {
    total,
    evidenced,
    documented,
    evidenced_ratio,
    documented_ratio,
    confidence,
  }
}

const CONFIDENCE_RANK: Record<CriteriaCoverage["confidence"], number> = {
  low: 0,
  medium: 1,
  high: 2,
}

/** Never let declared confidence exceed what the evidence actually covers. */
export function capConfidence(
  declared: CriteriaCoverage["confidence"],
  derived: CriteriaCoverage["confidence"]
): CriteriaCoverage["confidence"] {
  return CONFIDENCE_RANK[declared] <= CONFIDENCE_RANK[derived]
    ? declared
    : derived
}

export type ApplicationPriority = "high" | "medium" | "low" | "undetermined"

export type ApplicationPriorityResult = {
  priority: ApplicationPriority
  reasons: string[]
}

/**
 * Third indicator, distinct from adequacy and confidence.
 * It only uses facts available in the analysis (documented adequacy, coverage,
 * blocking risks). Missing preferences (salary, contract, remote…) are never
 * invented: when the evidence is too thin the priority stays `undetermined`.
 */
export function deriveApplicationPriority(input: {
  criteria: JobCriterionAssessment[]
  coverage: CriteriaCoverage
  matchScore: number | null
}): ApplicationPriorityResult {
  const { criteria, coverage, matchScore } = input

  if (criteria.length < 3 || matchScore == null) {
    return {
      priority: "undetermined",
      reasons: ["Données insuffisantes pour recommander une candidature."],
    }
  }

  if (coverage.evidenced_ratio < 0.5) {
    return {
      priority: "undetermined",
      reasons: [
        `Moins de la moitié des critères sont documentés (${Math.round(
          coverage.evidenced_ratio * 100
        )} %).`,
      ],
    }
  }

  const blocking = criteria.filter(
    (item) =>
      item.recruiter_block_risk === "high" &&
      item.evidence_level === 0 &&
      item.weight_percent >= 25
  )
  if (blocking.length > 0) {
    return {
      priority: "low",
      reasons: blocking
        .slice(0, 3)
        .map((item) => `Exigence importante non documentée : ${item.label}.`),
    }
  }

  if (matchScore >= 70 && coverage.documented_ratio >= 0.5) {
    return {
      priority: "high",
      reasons: [
        `Adéquation documentée solide (${matchScore}/100).`,
        `${coverage.documented}/${coverage.total} critères clairement démontrés.`,
      ],
    }
  }

  if (matchScore >= 50) {
    return {
      priority: "medium",
      reasons: [
        `Adéquation partielle (${matchScore}/100).`,
        "Des critères restent à confirmer ou à renforcer.",
      ],
    }
  }

  return {
    priority: "low",
    reasons: [`Adéquation documentée faible (${matchScore}/100).`],
  }
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
