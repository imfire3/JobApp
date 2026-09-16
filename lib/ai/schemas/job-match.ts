import { z } from "zod";
import type { JobAnalysis, JobCriterionAssessment, JobCvImprovementItem } from "@/types";
import { deriveMatchScore } from "@/lib/jobs/derive-match-score";
import {
  computeScoreFromCriteria,
  slugFromLabel,
  type JobCriterionAssessment as CriterionRow,
} from "@/lib/jobs/criteria-score";
import { enforceCriteriaEvidenceAgainstCv } from "@/lib/jobs/verify-criteria-evidence";

const confidenceSchema = z.preprocess((value) => {
  if (value == null || value === "") return "low"
  const raw = String(value).trim().toLowerCase()
  if (raw === "low" || raw === "medium" || raw === "high") return raw
  if (raw === "med" || raw === "moderate" || raw === "moyen" || raw === "moyenne") {
    return "medium"
  }
  if (raw === "faible" || raw === "bas") return "low"
  if (raw === "élevé" || raw === "eleve" || raw === "élevée" || raw === "elevee") {
    return "high"
  }
  return "medium"
}, z.enum(["low", "medium", "high"]))

/** Models invent importance labels — coerce to the allowed set. */
const importanceSchema = z.preprocess((value) => {
  if (value == null || value === "") return "unspecified"
  const raw = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (raw === "required" || raw === "preferred" || raw === "unspecified") return raw
  if (
    raw === "must" ||
    raw === "must_have" ||
    raw === "mandatory" ||
    raw === "obligatoire" ||
    raw === "critical" ||
    raw === "essential" ||
    raw === "requis" ||
    raw === "nécessaire" ||
    raw === "necessaire" ||
    raw === "important"
  ) {
    return "required"
  }
  if (
    raw === "nice_to_have" ||
    raw === "nice" ||
    raw === "optional" ||
    raw === "bonus" ||
    raw === "souhaité" ||
    raw === "souhaite" ||
    raw === "souhaitable" ||
    raw === "plus" ||
    raw === "appreciated"
  ) {
    return "preferred"
  }
  if (raw === "unknown" || raw === "n_a" || raw === "na" || raw === "none") {
    return "unspecified"
  }
  return "unspecified"
}, z.enum(["required", "preferred", "unspecified"]))

const prioritySchema = confidenceSchema

/** Models invent gap_type labels — coerce to the allowed set. */
const gapTypeSchema = z.preprocess((value) => {
  if (value == null || value === "") return "not_evidenced"
  const raw = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (raw === "not_evidenced" || raw === "partial" || raw === "contradicted") {
    return raw
  }
  if (
    raw === "missing" ||
    raw === "absent" ||
    raw === "not_found" ||
    raw === "none" ||
    raw === "no_evidence" ||
    raw === "unsupported" ||
    raw === "gap" ||
    raw === "weak" ||
    raw === "lacking" ||
    raw === "manquant" ||
    raw === "absent_du_cv"
  ) {
    return "not_evidenced"
  }
  if (
    raw === "incomplete" ||
    raw === "limited" ||
    raw === "partial_match" ||
    raw === "some_evidence" ||
    raw === "mentioned_only" ||
    raw === "transferable" ||
    raw === "partiel" ||
    raw === "faible"
  ) {
    return "partial"
  }
  if (
    raw === "conflict" ||
    raw === "conflicting" ||
    raw === "mismatch" ||
    raw === "opposed" ||
    raw === "contraire" ||
    raw === "contradiction"
  ) {
    return "contradicted"
  }
  return "not_evidenced"
}, z.enum(["not_evidenced", "partial", "contradicted"]))

const cvStatusSchema = z.preprocess((value) => {
  if (value == null || value === "") return "not_evidenced"
  const raw = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (
    raw === "demonstrated" ||
    raw === "mentioned_only" ||
    raw === "transferable" ||
    raw === "not_evidenced" ||
    raw === "contradicted"
  ) {
    return raw
  }
  if (raw === "proven" || raw === "strong" || raw === "clear" || raw === "yes") {
    return "demonstrated"
  }
  if (raw === "mentioned" || raw === "stated" || raw === "listed") {
    return "mentioned_only"
  }
  if (raw === "adjacent" || raw === "related" || raw === "similar") {
    return "transferable"
  }
  if (raw === "missing" || raw === "absent" || raw === "no" || raw === "unknown") {
    return "not_evidenced"
  }
  if (raw === "conflict" || raw === "mismatch") return "contradicted"
  return "not_evidenced"
}, z.enum([
  "demonstrated",
  "mentioned_only",
  "transferable",
  "not_evidenced",
  "contradicted",
]))

const confirmationStatusSchema = z.preprocess((value) => {
  if (value == null || value === "") return "none"
  const raw = String(value).trim().toLowerCase()
  if (
    raw === "none" ||
    raw === "asked" ||
    raw === "confirmed" ||
    raw === "denied"
  ) {
    return raw
  }
  return "none"
}, z.enum(["none", "asked", "confirmed", "denied"]))

const nullableScore = z.preprocess((value) => {
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.round(Number(value))
  }
  return value
}, z.number().int().min(0).max(100).nullable())
const evidenceLevelSchema = z.preprocess((value) => {
  if (value == null || value === "") return 0
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  const rounded = Math.round(n)
  if (rounded <= 0) return 0
  if (rounded === 1) return 1
  if (rounded === 2) return 2
  return 3
}, z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
/** Models often return null for missing evidence — coerce to empty string. */
const softString = z.preprocess(
  (value) => (value == null ? "" : value),
  z.string()
);
const softNullableString = z.preprocess(
  (value) => (value == null ? null : value),
  z.string().nullable()
);

/** Models often invent match_type labels — coerce to the allowed set. */
const matchTypeSchema = z.preprocess((value) => {
  if (value == null || value === "") return "semantic"
  const raw = String(value).trim().toLowerCase()
  if (raw === "exact" || raw === "equivalent" || raw === "semantic") return raw
  if (
    raw === "partial" ||
    raw === "fuzzy" ||
    raw === "related" ||
    raw === "similar" ||
    raw === "close" ||
    raw === "approx" ||
    raw === "approximate" ||
    raw === "synonym" ||
    raw === "synonyme" ||
    raw === "near"
  ) {
    return "equivalent"
  }
  if (raw === "exact_match" || raw === "identique" || raw === "identical") {
    return "exact"
  }
  return "semantic"
}, z.enum(["exact", "equivalent", "semantic"]))

const criterionAssessmentSchema = z.object({
  id: softString,
  label: softString,
  weight_percent: z.number().min(0).max(100),
  evidence_level: evidenceLevelSchema,
  cv_status: cvStatusSchema,
  evidence_from_job: softString,
  evidence_from_cv: softNullableString,
  question_to_candidate: softNullableString,
  confirmation_status: confirmationStatusSchema.default("none"),
  recruiter_block_risk: confidenceSchema.default("medium"),
});

export const jobMatchAnalysisRawSchema = z.object({
  status: z.enum(["ok", "partial", "insufficient_input"]).default("ok"),
  match_score: nullableScore,
  score_confidence: confidenceSchema.default("low"),
  score_explanation: softString.default(""),
  limitations: z.array(softString).default([]),
  job_posting_summary: softString.default(""),
  criteria_assessment: z.array(criterionAssessmentSchema).default([]),
  score_breakdown: z
    .array(
      z.object({
        dimension: softString,
        score: nullableScore,
        effective_weight_percent: z.number().min(0).max(100),
        rationale: softString,
      })
    )
    .default([]),
  requirements_assessment: z
    .array(
      z.object({
        requirement: softString,
        importance: importanceSchema,
        evidence_from_job: softString,
        cv_status: cvStatusSchema,
        evidence_from_cv: softNullableString,
        assessment: softString,
      })
    )
    .default([]),
  match_reasons: z
    .array(
      z.object({
        title: softString,
        evidence_from_cv: softString,
        evidence_from_job: softString,
        explanation: softString,
      })
    )
    .default([]),
  match_gaps: z
    .array(
      z.object({
        title: softString,
        severity: prioritySchema,
        gap_type: gapTypeSchema,
        evidence_from_job: softString,
        evidence_from_cv: softNullableString,
        explanation: softString,
        question_to_candidate: softNullableString,
      })
    )
    .default([]),
  keywords_matched: z
    .array(
      z.object({
        job_term: softString,
        cv_term: softString,
        match_type: matchTypeSchema,
        evidence_from_job: softString,
        evidence_from_cv: softString,
      })
    )
    .default([]),
  keywords_missing: z
    .array(
      z.object({
        keyword: softString,
        importance: importanceSchema,
        evidence_from_job: softString,
        comment: softString,
      })
    )
    .default([]),
  keywords_from_job: z.array(softString).default([]),
  cv_improvements: z
    .array(
      z.object({
        id: softString,
        type: z
          .preprocess((value) => {
            if (value == null || value === "") return "suggestion"
            const raw = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")
            if (raw === "confirmation_required" || raw === "confirmation") {
              return "confirmation_required"
            }
            return "suggestion"
          }, z.enum(["suggestion", "confirmation_required"]))
          .default("suggestion"),
        priority: prioritySchema.optional(),
        cv_section: softString.default(""),
        section: softString.optional(),
        action: softString.default(""),
        requirement: softString.optional(),
        question: softString.optional(),
        evidence_from_cv: softString.optional(),
        cv_original: softString.optional(),
        evidence_from_job: softString.optional(),
        source_offer_requirement: softString.optional(),
        suggested_rewrite: softNullableString.optional(),
        reformulation: softNullableString.optional(),
        reason: softString.optional(),
        information_to_confirm: softNullableString.optional(),
        keywords_added: z
          .preprocess(
            (value) => {
              if (value == null) return []
              if (Array.isArray(value)) return value
              if (typeof value === "string") {
                return value
                  .split(/[,;]+/)
                  .map((entry) => entry.trim())
                  .filter(Boolean)
              }
              return []
            },
            z.array(softString)
          )
          .default([]),
        confidence: confidenceSchema.optional(),
        safe: z
          .preprocess(
            (value) => {
              if (value == null || value === "") return undefined
              if (typeof value === "boolean") return value
              const raw = String(value).trim().toLowerCase()
              if (["true", "yes", "oui", "1"].includes(raw)) return true
              if (["false", "no", "non", "0"].includes(raw)) return false
              return undefined
            },
            z.boolean().optional()
          )
          .optional(),
      })
    )
    .default([]),
  cover_letter_angle: softString.default(""),
});

export type JobMatchAnalysisRaw = z.infer<typeof jobMatchAnalysisRawSchema>;

export class JobMatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobMatchValidationError";
  }
}

function reasonLine(item: {
  title: string;
  explanation: string;
  evidence_from_cv?: string;
}): string {
  const parts = [item.title.trim(), item.explanation.trim()].filter(Boolean);
  if (item.evidence_from_cv?.trim()) {
    parts.push(`Preuve CV: ${item.evidence_from_cv.trim()}`);
  }
  return parts.join(" — ");
}

function gapLine(item: {
  title: string;
  explanation: string;
  evidence_from_job?: string;
  question_to_candidate?: string | null;
}): string {
  const parts = [item.title.trim(), item.explanation.trim()].filter(Boolean);
  if (item.evidence_from_job?.trim()) {
    parts.push(`Offre: ${item.evidence_from_job.trim()}`);
  }
  if (item.question_to_candidate?.trim()) {
    parts.push(`À confirmer: ${item.question_to_candidate.trim()}`);
  }
  return parts.join(" — ");
}

function improvementLine(item: {
  type: "suggestion" | "confirmation_required";
  action: string;
  reason?: string;
  requirement?: string;
  question?: string;
  section?: string;
  cv_section?: string;
  information_to_confirm?: string | null;
}): string {
  const section = item.section?.trim() || item.cv_section?.trim();
  const parts = [
    section ? `[${section}]` : null,
    item.type === "confirmation_required"
      ? item.requirement?.trim() || item.action.trim()
      : item.action.trim() || item.reason?.trim() || "",
    item.type === "confirmation_required"
      ? `À confirmer: ${item.question?.trim() || item.information_to_confirm?.trim() || ""}`
      : item.information_to_confirm?.trim()
        ? `À confirmer: ${item.information_to_confirm.trim()}`
        : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function toImprovementItem(
  item: JobMatchAnalysisRaw["cv_improvements"][number]
): JobCvImprovementItem {
  if (item.type === "confirmation_required") {
    const requirement =
      item.requirement?.trim() || item.action.trim() || "Information manquante";
    return {
      id: item.id.trim() || `confirm-${slugFromLabel(requirement.slice(0, 40))}`,
      type: "confirmation_required",
      priority: "high",
      cv_section: item.cv_section.trim(),
      action: requirement,
      evidence_from_cv: "",
      evidence_from_job:
        item.source_offer_requirement?.trim() || item.evidence_from_job?.trim() || "",
      suggested_rewrite: null,
      information_to_confirm:
        item.question?.trim() || item.information_to_confirm?.trim() || null,
      requirement: item.requirement?.trim() || null,
      question: item.question?.trim() || null,
      confidence: "low",
      safe: false,
    } satisfies JobCvImprovementItem;
  }

  const fromCv = item.cv_original?.trim() || item.evidence_from_cv?.trim() || "";
  const rewrite =
    item.reformulation?.trim() || item.suggested_rewrite?.trim() || null;
  const toConfirm =
    item.information_to_confirm?.trim() || item.question?.trim() || null;
  const safe =
    typeof item.safe === "boolean"
      ? item.safe
      : Boolean(rewrite && !toConfirm);

  return {
    id: item.id.trim() || `edit-${(item.reason?.trim() || fromCv || "edit").slice(0, 12)}`,
    type: "suggestion",
    priority:
      item.priority ??
      (item.confidence === "high"
        ? "high"
        : item.confidence === "low"
          ? "low"
          : "medium"),
    cv_section: item.section?.trim() || item.cv_section.trim(),
    action: item.reason?.trim() || item.action.trim() || fromCv,
    evidence_from_cv: fromCv,
    evidence_from_job:
      item.source_offer_requirement?.trim() || item.evidence_from_job?.trim() || "",
    suggested_rewrite: rewrite,
    information_to_confirm: toConfirm,
    section: item.section?.trim() || item.cv_section.trim(),
    cv_original: fromCv,
    reformulation: rewrite,
    reason: item.reason?.trim() || "",
    keywords_added: (item.keywords_added ?? [])
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    source_offer_requirement:
      item.source_offer_requirement?.trim() || item.evidence_from_job?.trim() || "",
    confidence: item.confidence ?? "medium",
    safe,
  } satisfies JobCvImprovementItem;
}

function normalizeCriteria(
  raw: JobMatchAnalysisRaw["criteria_assessment"]
): JobCriterionAssessment[] {
  return raw
    .filter((item) => item.label.trim())
    .slice(0, 12)
    .map((item, index) => {
      const hasQuestion = Boolean(item.question_to_candidate?.trim());
      const confirmation_status =
        item.confirmation_status === "none" && hasQuestion
          ? "asked"
          : item.confirmation_status;
      return {
        id: item.id.trim() || `${slugFromLabel(item.label)}-${index + 1}`,
        label: item.label.trim(),
        weight_percent: item.weight_percent,
        evidence_level: item.evidence_level,
        cv_status: item.cv_status,
        evidence_from_job: item.evidence_from_job.trim(),
        evidence_from_cv: item.evidence_from_cv?.trim() || null,
        question_to_candidate: item.question_to_candidate?.trim() || null,
        confirmation_status,
        recruiter_block_risk: item.recruiter_block_risk,
      } satisfies CriterionRow;
    });
}

/** Accepts prompt v3/v4/v5 rich objects or legacy flat string arrays. */
export function parseJobMatchAnalysis(
  raw: unknown,
  options?: { cvText?: string }
): JobAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new JobMatchValidationError("Invalid job match response");
  }

  const record = raw as Record<string, unknown>;
  const reasonsAreObjects =
    Array.isArray(record.match_reasons) &&
    record.match_reasons.some((item) => item && typeof item === "object");

  if (
    reasonsAreObjects ||
    "score_breakdown" in record ||
    "requirements_assessment" in record ||
    "criteria_assessment" in record
  ) {
    const parsed = jobMatchAnalysisRawSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new JobMatchValidationError(
        detail ? `Invalid job match response: ${detail}` : "Invalid job match response"
      );
    }
    return flattenJobMatchAnalysis(parsed.data, options);
  }

  const legacy = z
    .object({
      match_score: z.number().min(0).max(100).nullable().optional(),
      match_reasons: z.array(z.string()).default([]),
      match_gaps: z.array(z.string()).default([]),
      cover_letter_angle: z.string().default(""),
      keywords_from_job: z.array(z.string()).default([]),
      keywords_matched: z.array(z.string()).default([]),
      keywords_missing: z.array(z.string()).default([]),
      cv_improvements: z.array(z.string()).default([]),
      job_posting_summary: z.string().default(""),
    })
    .safeParse(raw);

  if (!legacy.success) {
    throw new JobMatchValidationError("Invalid job match response");
  }

  return {
    match_score: legacy.data.match_score ?? null,
    match_reasons: legacy.data.match_reasons,
    match_gaps: legacy.data.match_gaps,
    cover_letter_angle: legacy.data.cover_letter_angle,
    keywords_from_job: legacy.data.keywords_from_job,
    keywords_matched: legacy.data.keywords_matched,
    keywords_missing: legacy.data.keywords_missing,
    cv_improvements: legacy.data.cv_improvements,
    job_posting_summary: legacy.data.job_posting_summary,
  };
}

export function flattenJobMatchAnalysis(
  raw: JobMatchAnalysisRaw,
  options?: { cvText?: string }
): JobAnalysis {
  const matched = raw.keywords_matched
    .map((item) => item.job_term.trim() || item.cv_term.trim())
    .filter(Boolean)
    .slice(0, 12);
  const missing = raw.keywords_missing
    .map((item) => item.keyword.trim())
    .filter(Boolean)
    .slice(0, 12);
  const fromJobRaw = raw.keywords_from_job.map((item) => item.trim()).filter(Boolean);
  const fromJob = Array.from(new Set([...fromJobRaw, ...matched, ...missing])).slice(0, 25);

  const matchReasons = raw.match_reasons
    .filter((item) => item.title.trim() || item.explanation.trim())
    .slice(0, 5)
    .map(reasonLine);
  const matchGaps = raw.match_gaps
    .filter((item) => item.title.trim() || item.explanation.trim())
    .slice(0, 3)
    .map(gapLine);

  const normalized = normalizeCriteria(raw.criteria_assessment);
  const enforced = options?.cvText
    ? enforceCriteriaEvidenceAgainstCv(normalized, options.cvText)
    : normalized;
  const criteriaComputed = computeScoreFromCriteria(enforced);
  const criteria_assessment = criteriaComputed.criteria as JobCriterionAssessment[];

  const fallback = deriveMatchScore({
    match_score: raw.match_score,
    score_breakdown: raw.score_breakdown,
    keywords_matched: matched,
    keywords_missing: missing,
    match_reasons: matchReasons,
    match_gaps: matchGaps,
  });

  const match_score =
    criteria_assessment.length > 0
      ? criteriaComputed.match_score
      : fallback.score;

  const scoreExplanation =
    criteria_assessment.length > 0
      ? raw.score_explanation?.trim() ||
        "Score calculé à partir des critères pondérés de l’offre et du niveau de preuve vérifiable dans le CV (0–3)."
      : raw.score_explanation?.trim() ||
        (fallback.source === "keywords"
          ? "Score estimé à partir de la couverture des mots-clés ATS extraits (match_score IA absent)."
          : fallback.source === "breakdown"
            ? "Score recalculé depuis le détail des dimensions renvoyées par l’analyse."
            : fallback.source === "reasons_gaps"
              ? "Score estimé à partir des forces et écarts documentés (match_score IA absent)."
              : "");

  return {
    match_score,
    match_reasons: matchReasons,
    match_gaps: matchGaps,
    cover_letter_angle: raw.cover_letter_angle,
    keywords_from_job: fromJob,
    keywords_matched: matched,
    keywords_missing: missing,
    cv_improvements: raw.cv_improvements
      .filter(
        (item) =>
          item.action.trim() ||
          item.reason?.trim() ||
          item.requirement?.trim() ||
          Boolean(item.reformulation?.trim())
      )
      .slice(0, 10)
      .map(improvementLine),
    cv_improvement_items: raw.cv_improvements.slice(0, 10).map(toImprovementItem),
    criteria_assessment,
    score_breakdown: raw.score_breakdown
      .filter((item) => item.dimension.trim())
      .map((item) => ({
        dimension: item.dimension.trim(),
        score: item.score,
        effective_weight_percent: item.effective_weight_percent,
        rationale: item.rationale.trim(),
      })),
    job_posting_summary: raw.job_posting_summary,
    score_confidence: raw.score_confidence,
    score_explanation: scoreExplanation,
    limitations: raw.limitations,
    status: raw.status,
  };
}
