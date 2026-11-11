import type { CvOptimizeResponse } from "@/lib/ai/schemas/cv-optimize"
import { hasJobFitResult } from "@/lib/jobs/job-detail-lab-model"
import { hasRequiredDurationEvidence, questionForRequirement, enforceCriteriaEvidenceAgainstCv, isVerifiableCvQuote } from "@/lib/jobs/verify-criteria-evidence"
import { isFactuallySafeRewrite } from "@/lib/jobs/rewrite-safety"
import type {
  CvAnalysisResponse,
  Job,
  JobCriterionAssessment,
  JobCriterionConfirmation,
} from "@/types"

/**
 * View-model helpers for the offer analysis interface.
 *
 * Rules enforced here:
 * - a candidate confirmation is never a CV quote and never changes evidence;
 * - a missing value is rendered as explicitly missing, never invented;
 * - counts, weights and labels come from the stored analysis only.
 */

export type CriterionStatus = JobCriterionAssessment["cv_status"]

export const CRITERION_STATUS_LABELS: Record<CriterionStatus, string> = {
  demonstrated: "Pratique démontrée",
  mentioned_only: "Compétence mentionnée",
  transferable: "Expérience transférable",
  not_evidenced: "Non documenté",
  contradicted: "Contradiction identifiée",
}

export type CriterionStatusTone = "good" | "clarify" | "neutral" | "danger"

export const CRITERION_STATUS_TONES: Record<CriterionStatus, CriterionStatusTone> =
  {
    demonstrated: "good",
    mentioned_only: "clarify",
    transferable: "clarify",
    not_evidenced: "neutral",
    contradicted: "danger",
  }

export const CRITERION_CONCLUSIONS: Record<CriterionStatus, string> = {
  demonstrated:
    "Cette exigence est démontrée dans ton CV par un élément concret.",
  mentioned_only:
    "La compétence est mentionnée dans ton CV, mais sans preuve d’usage concret.",
  transferable:
    "Ton expérience peut être transférée sur cette exigence, sans preuve directe dans ton CV.",
  not_evidenced:
    "Aucune preuve de cette exigence n’a été identifiée dans le CV analysé.",
  contradicted:
    "Un élément du CV semble contredire cette exigence : à vérifier avant de candidater.",
}

export type AnalysisCriterion = {
  id: string
  label: string
  weightPercent: number
  status: CriterionStatus
  evidenceLevel: 0 | 1 | 2 | 3
  evidenceFromJob: string | null
  evidenceFromCv: string | null
  question: string | null
  recruiterBlockRisk: JobCriterionAssessment["recruiter_block_risk"]
  confirmation: JobCriterionConfirmation | null
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function clampLevel(value: number): 0 | 1 | 2 | 3 {
  if (value <= 0) return 0
  if (value === 1) return 1
  if (value === 2) return 2
  return 3
}

export function normalizeSkillKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function getCriterionConfirmations(
  job: Job
): JobCriterionConfirmation[] {
  return Array.isArray(job.criterion_confirmations)
    ? job.criterion_confirmations
    : []
}

export function getConfirmationFor(
  job: Job,
  criterionId: string
): JobCriterionConfirmation | null {
  return (
    getCriterionConfirmations(job).find(
      (item) => item.criterion_id === criterionId
    ) ?? null
  )
}

export function buildAnalysisCriteria(job: Job, cvText?: string): AnalysisCriterion[] {
  const criteria = cvText === undefined ? job.criteria_assessment ?? []
    : enforceCriteriaEvidenceAgainstCv(job.criteria_assessment ?? [], cvText)
  return criteria
    .filter((item) => item.label.trim().length > 0)
    .map((item) => ({
      id: item.id,
      label: item.label.trim(),
      weightPercent: Math.max(0, item.weight_percent),
      status: item.cv_status === "demonstrated" &&
        (item.evidence_level < 2 || !item.evidence_from_cv?.trim() ||
          /^confirm[ée] par le candidat/i.test(item.evidence_from_cv) ||
          !hasRequiredDurationEvidence(item.label, item.evidence_from_cv))
        ? "mentioned_only" : item.cv_status,
      evidenceLevel: clampLevel(item.evidence_level),
      evidenceFromJob: cleanString(item.evidence_from_job),
      // Older confirmation flows stored candidate claims in evidence_from_cv.
      // Keep those claims in the separate confirmation channel, never label
      // them as text extracted from the CV.
      evidenceFromCv: /^confirm[ée] par le candidat/i.test(item.evidence_from_cv ?? "")
        ? null
        : cleanString(item.evidence_from_cv),
      question: cleanString(item.question_to_candidate),
      recruiterBlockRisk: item.recruiter_block_risk,
      confirmation: getConfirmationFor(job, item.id),
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent)
}

export type CriterionFilter = "all" | "demonstrated" | "to_clarify"

export function criterionMatchesFilter(
  criterion: AnalysisCriterion,
  filter: CriterionFilter
): boolean {
  if (filter === "all") return true
  if (filter === "demonstrated") return criterion.status === "demonstrated"
  return criterion.status !== "demonstrated"
}

export function countCriteriaByFilter(
  criteria: AnalysisCriterion[]
): Record<CriterionFilter, number> {
  return {
    all: criteria.length,
    demonstrated: criteria.filter((item) => item.status === "demonstrated")
      .length,
    to_clarify: criteria.filter((item) => item.status !== "demonstrated")
      .length,
  }
}

export type AnalysisSummary = {
  headline: string
  demonstratedCount: number
  toClarifyCount: number
  strengths: string[]
  toClarify: string[]
  nextStep: string | null
  nextStepCriterionId: string | null
}

export function buildAnalysisSummary(
  job: Job,
  criteria: AnalysisCriterion[],
  options?: { hasSuggestions?: boolean; firstQuestionCriterionId?: string | null }
): AnalysisSummary {
  const demonstrated = criteria.filter(
    (item) => item.status === "demonstrated"
  )
  const toClarify = criteria.filter((item) => item.status !== "demonstrated")

   const storedExplanation = criteria.length === 0 ? cleanString(job.score_explanation) : null
  const headline =
    storedExplanation ??
    (criteria.length > 0
      ? `${demonstrated.length} critère${demonstrated.length === 1 ? "" : "s"} démontré${demonstrated.length === 1 ? "" : "s"}${
          toClarify.length > 0
            ? ` · ${toClarify.length} à préciser`
            : ""
        }`
      : "L’analyse n’a pas produit assez d’éléments pour résumer la correspondance.")

  const firstQuestion = criteria.find((item) => item.question)
  const nextStepCriterionId =
    options?.firstQuestionCriterionId ?? firstQuestion?.id ?? null
  const nextStepLabel = nextStepCriterionId
    ? criteria.find((item) => item.id === nextStepCriterionId)?.label ?? null
    : null

  const nextStep = nextStepLabel
    ? `Préciser ton expérience sur « ${nextStepLabel} ».`
    : options?.hasSuggestions
      ? "Adapter la formulation de ton CV pour cette offre."
      : null

  return {
    headline,
    demonstratedCount: demonstrated.length,
    toClarifyCount: toClarify.length,
    strengths: demonstrated.slice(0, 3).map((item) => item.label),
    toClarify: toClarify.slice(0, 3).map((item) => item.label),
    nextStep,
    nextStepCriterionId,
  }
}

export type AnalysisQuestion = {
  id: string
  criterionId: string | null
  skillKey: string
  skillLabel: string
  question: string
  origin: "criterion" | "optimize"
}

export function buildExperienceQuestions(
  job: Job,
  criteria: AnalysisCriterion[],
  cvOptimize?: CvOptimizeResponse | null,
  cvText?: string
): AnalysisQuestion[] {
  const seen = new Set<string>()
  const questions: AnalysisQuestion[] = []

   for (const criterion of criteria) {
    if (criterion.status === "demonstrated") continue
    const skillKey = normalizeSkillKey(criterion.label)
    if (!skillKey || seen.has(skillKey)) continue
    seen.add(skillKey)
    const groundedQuestion = questionForRequirement(criterion.label)
    questions.push({
      id: criterion.id,
      criterionId: criterion.id,
      skillKey,
      skillLabel: criterion.label,
      question: /projet IA|exigence réglementaire/.test(groundedQuestion)
        ? groundedQuestion : criterion.question || groundedQuestion,
      origin: "criterion",
    })
  }

  for (const optimizeQuestion of cvOptimize?.questions ?? []) {
    const questionText = cleanString(optimizeQuestion.question)
    if (!questionText) continue
    const relatedModification = cvOptimize?.modifications.find((modification) =>
      optimizeQuestion.related_modification_ids.includes(modification.id)
    )
    const skillLabel =
      cleanString(relatedModification?.element_label) ??
      cleanString(relatedModification?.keywords_added?.[0]) ??
      questionText.split(/[.?!]/)[0]?.slice(0, 60).trim() ??
      questionText
    const skillKey = normalizeSkillKey(skillLabel)
    if (!skillKey || seen.has(skillKey)) continue
    seen.add(skillKey)
    questions.push({
      id: optimizeQuestion.id,
      criterionId: null,
      skillKey,
      skillLabel,
      question: questionText,
      origin: "optimize",
    })
  }

  for (const suggestion of buildCvSuggestions(cvOptimize ?? null, job, cvText)) {
    if (!suggestion.confirmationRequired || !suggestion.question) continue
    const skillKey = normalizeSkillKey(suggestion.title)
    if (seen.has(skillKey) || questions.some((q) => q.question === suggestion.question)) continue
    seen.add(skillKey)
    questions.push({ id: suggestion.id, criterionId: null, skillKey,
      skillLabel: suggestion.title, question: suggestion.question, origin: "optimize" })
  }

  return questions
}

export type AnsweredQuestion = {
  answer: "yes" | "no" | "unknown"
  detail: string | null
  updatedAt: string | null
}

export function getAnswerFor(
  job: Job,
  question: AnalysisQuestion
): AnsweredQuestion | null {
  if (question.origin === "criterion" && question.criterionId) {
    const confirmation = getConfirmationFor(job, question.criterionId)
    if (!confirmation) return null
    return {
      answer: confirmation.answer,
      detail: cleanString(confirmation.detail),
      updatedAt: confirmation.updated_at ?? null,
    }
  }

  const stored = job.optimize_answers?.[question.id]
  if (!stored?.answer) return null
  return {
    answer: stored.answer,
    detail: cleanString(stored.detail),
    updatedAt: stored.updated_at ?? stored.answered_at ?? null,
  }
}

export function isQuestionHandled(answer: AnsweredQuestion | null): boolean {
  return answer?.answer === "yes" || answer?.answer === "no"
}

export type AnalysisSuggestion = {
  id: string
  title: string
  section: string
  currentText: string | null
  proposedText: string | null
  reason: string
  keywords: string[]
  confirmationRequired: boolean
  question: string | null
  origin: "optimize" | "analysis"
  /** Only CV-optimize proposals can be applied/dismissed through the existing API. */
  applicable: boolean
}

const MODIFICATION_TITLES: Record<
  CvOptimizeResponse["modifications"][number]["type"],
  string
> = {
  reformulation: "Reformuler",
  ajout: "Ajouter une précision dans",
  reorganisation: "Réorganiser",
  alleger: "Alléger",
}

function buildSuggestionFromOptimize(
  modification: CvOptimizeResponse["modifications"][number], cvText?: string
): AnalysisSuggestion {
  const reasonParts = [cleanString(modification.justification)]
  const requirement = cleanString(modification.offer_requirement)
  if (requirement) reasonParts.push(`Exigence de l’offre : ${requirement}`)
  const elementLabel = cleanString(modification.element_label)

  const source = modification.sources?.find((item) => item.kind === "cv")
  const needsConfirmation = modification.confirmation_required || !source ||
    (cvText !== undefined && !isVerifiableCvQuote(cvText, source.quote)) ||
    !isFactuallySafeRewrite({original: modification.original_text ?? "", rewrite: modification.proposed_text})
  return {
    id: modification.id,
    title: elementLabel
      ? `${MODIFICATION_TITLES[modification.type]} « ${elementLabel} »`
      : `${MODIFICATION_TITLES[modification.type]} ${modification.section}`,
    section: modification.section,
    currentText: cleanString(modification.original_text),
    proposedText: needsConfirmation ? null : cleanString(modification.proposed_text),
    reason: reasonParts.filter(Boolean).join(" "),
    keywords: modification.keywords_added ?? [],
    confirmationRequired: needsConfirmation,
    question: needsConfirmation ? cleanString(modification.question) || questionForRequirement(elementLabel || requirement || modification.section) : null,
    origin: "optimize",
    applicable: true,
  }
}

export function buildCvSuggestions(
  cvOptimize: CvOptimizeResponse | null,
  job: Job,
  cvText?: string
): AnalysisSuggestion[] {
  const suggestions: AnalysisSuggestion[] = []
  const seen = new Set<string>()

  for (const modification of cvOptimize?.modifications ?? []) {
    if (!modification.proposed_text?.trim() && !modification.confirmation_required) continue
    if (seen.has(modification.id)) continue
    seen.add(modification.id)
    suggestions.push(buildSuggestionFromOptimize(modification, cvText))
  }

  for (const item of job.cv_improvement_items ?? []) {
    if (seen.has(item.id)) continue
    const proposed = cleanString(item.reformulation ?? item.suggested_rewrite)
    const original = cleanString(item.cv_original ?? item.evidence_from_cv)
    const needsConfirmation = item.type === "confirmation_required" ||
      Boolean(item.information_to_confirm || item.question) ||
      (cvText !== undefined && !isVerifiableCvQuote(cvText, original)) ||
      !isFactuallySafeRewrite({original: original ?? "", rewrite: proposed})
    if (!proposed && !needsConfirmation) continue
    seen.add(item.id)
    const reason = cleanString(item.reason)
    const evidence = cleanString(item.evidence_from_job)
    suggestions.push({
      id: item.id,
      title: item.action,
      section: cleanString(item.section ?? item.cv_section) ?? "CV",
      currentText: cleanString(item.cv_original ?? item.evidence_from_cv),
       proposedText: needsConfirmation ? null : proposed,
      reason:
        [reason, evidence ? `Extrait de l’offre : ${evidence}` : null]
          .filter(Boolean)
          .join(" ") || "Reformulation proposée pour mieux correspondre à l’offre.",
      keywords: item.keywords_added ?? [],
      confirmationRequired: needsConfirmation,
      question: needsConfirmation ? cleanString(item.question ?? item.information_to_confirm) ||
        questionForRequirement(item.requirement || item.action) : null,
      origin: "analysis",
      applicable: false,
    })
  }

  return suggestions
}

/** True only when the stored analysis can be verified as older than the CV. */
export function isAnalysisStaleForCv(
  job: Job,
  cvAnalysis: CvAnalysisResponse | null
): boolean {
  if (!hasJobFitResult(job) || !cvAnalysis) return false
  if (cvAnalysis.is_stale) return true
  const analyzedHash = job.job_fit_cv_hash
  if (!analyzedHash) return false
  return analyzedHash !== cvAnalysis.cv_content_hash
}

/**
 * Stricter check used for the "CV changed since this analysis" notice:
 * only a stored hash mismatch proves the analysis is outdated.
 */
export function isJobAnalysisOutdated(
  job: Job,
  cvAnalysis: CvAnalysisResponse | null
): boolean {
  const fit = job.raw_data?.job_fit as Record<string, unknown> | undefined
  if (fit?.offer_corrected_at) return true
  if (!hasJobFitResult(job) || !cvAnalysis) return false
  const analyzedHash = job.job_fit_cv_hash
  if (!analyzedHash) return false
  return analyzedHash !== cvAnalysis.cv_content_hash
}
