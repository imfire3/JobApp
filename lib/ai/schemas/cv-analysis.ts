import { z } from "zod";

export const CV_ANALYSIS_SEVERITIES = ["low", "medium", "high"] as const;
export const CV_ANALYSIS_CONFIDENCE = ["low", "medium", "high"] as const;
export const CV_ANALYSIS_STATUSES = ["ok", "partial", "insufficient_input"] as const;
export const CV_ANALYSIS_CATEGORIES = [
  "parsing",
  "structure",
  "positioning",
  "impact",
  "keywords",
  "writing",
  "consistency",
] as const;

const nullableScoreSchema = z.number().int().min(0).max(100).nullable();

const scoreExplanationSchema = z.object({
  rationale: z.string(),
  confidence: z.enum(CV_ANALYSIS_CONFIDENCE),
});

export const cvDetectedLanguageSchema = z.object({
  language: z.string(),
  level: z.string().nullable().optional(),
  evidence_from_cv: z.string().optional(),
});

export const cvDetectedExperienceSchema = z.object({
  title: z.string(),
  organization: z.string(),
  location: z.string().nullable().optional(),
  employment_type: z.string().nullable().optional(),
  is_current: z.boolean().optional().default(false),
  start_month: z.string().nullable().optional(),
  start_year: z.string().nullable().optional(),
  end_month: z.string().nullable().optional(),
  end_year: z.string().nullable().optional(),
  highlights: z.string().optional().default(""),
  skills: z.array(z.string()).optional().default([]),
  evidence_from_cv: z.string().optional().default(""),
});

export const cvEvidenceItemSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  evidence_from_cv: z.string(),
});

export const cvAnalysisRecommendationSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(CV_ANALYSIS_SEVERITIES),
  title: z.string().min(1),
  explanation: z.string(),
  evidence_from_cv: z.string(),
  suggested_improvement: z.string(),
  suggested_rewrite: z.string().nullable().optional(),
  information_to_confirm: z.string().nullable().optional(),
});

const targetRoleSchema = z.object({
  role: z.string(),
  source: z.enum(["explicit", "inferred"]),
  evidence_from_cv: z.string(),
});

/** Raw model output (prompt v3). */
export const cvAtsAnalysisRawSchema = z.object({
  status: z.enum(CV_ANALYSIS_STATUSES).default("ok"),
  assessment_scope: z
    .object({
      inputs_observed: z.array(z.string()).default([]),
      limitations: z.array(z.string()).default([]),
      ats_disclaimer: z.string().default(""),
    })
    .optional(),
  target_roles: z.array(targetRoleSchema).default([]),
  scores: z.object({
    parsing_score: nullableScoreSchema,
    structure_score: nullableScoreSchema,
    impact_score: nullableScoreSchema,
    keyword_score: nullableScoreSchema,
    overall_score: nullableScoreSchema,
  }),
  score_explanations: z
    .object({
      parsing_score: scoreExplanationSchema.optional(),
      structure_score: scoreExplanationSchema.optional(),
      impact_score: scoreExplanationSchema.optional(),
      keyword_score: scoreExplanationSchema.optional(),
      overall_score: scoreExplanationSchema.optional(),
    })
    .optional(),
  strengths: z.array(cvEvidenceItemSchema).default([]),
  weaknesses: z.array(cvEvidenceItemSchema).default([]),
  recommendations: z.array(cvAnalysisRecommendationSchema).default([]),
  detected_languages: z.array(cvDetectedLanguageSchema).default([]),
  detected_skills: z.array(z.string()).default([]),
  detected_tools: z.array(z.string()).default([]),
  detected_industries: z.array(z.string()).default([]),
  estimated_experience_years: z.number().nullable().optional().default(null),
  detected_experiences: z.array(cvDetectedExperienceSchema).default([]),
  recruiter_summary: z.string().default(""),
});

export type CvAtsAnalysisRaw = z.infer<typeof cvAtsAnalysisRawSchema>;
export type CvAnalysisRecommendation = z.infer<typeof cvAnalysisRecommendationSchema>;
export type CvDetectedLanguage = z.infer<typeof cvDetectedLanguageSchema>;
export type CvDetectedExperience = z.infer<typeof cvDetectedExperienceSchema>;
export type CvEvidenceItem = z.infer<typeof cvEvidenceItemSchema>;

/**
 * Normalized analysis stored/returned by the app.
 * Keeps legacy flat fields for existing UI while preserving rich v3 data.
 */
export type CvAtsAnalysis = {
  status: (typeof CV_ANALYSIS_STATUSES)[number];
  assessment_scope?: CvAtsAnalysisRaw["assessment_scope"];
  target_roles: CvAtsAnalysisRaw["target_roles"];
  scores: CvAtsAnalysisRaw["scores"];
  score_explanations?: CvAtsAnalysisRaw["score_explanations"];
  overall_score: number | null;
  parsing_score: number | null;
  structure_score: number | null;
  impact_score: number | null;
  keyword_score: number | null;
  detected_roles: string[];
  detected_skills: string[];
  detected_tools: string[];
  detected_languages: CvDetectedLanguage[];
  detected_industries: string[];
  detected_experiences: CvDetectedExperience[];
  estimated_experience_years: number | null;
  strengths: string[];
  weaknesses: string[];
  strengths_detailed: CvEvidenceItem[];
  weaknesses_detailed: CvEvidenceItem[];
  missing_product_keywords: string[];
  recommendations: CvAnalysisRecommendation[];
  recruiter_summary: string;
};

export class CvAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvAnalysisValidationError";
  }
}

function evidenceToLine(item: CvEvidenceItem): string {
  const parts = [item.title.trim(), item.explanation.trim()].filter(Boolean);
  return parts.join(" — ");
}

/** Accepts prompt v3 or legacy flat v1/v2 payloads. */
export function parseCvAtsAnalysis(raw: unknown): CvAtsAnalysis {
  if (raw && typeof raw === "object" && "scores" in (raw as object)) {
    const result = cvAtsAnalysisRawSchema.safeParse(raw);
    if (!result.success) {
      const detail = result.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new CvAnalysisValidationError(
        detail ? `Invalid CV analysis response: ${detail}` : "Invalid CV analysis response"
      );
    }
    return normalizeCvAtsAnalysis(result.data);
  }

  // Legacy flat schema (scores at root)
  const legacySchema = z.object({
    overall_score: z.number().int().min(0).max(100),
    parsing_score: z.number().int().min(0).max(100),
    structure_score: z.number().int().min(0).max(100),
    impact_score: z.number().int().min(0).max(100),
    keyword_score: z.number().int().min(0).max(100),
    detected_roles: z.array(z.string()).default([]),
    detected_skills: z.array(z.string()).default([]),
    detected_tools: z.array(z.string()).default([]),
    detected_languages: z.array(cvDetectedLanguageSchema).default([]),
    detected_industries: z.array(z.string()).default([]),
    estimated_experience_years: z.number().nullable().default(null),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    missing_product_keywords: z.array(z.string()).default([]),
    recommendations: z.array(cvAnalysisRecommendationSchema).default([]),
    recruiter_summary: z.string().default(""),
  });

  const legacy = legacySchema.safeParse(raw);
  if (!legacy.success) {
    throw new CvAnalysisValidationError("Invalid CV analysis response");
  }

  const data = legacy.data;
  return {
    status: "ok",
    target_roles: data.detected_roles.map((role) => ({
      role,
      source: "inferred" as const,
      evidence_from_cv: "",
    })),
    scores: {
      parsing_score: data.parsing_score,
      structure_score: data.structure_score,
      impact_score: data.impact_score,
      keyword_score: data.keyword_score,
      overall_score: data.overall_score,
    },
    overall_score: data.overall_score,
    parsing_score: data.parsing_score,
    structure_score: data.structure_score,
    impact_score: data.impact_score,
    keyword_score: data.keyword_score,
    detected_roles: data.detected_roles,
    detected_skills: data.detected_skills,
    detected_tools: data.detected_tools,
    detected_languages: data.detected_languages,
    detected_industries: data.detected_industries,
    detected_experiences: [],
    estimated_experience_years: data.estimated_experience_years,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    strengths_detailed: data.strengths.map((title) => ({
      title,
      explanation: "",
      evidence_from_cv: "",
    })),
    weaknesses_detailed: data.weaknesses.map((title) => ({
      title,
      explanation: "",
      evidence_from_cv: "",
    })),
    missing_product_keywords: data.missing_product_keywords,
    recommendations: data.recommendations,
    recruiter_summary: data.recruiter_summary,
  };
}

export function normalizeCvAtsAnalysis(raw: CvAtsAnalysisRaw): CvAtsAnalysis {
  const strengthsDetailed = raw.strengths.filter((item) => item.title.trim());
  const weaknessesDetailed = raw.weaknesses.filter((item) => item.title.trim());

  return {
    status: raw.status,
    assessment_scope: raw.assessment_scope,
    target_roles: raw.target_roles.filter((role) => role.role.trim()),
    scores: raw.scores,
    score_explanations: raw.score_explanations,
    overall_score: raw.scores.overall_score,
    parsing_score: raw.scores.parsing_score,
    structure_score: raw.scores.structure_score,
    impact_score: raw.scores.impact_score,
    keyword_score: raw.scores.keyword_score,
    detected_roles: raw.target_roles.map((role) => role.role).filter(Boolean),
    detected_skills: raw.detected_skills.map((item) => item.trim()).filter(Boolean),
    detected_tools: raw.detected_tools.map((item) => item.trim()).filter(Boolean),
    detected_languages: raw.detected_languages.filter((lang) => lang.language.trim()),
    detected_industries: raw.detected_industries.map((item) => item.trim()).filter(Boolean),
    detected_experiences: raw.detected_experiences.filter(
      (item) => item.title.trim() && item.organization.trim()
    ),
    estimated_experience_years: raw.estimated_experience_years ?? null,
    strengths: strengthsDetailed.map(evidenceToLine),
    weaknesses: weaknessesDetailed.map(evidenceToLine),
    strengths_detailed: strengthsDetailed,
    weaknesses_detailed: weaknessesDetailed,
    missing_product_keywords: [],
    recommendations: raw.recommendations,
    recruiter_summary: raw.recruiter_summary,
  };
}
