import { z } from "zod";
import type { JobAnalysis, JobCriterionAssessment } from "@/types";
import { deriveMatchScore } from "@/lib/jobs/derive-match-score";
import {
  computeScoreFromCriteria,
  slugFromLabel,
  type JobCriterionAssessment as CriterionRow,
} from "@/lib/jobs/criteria-score";
import { enforceCriteriaEvidenceAgainstCv } from "@/lib/jobs/verify-criteria-evidence";

const confidenceSchema = z.enum(["low", "medium", "high"]);
const importanceSchema = z.enum(["required", "preferred", "unspecified"]);
const prioritySchema = z.enum(["low", "medium", "high"]);
const nullableScore = z.preprocess((value) => {
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.round(Number(value))
  }
  return value
}, z.number().int().min(0).max(100).nullable())
const evidenceLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
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
  cv_status: z.enum([
    "demonstrated",
    "mentioned_only",
    "transferable",
    "not_evidenced",
    "contradicted",
  ]),
  evidence_from_job: softString,
  evidence_from_cv: softNullableString,
  question_to_candidate: softNullableString,
  confirmation_status: z
    .enum(["none", "asked", "confirmed", "denied"])
    .default("none"),
  recruiter_block_risk: z.enum(["low", "medium", "high"]).default("medium"),
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
        cv_status: z.enum([
          "demonstrated",
          "mentioned_only",
          "transferable",
          "not_evidenced",
          "contradicted",
        ]),
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
        gap_type: z.enum(["not_evidenced", "partial", "contradicted"]),
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
        priority: prioritySchema,
        cv_section: softString,
        action: softString,
        evidence_from_cv: softString,
        evidence_from_job: softString,
        suggested_rewrite: softNullableString,
        information_to_confirm: softNullableString,
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
  action: string;
  cv_section?: string;
  information_to_confirm?: string | null;
}): string {
  const parts = [
    item.cv_section?.trim() ? `[${item.cv_section.trim()}]` : null,
    item.action.trim(),
    item.information_to_confirm?.trim()
      ? `À confirmer: ${item.information_to_confirm.trim()}`
      : null,
  ].filter(Boolean);
  return parts.join(" ");
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
      .filter((item) => item.action.trim())
      .slice(0, 5)
      .map(improvementLine),
    cv_improvement_items: raw.cv_improvements
      .filter((item) => item.action.trim())
      .slice(0, 5)
      .map((item) => ({
        id: item.id.trim() || `edit-${item.action.slice(0, 12)}`,
        priority: item.priority,
        cv_section: item.cv_section.trim(),
        action: item.action.trim(),
        evidence_from_cv: item.evidence_from_cv.trim(),
        evidence_from_job: item.evidence_from_job.trim(),
        suggested_rewrite: item.suggested_rewrite?.trim() || null,
        information_to_confirm: item.information_to_confirm?.trim() || null,
      })),
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
