import { z } from "zod";
import type { JobAnalysis } from "@/types";

const confidenceSchema = z.enum(["low", "medium", "high"]);
const importanceSchema = z.enum(["required", "preferred", "unspecified"]);
const prioritySchema = z.enum(["low", "medium", "high"]);
const nullableScore = z.number().int().min(0).max(100).nullable();

export const jobMatchAnalysisRawSchema = z.object({
  status: z.enum(["ok", "partial", "insufficient_input"]).default("ok"),
  match_score: nullableScore,
  score_confidence: confidenceSchema.default("low"),
  score_explanation: z.string().default(""),
  limitations: z.array(z.string()).default([]),
  job_posting_summary: z.string().default(""),
  score_breakdown: z
    .array(
      z.object({
        dimension: z.string(),
        score: nullableScore,
        effective_weight_percent: z.number().min(0).max(100),
        rationale: z.string(),
      })
    )
    .default([]),
  requirements_assessment: z
    .array(
      z.object({
        requirement: z.string(),
        importance: importanceSchema,
        evidence_from_job: z.string(),
        cv_status: z.enum([
          "demonstrated",
          "mentioned_only",
          "transferable",
          "not_evidenced",
          "contradicted",
        ]),
        evidence_from_cv: z.string().nullable(),
        assessment: z.string(),
      })
    )
    .default([]),
  match_reasons: z
    .array(
      z.object({
        title: z.string(),
        evidence_from_cv: z.string(),
        evidence_from_job: z.string(),
        explanation: z.string(),
      })
    )
    .default([]),
  match_gaps: z
    .array(
      z.object({
        title: z.string(),
        severity: prioritySchema,
        gap_type: z.enum(["not_evidenced", "partial", "contradicted"]),
        evidence_from_job: z.string(),
        evidence_from_cv: z.string().nullable(),
        explanation: z.string(),
        question_to_candidate: z.string().nullable(),
      })
    )
    .default([]),
  keywords_matched: z
    .array(
      z.object({
        job_term: z.string(),
        cv_term: z.string(),
        match_type: z.enum(["exact", "equivalent", "semantic"]),
        evidence_from_job: z.string(),
        evidence_from_cv: z.string(),
      })
    )
    .default([]),
  keywords_missing: z
    .array(
      z.object({
        keyword: z.string(),
        importance: importanceSchema,
        evidence_from_job: z.string(),
        comment: z.string(),
      })
    )
    .default([]),
  keywords_from_job: z.array(z.string()).default([]),
  cv_improvements: z
    .array(
      z.object({
        id: z.string(),
        priority: prioritySchema,
        cv_section: z.string(),
        action: z.string(),
        evidence_from_cv: z.string(),
        evidence_from_job: z.string(),
        suggested_rewrite: z.string().nullable(),
        information_to_confirm: z.string().nullable(),
      })
    )
    .default([]),
  cover_letter_angle: z.string().default(""),
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

/** Accepts prompt v3 rich objects or legacy flat string arrays. */
export function parseJobMatchAnalysis(raw: unknown): JobAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new JobMatchValidationError("Invalid job match response");
  }

  const record = raw as Record<string, unknown>;
  const reasonsAreObjects =
    Array.isArray(record.match_reasons) &&
    record.match_reasons.some((item) => item && typeof item === "object");

  if (reasonsAreObjects || "score_breakdown" in record || "requirements_assessment" in record) {
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
    return flattenJobMatchAnalysis(parsed.data);
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

export function flattenJobMatchAnalysis(raw: JobMatchAnalysisRaw): JobAnalysis {
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

  return {
    match_score: raw.match_score,
    match_reasons: raw.match_reasons
      .filter((item) => item.title.trim() || item.explanation.trim())
      .slice(0, 5)
      .map(reasonLine),
    match_gaps: raw.match_gaps
      .filter((item) => item.title.trim() || item.explanation.trim())
      .slice(0, 3)
      .map(gapLine),
    cover_letter_angle: raw.cover_letter_angle,
    keywords_from_job: fromJob,
    keywords_matched: matched,
    keywords_missing: missing,
    cv_improvements: raw.cv_improvements
      .filter((item) => item.action.trim())
      .slice(0, 5)
      .map(improvementLine),
    job_posting_summary: raw.job_posting_summary,
    score_confidence: raw.score_confidence,
    score_explanation: raw.score_explanation,
    limitations: raw.limitations,
    status: raw.status,
  };
}
