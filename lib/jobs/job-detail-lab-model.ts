import {
  computeScoreFromCriteria,
  type EvidenceLevel,
} from "@/lib/jobs/criteria-score"
import type {
  CvAnalysisResponse,
  CvDetectedExperience,
  Job,
  JobCriterionAssessment,
  JobCvImprovementItem,
} from "@/types"

/**
 * View-model helpers for `/jobs/[id]/lab`.
 *
 * Backend gaps (documented for later wiring):
 * - Keyword occurrence counts are not returned by job-match → UI shows "—".
 * - Potential score after CV optimization is a documented UI heuristic until
 *   the backend computes a re-score.
 * - LinkedIn / email / pitch / Q&A generation APIs do not exist yet.
 * - "Apply suggestion" is local UI state only (no CV mutation API yet).
 */

export type LabAnalysisState =
  | "idle_unanalyzed"
  | "analyzing"
  | "ready"
  | "error"

export type KeywordImportance = "Critique" | "Important" | "Secondaire"

export type KeywordPresence = "Présent" | "Absent" | "Inconnu"

export type LabKeywordRow = {
  keyword: string
  importance: KeywordImportance
  occurrences: number | null
  presence: KeywordPresence
}

export type LabSubScore = {
  id: string
  label: string
  score: number | null
  weightPercent: number
  rationale: string
  tooltip: string
}

export type LabCriterionRow = {
  id: string
  label: string
  weightPercent: number
  evidenceLevel: 0 | 1 | 2 | 3
  levelLabel: string
  levelTone: "strong" | "good" | "weak" | "absent"
  cvStatus: JobCriterionAssessment["cv_status"]
  evidenceFromJob: string
  evidenceFromCv: string | null
  question: string | null
  needsConfirmation: boolean
  confirmationStatus: JobCriterionAssessment["confirmation_status"]
  recruiterBlockRisk: JobCriterionAssessment["recruiter_block_risk"]
  scoreContribution: number
}

const EVIDENCE_LEVEL_META: Record<
  0 | 1 | 2 | 3,
  { label: string; tone: LabCriterionRow["levelTone"] }
> = {
  0: { label: "Absent", tone: "absent" },
  1: { label: "Faible", tone: "weak" },
  2: { label: "Pertinent", tone: "good" },
  3: { label: "Fort", tone: "strong" },
}

/** Enough content to replace the short Sur ton CV / La fiche demande pair. */
export const RICH_SCORE_EXPLANATION_MIN_CHARS = 160

const BULLET_LINE_RE = /^\s*(?:[-•*]|\d+[.)])\s+/

export function isRichScoreExplanation(
  text: string | null | undefined
): boolean {
  const trimmed = text?.trim() ?? ""
  if (!trimmed) return false
  const lines = trimmed.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const bulletLines = lines.filter((l) => BULLET_LINE_RE.test(l))
  if (bulletLines.length >= 3 && trimmed.length >= 80) return true
  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  if (paragraphs.length >= 2 && trimmed.length >= 120) return true
  return trimmed.length >= RICH_SCORE_EXPLANATION_MIN_CHARS
}

/** Split score_explanation into display lines (bullets preferred). */
export function parseScoreExplanationLines(
  text: string
): { kind: "bullet" | "text"; content: string }[] {
  const lines = text
    .trim()
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.map((line) => {
    const match = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/)
    if (match?.[1]) return { kind: "bullet" as const, content: match[1].trim() }
    return { kind: "text" as const, content: line }
  })
}

/** Context paragraph + bullet list for the two-card Pourquoi ce score UI. */
export function splitScoreExplanation(text: string | null | undefined): {
  context: string
  bullets: string[]
} {
  const trimmed = text?.trim() ?? ""
  if (!trimmed) return { context: "", bullets: [] }

  const lines = parseScoreExplanationLines(trimmed)
  const contextParts: string[] = []
  const bullets: string[] = []
  for (const line of lines) {
    if (line.kind === "bullet") bullets.push(line.content)
    else contextParts.push(line.content)
  }

  return {
    context: contextParts.join(" ").replace(/\s+/g, " ").trim(),
    bullets,
  }
}

export type CriterionMatchDisplay = {
  emoji: string
  scoreOutOf10: number
  label: string
}

/** Map evidence_level 0–3 → coach-style emoji + /10 for the why-score table. */
export function criterionMatchDisplay(
  evidenceLevel: 0 | 1 | 2 | 3
): CriterionMatchDisplay {
  switch (evidenceLevel) {
    case 3:
      return { emoji: "🟢", scoreOutOf10: 9, label: "Fort" }
    case 2:
      return { emoji: "🟢", scoreOutOf10: 7, label: "Bon" }
    case 1:
      return { emoji: "🟠", scoreOutOf10: 4, label: "Partiel" }
    default:
      return { emoji: "🔴", scoreOutOf10: 2, label: "Faible" }
  }
}

export type LabPriorityAction = {
  id: string
  title: string
  importance: "élevée" | "moyenne" | "faible"
  reason: string
  estimatedImpact: number | null
  experienceHint: string | null
  cta: "suggestion" | "experiences" | "keywords"
  improvementId: string | null
}

export type LabPriorityActionCard = {
  id: string
  title: string
  importance: LabPriorityAction["importance"]
  estimatedImpact: number | null
  cvSection: string | null
  fromCv: string | null
  rewrite: string | null
  keywords: string[]
  kind: "safe_rewrite" | "gap" | "confirm"
  question: string | null
}

export type ProjectedScoreResult = {
  current: number | null
  projected: number | null
  safeSuggestionCount: number
  missingKeywordCount: number
  bumpedCriterionIds: string[]
}

export type MatchNarrative = {
  fromCv: string
  fromJob: string
}

export type LabExperienceSuggestion = {
  experienceKey: string
  experience: CvDetectedExperience | null
  items: JobCvImprovementItem[]
}

export type LabOptimizeBuckets = {
  safe: JobCvImprovementItem[]
  toConfirm: JobCvImprovementItem[]
  byExperience: LabExperienceSuggestion[]
}

const DIMENSION_META: Record<
  string,
  { label: string; tooltip: string; overviewOrder: number }
> = {
  product_skills: {
    label: "Compétences",
    tooltip: "Alignement des compétences métier / produit visibles dans le CV avec l’offre.",
    overviewOrder: 0,
  },
  scope_seniority: {
    label: "Expérience",
    tooltip: "Séniorité, périmètre et années d’expérience par rapport à l’offre.",
    overviewOrder: 1,
  },
  technical_sector_context: {
    label: "ATS / contexte",
    tooltip: "Outils, secteur et vocabulaire ATS détectés dans l’offre vs le CV.",
    overviewOrder: 2,
  },
  missions: {
    label: "Responsabilités",
    tooltip: "Couverture des missions et responsabilités décrites dans l’offre.",
    overviewOrder: 3,
  },
  professional_requirements: {
    label: "Exigences",
    tooltip: "Formation, langues et autres exigences formelles de l’offre.",
    overviewOrder: 4,
  },
}

export function hasJobFitResult(job: Job | null | undefined): boolean {
  if (!job) return false
  if (typeof job.match_score === "number") return true
  if (job.job_posting_summary?.trim()) return true
  if ((job.keywords_from_job?.length ?? 0) > 0) return true
  if ((job.keywords_matched?.length ?? 0) > 0) return true
  if ((job.keywords_missing?.length ?? 0) > 0) return true
  if ((job.match_reasons?.length ?? 0) > 0) return true
  if ((job.match_gaps?.length ?? 0) > 0) return true
  if ((job.criteria_assessment?.length ?? 0) > 0) return true
  if ((job.score_breakdown?.length ?? 0) > 0) return true
  return false
}

export function buildCriteriaRows(job: Job): LabCriterionRow[] {
  const criteria = job.criteria_assessment ?? []
  return criteria
    .filter((item) => item.label.trim())
    .map((item) => {
      const level = ([0, 1, 2, 3].includes(item.evidence_level)
        ? item.evidence_level
        : 0) as 0 | 1 | 2 | 3
      const meta = EVIDENCE_LEVEL_META[level]
      const needsConfirmation =
        item.confirmation_status === "asked" ||
        Boolean(item.question_to_candidate?.trim())
      return {
        id: item.id,
        label: item.label,
        weightPercent: item.weight_percent,
        evidenceLevel: level,
        levelLabel: meta.label,
        levelTone: meta.tone,
        cvStatus: item.cv_status,
        evidenceFromJob: item.evidence_from_job,
        evidenceFromCv: item.evidence_from_cv,
        question: item.question_to_candidate?.trim() || null,
        needsConfirmation:
          needsConfirmation &&
          item.confirmation_status !== "confirmed" &&
          item.confirmation_status !== "denied",
        confirmationStatus: item.confirmation_status,
        recruiterBlockRisk: item.recruiter_block_risk,
        scoreContribution: Math.round(
          (item.weight_percent / 100) * (level / 3) * 100
        ),
      }
    })
    .sort((a, b) => b.weightPercent - a.weightPercent)
}

/** Strengths / gaps derived from criteria evidence when the grid is present. */
export function criteriaDerivedHighlights(job: Job): {
  strengths: string[]
  gaps: string[]
} {
  const criteria = job.criteria_assessment ?? []
  if (criteria.length === 0) {
    return {
      strengths: job.match_reasons ?? [],
      gaps: job.match_gaps ?? [],
    }
  }
  return {
    strengths: criteria
      .filter((item) => item.evidence_level >= 2)
      .sort((a, b) => b.evidence_level - a.evidence_level)
      .slice(0, 5)
      .map((item) => item.label),
    gaps: criteria
      .filter((item) => item.evidence_level <= 1)
      .sort((a, b) => a.evidence_level - b.evidence_level)
      .slice(0, 5)
      .map((item) =>
        item.question_to_candidate?.trim()
          ? `${item.label} — à confirmer`
          : item.label
      ),
  }
}

export function resolveLabAnalysisState(input: {
  analyzing: boolean
  error: string | null
  job: Job | null
}): LabAnalysisState {
  if (input.analyzing) return "analyzing"
  if (input.error) return "error"
  if (!input.job) return "idle_unanalyzed"
  // Ready when analysis produced usable job-fit artifacts — even if match_score is null (status partial)
  if (hasJobFitResult(input.job)) return "ready"
  return "idle_unanalyzed"
}

export function matchVerdict(score: number | null): {
  label: string
  summary: string
  tone: "good" | "partial" | "weak" | "pending"
} {
  if (typeof score !== "number") {
    return {
      label: "Score non calculé",
      summary:
        "L’analyse a extrait des éléments de l’offre, mais le score global n’a pas pu être calculé. Tu peux quand même consulter les forces, écarts et mots-clés ci-dessous.",
      tone: "partial",
    }
  }
  if (score >= 70) {
    return {
      label: "Bon match",
      summary:
        "Ton profil correspond bien au poste, mais quelques éléments peuvent encore améliorer ta candidature.",
      tone: "good",
    }
  }
  if (score >= 45) {
    return {
      label: "Match partiel",
      summary:
        "Des points forts existent, mais des écarts ou mots-clés ATS manquent encore.",
      tone: "partial",
    }
  }
  return {
    label: "Écarts importants",
    summary:
      "Ton CV ne couvre pas assez les exigences visibles de l’offre pour l’instant.",
    tone: "weak",
  }
}

/**
 * @deprecated Prefer projectOptimizedScore — heuristic only, not criteria-based.
 */
export function estimatePotentialScore(
  matchScore: number | null,
  safeSuggestionCount: number,
  missingKeywordCount: number
): number | null {
  if (typeof matchScore !== "number") return null
  const boost = Math.min(
    15,
    safeSuggestionCount * 3 + Math.min(5, Math.max(0, missingKeywordCount))
  )
  return Math.min(100, matchScore + boost)
}

function tokenizeForLink(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
}

/** Conservative text overlap: suggestion ↔ criterion. No link ⇒ no score bump. */
export function suggestionLinksToCriterion(
  item: JobCvImprovementItem,
  criterion: JobCriterionAssessment
): boolean {
  const related = (item as JobCvImprovementItem & { related_criterion_ids?: string[] })
    .related_criterion_ids
  if (Array.isArray(related) && related.includes(criterion.id)) return true

  const hayTokens = tokenizeForLink(
    [item.action, item.evidence_from_job, item.suggested_rewrite ?? ""].join(" ")
  )
  const needleTokens = tokenizeForLink(
    [criterion.label, criterion.evidence_from_job].join(" ")
  )
  if (hayTokens.length === 0 || needleTokens.length === 0) return false

  return needleTokens.some((needle) =>
    hayTokens.some(
      (hay) => hay === needle || hay.includes(needle) || needle.includes(hay)
    )
  )
}

function cloneCriteria(
  criteria: JobCriterionAssessment[]
): JobCriterionAssessment[] {
  return criteria.map((item) => ({ ...item }))
}

function bumpLinkedCriteria(
  criteria: JobCriterionAssessment[],
  suggestions: JobCvImprovementItem[]
): { criteria: JobCriterionAssessment[]; bumpedIds: string[] } {
  const next = cloneCriteria(criteria)
  const bumped = new Set<string>()

  for (const suggestion of suggestions) {
    for (const criterion of next) {
      if (bumped.has(criterion.id)) continue
      if (!suggestionLinksToCriterion(suggestion, criterion)) continue
      if (criterion.evidence_level >= 3) {
        bumped.add(criterion.id)
        continue
      }
      criterion.evidence_level = (criterion.evidence_level + 1) as EvidenceLevel
      bumped.add(criterion.id)
    }
  }

  return { criteria: next, bumpedIds: [...bumped] }
}

/**
 * Deterministic projected score: bump evidence +1 (cap 3) only for criteria
 * linked to safe reformulations — never invent experience.
 */
export function projectOptimizedScore(job: Job): ProjectedScoreResult {
  const criteria = job.criteria_assessment ?? []
  const safe = (job.cv_improvement_items ?? []).filter(isSafeSuggestion)
  const missingKeywordCount = job.keywords_missing?.length ?? 0

  if (criteria.length === 0) {
    const current =
      typeof job.match_score === "number" ? job.match_score : null
    return {
      current,
      projected: current,
      safeSuggestionCount: safe.length,
      missingKeywordCount,
      bumpedCriterionIds: [],
    }
  }

  const baseline = computeScoreFromCriteria(criteria)
  const current =
    baseline.match_score ??
    (typeof job.match_score === "number" ? job.match_score : null)

  if (safe.length === 0) {
    return {
      current,
      projected: current,
      safeSuggestionCount: 0,
      missingKeywordCount,
      bumpedCriterionIds: [],
    }
  }

  const { criteria: projectedCriteria, bumpedIds } = bumpLinkedCriteria(
    criteria,
    safe
  )
  const projected = computeScoreFromCriteria(projectedCriteria).match_score

  return {
    current,
    projected: projected ?? current,
    safeSuggestionCount: safe.length,
    missingKeywordCount,
    bumpedCriterionIds: bumpedIds,
  }
}

/** Isolated score delta if only this safe suggestion were applied. */
export function estimateSuggestionScoreImpact(
  job: Job,
  improvementId: string
): number | null {
  const criteria = job.criteria_assessment ?? []
  if (criteria.length === 0) return null
  const item = (job.cv_improvement_items ?? []).find((entry) => entry.id === improvementId)
  if (!item || !isSafeSuggestion(item)) return null

  const baseline = computeScoreFromCriteria(criteria).match_score
  if (baseline == null) return null
  const { criteria: next } = bumpLinkedCriteria(criteria, [item])
  const projected = computeScoreFromCriteria(next).match_score
  if (projected == null) return null
  return Math.max(0, projected - baseline)
}

export function buildMatchNarrative(job: Job): MatchNarrative {
  const criteria = job.criteria_assessment ?? []
  const cvBits = criteria
    .filter((item) => item.evidence_from_cv?.trim())
    .sort((a, b) => b.evidence_level - a.evidence_level)
    .slice(0, 2)
    .map((item) => item.evidence_from_cv!.trim())

  const jobBits = criteria
    .filter((item) => item.evidence_level <= 1 && item.evidence_from_job?.trim())
    .sort((a, b) => a.evidence_level - b.evidence_level)
    .slice(0, 2)
    .map((item) => item.evidence_from_job.trim())

  const fromCv =
    cvBits.length > 0
      ? cvBits.join(" ")
      : (job.match_reasons ?? []).slice(0, 2).join(" ") ||
        "Peu de preuves concrètes extraites de ton CV pour cette offre."

  const fromJob =
    jobBits.length > 0
      ? jobBits.join(" ")
      : job.job_posting_summary?.trim() ||
        (job.match_gaps ?? []).slice(0, 2).join(" ") ||
        "Des exigences de la fiche de poste restent à couvrir."

  return { fromCv, fromJob }
}

export function keywordsForCvImprovement(
  job: Job,
  item: JobCvImprovementItem
): string[] {
  const missing = job.keywords_missing ?? []
  if (missing.length === 0) return []
  const hay = [
    item.suggested_rewrite ?? "",
    item.evidence_from_job,
    item.action,
  ]
    .join(" ")
    .toLowerCase()

  const matched = missing.filter((keyword) =>
    hay.includes(keyword.toLowerCase())
  )
  if (matched.length > 0) return matched.slice(0, 5)
  return missing.slice(0, 3)
}

function keywordsForRewrite(
  job: Job,
  item: JobCvImprovementItem
): string[] {
  return keywordsForCvImprovement(job, item)
}

function importanceFromPriority(
  priority: JobCvImprovementItem["priority"]
): LabPriorityAction["importance"] {
  if (priority === "high") return "élevée"
  if (priority === "medium") return "moyenne"
  return "faible"
}

/**
 * Overview priority cards: left = CV excerpt, right = rewrite + ATS keywords.
 */
export function buildPriorityActionCards(job: Job): LabPriorityActionCard[] {
  const items = job.cv_improvement_items ?? []
  if (items.length > 0) {
    return items.slice(0, 5).map((item, index) => {
      const id = item.id || `action-${index}`
      const safe = isSafeSuggestion(item)
      const needsConfirm = Boolean(item.information_to_confirm?.trim())
      const kind: LabPriorityActionCard["kind"] = needsConfirm
        ? "confirm"
        : safe
          ? "safe_rewrite"
          : "gap"
      return {
        id,
        title: item.action,
        importance: importanceFromPriority(item.priority),
        estimatedImpact: safe ? estimateSuggestionScoreImpact(job, item.id) : null,
        cvSection: item.cv_section?.trim() || null,
        fromCv: item.evidence_from_cv?.trim() || null,
        rewrite: item.suggested_rewrite?.trim() || null,
        keywords: safe ? keywordsForRewrite(job, item) : [],
        kind,
        question: item.information_to_confirm?.trim() || null,
      }
    })
  }

  return (job.match_gaps ?? []).slice(0, 5).map((gap, index) => ({
    id: `gap-${index}`,
    title: gap,
    importance: (index < 2 ? "élevée" : "moyenne") as LabPriorityAction["importance"],
    estimatedImpact: null,
    cvSection: null,
    fromCv: null,
    rewrite: null,
    keywords: (job.keywords_missing ?? []).slice(0, 3),
    kind: "gap" as const,
    question: null,
  }))
}

export function buildSubScores(job: Job): LabSubScore[] {
  // Prefer criteria grid in the UI; keep legacy breakdown for older analyses.
  if ((job.criteria_assessment?.length ?? 0) > 0) {
    return []
  }

  const raw = job.score_breakdown ?? []
  if (raw.length > 0) {
    return [...raw]
      .map((item) => {
        const meta = DIMENSION_META[item.dimension] ?? {
          label: item.dimension,
          tooltip: item.rationale || "Dimension issue de l’analyse offre ↔ CV.",
          overviewOrder: 99,
        }
        return {
          order: meta.overviewOrder,
          score: {
            id: item.dimension,
            label: meta.label,
            score: item.score,
            weightPercent: item.effective_weight_percent,
            rationale: item.rationale,
            tooltip: item.rationale?.trim() || meta.tooltip,
          } satisfies LabSubScore,
        }
      })
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.score)
  }

  // Fallback when older analyses lack score_breakdown: derive 4 visible bars
  // from matched/missing keyword coverage — never invent a global score.
  const matched = job.keywords_matched?.length ?? 0
  const missing = job.keywords_missing?.length ?? 0
  const total = matched + missing
  const atsScore = total > 0 ? Math.round((matched / total) * 100) : null
  const global = typeof job.match_score === "number" ? job.match_score : null

  return [
    {
      id: "product_skills",
      label: "Compétences",
      score: global,
      weightPercent: 0,
      rationale: "Dérivé du score global tant que le détail n’est pas persisté.",
      tooltip:
        "Sous-score indisponible pour cette analyse. Relance l’analyse pour obtenir le détail.",
    },
    {
      id: "scope_seniority",
      label: "Expérience",
      score: global,
      weightPercent: 0,
      rationale: "Dérivé du score global tant que le détail n’est pas persisté.",
      tooltip:
        "Sous-score indisponible pour cette analyse. Relance l’analyse pour obtenir le détail.",
    },
    {
      id: "technical_sector_context",
      label: "ATS",
      score: atsScore,
      weightPercent: 0,
      rationale:
        atsScore == null
          ? "Pas assez de mots-clés pour estimer la couverture ATS."
          : `${matched} présents / ${missing} absents parmi les mots-clés comparés.`,
      tooltip: "Couverture approximative des mots-clés ATS (matched vs missing).",
    },
    {
      id: "missions",
      label: "Responsabilités",
      score: global,
      weightPercent: 0,
      rationale: "Dérivé du score global tant que le détail n’est pas persisté.",
      tooltip:
        "Sous-score indisponible pour cette analyse. Relance l’analyse pour obtenir le détail.",
    },
  ]
}

export function buildPriorityActions(job: Job): LabPriorityAction[] {
  const items = job.cv_improvement_items ?? []
  if (items.length > 0) {
    return items.slice(0, 5).map((item, index) => ({
      id: item.id || `action-${index}`,
      title: item.action,
      importance:
        item.priority === "high"
          ? "élevée"
          : item.priority === "medium"
            ? "moyenne"
            : "faible",
      reason:
        item.evidence_from_job ||
        item.evidence_from_cv ||
        "Recommandation issue de la comparaison CV ↔ offre.",
      estimatedImpact:
        item.priority === "high" ? 5 : item.priority === "medium" ? 3 : 2,
      experienceHint: item.cv_section?.trim() || null,
      cta: item.suggested_rewrite ? "suggestion" : "experiences",
      improvementId: item.id,
    }))
  }

  const gaps = job.match_gaps ?? []
  return gaps.slice(0, 5).map((gap, index) => ({
    id: `gap-${index}`,
    title: gap,
    importance: index < 2 ? "élevée" : "moyenne",
    reason: "Écart identifié entre ton CV et les attentes de l’offre.",
    estimatedImpact: index < 2 ? 4 : 2,
    experienceHint: null,
    cta: "keywords",
    improvementId: null,
  }))
}

export function buildKeywordRows(job: Job): LabKeywordRow[] {
  const fromJob = job.keywords_from_job ?? []
  const matched = new Set((job.keywords_matched ?? []).map((k) => k.toLowerCase()))
  const missing = job.keywords_missing ?? []
  const missingSet = new Set(missing.map((k) => k.toLowerCase()))

  const rows: LabKeywordRow[] = []
  const seen = new Set<string>()

  missing.forEach((keyword, index) => {
    const key = keyword.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    rows.push({
      keyword,
      importance: index < 3 ? "Critique" : index < 6 ? "Important" : "Secondaire",
      occurrences: null,
      presence: "Absent",
    })
  })

  ;(job.keywords_matched ?? []).forEach((keyword) => {
    const key = keyword.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    rows.push({
      keyword,
      importance: "Important",
      occurrences: null,
      presence: "Présent",
    })
  })

  fromJob.forEach((keyword) => {
    const key = keyword.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    const presence: KeywordPresence = matched.has(key)
      ? "Présent"
      : missingSet.has(key)
        ? "Absent"
        : "Inconnu"
    rows.push({
      keyword,
      importance: "Secondaire",
      occurrences: null,
      presence,
    })
  })

  const order: Record<KeywordImportance, number> = {
    Critique: 0,
    Important: 1,
    Secondaire: 2,
  }
  return rows.sort((a, b) => {
    const byImp = order[a.importance] - order[b.importance]
    if (byImp !== 0) return byImp
    if (a.presence !== b.presence) {
      if (a.presence === "Absent") return -1
      if (b.presence === "Absent") return 1
    }
    return a.keyword.localeCompare(b.keyword, "fr")
  })
}

function experienceKey(exp: CvDetectedExperience, index: number): string {
  return [
    exp.organization?.trim() || "org",
    exp.title?.trim() || "title",
    exp.start_year ?? "",
    String(index),
  ].join("|")
}

function itemMatchesExperience(
  item: JobCvImprovementItem,
  exp: CvDetectedExperience
): boolean {
  const section = (item.cv_section || "").toLowerCase()
  if (!section) return false
  const org = (exp.organization || "").toLowerCase()
  const title = (exp.title || "").toLowerCase()
  return (
    (org.length > 0 && section.includes(org)) ||
    (title.length > 0 && section.includes(title))
  )
}

export function isSafeSuggestion(item: JobCvImprovementItem): boolean {
  return Boolean(item.suggested_rewrite?.trim()) && !item.information_to_confirm?.trim()
}

export type LabRewritePair = {
  id: string
  fromCv: string
  forOffer: string
}

/** Safe CV → offer rewrite pairs for the overview side-by-side comparison. */
export function buildOverviewRewritePairs(
  job: Job,
  limit = 4
): LabRewritePair[] {
  return (job.cv_improvement_items ?? [])
    .filter(isSafeSuggestion)
    .map((item) => {
      const fromCv = item.evidence_from_cv?.trim() ?? ""
      const forOffer = item.suggested_rewrite?.trim() ?? ""
      if (!fromCv || !forOffer) return null
      return { id: item.id, fromCv, forOffer } satisfies LabRewritePair
    })
    .filter((pair): pair is LabRewritePair => pair !== null)
    .slice(0, limit)
}

export function buildOptimizeBuckets(
  job: Job,
  cvAnalysis: CvAnalysisResponse | null
): LabOptimizeBuckets {
  const items = job.cv_improvement_items ?? []
  const safe = items.filter(isSafeSuggestion)
  const toConfirm = items.filter((item) => !isSafeSuggestion(item))
  const experiences = cvAnalysis?.analysis?.detected_experiences ?? []

  const assigned = new Set<string>()
  const byExperience: LabExperienceSuggestion[] = experiences.map((exp, index) => {
    const key = experienceKey(exp, index)
    const linked = items.filter((item) => {
      const match = itemMatchesExperience(item, exp)
      if (match) assigned.add(item.id)
      return match
    })
    return { experienceKey: key, experience: exp, items: linked }
  })

  const orphanItems = items.filter((item) => !assigned.has(item.id))
  if (orphanItems.length > 0) {
    byExperience.push({
      experienceKey: "unassigned",
      experience: null,
      items: orphanItems,
    })
  }

  if (byExperience.length === 0 && items.length > 0) {
    byExperience.push({
      experienceKey: "unassigned",
      experience: null,
      items,
    })
  }

  return { safe, toConfirm, byExperience }
}

export function formatExperiencePeriod(exp: CvDetectedExperience): string {
  const start = [exp.start_month, exp.start_year].filter(Boolean).join("/")
  const end = exp.is_current
    ? "présent"
    : [exp.end_month, exp.end_year].filter(Boolean).join("/")
  if (!start && !end) return ""
  if (start && end) return `${start} – ${end}`
  return start || end
}

export function offerMissionHints(job: Job): string[] {
  const summary = job.job_posting_summary?.trim()
  if (!summary) return []
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20)
    .slice(0, 5)
}

export function offerSkillHints(job: Job): {
  hard: string[]
  soft: string[]
} {
  const hard = [
    ...(job.skills ?? []),
    ...(job.tools ?? []),
    ...(job.keywords_from_job ?? []).slice(0, 12),
  ]
  const uniqueHard = Array.from(new Set(hard.map((s) => s.trim()).filter(Boolean)))
  return { hard: uniqueHard.slice(0, 16), soft: [] }
}
