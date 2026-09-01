import { z } from "zod";

export const CV_ANALYSIS_SEVERITIES = ["low", "medium", "high"] as const;

export const cvDetectedLanguageSchema = z.object({
  language: z.string().min(1),
  level: z.string().nullable().optional(),
});

export const cvAnalysisRecommendationSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(CV_ANALYSIS_SEVERITIES),
  title: z.string().min(1),
  explanation: z.string().min(1),
  evidence_from_cv: z.string().min(1),
  suggested_improvement: z.string().min(1),
});

const scoreSchema = z.number().int().min(0).max(100);

export const cvAtsAnalysisSchema = z.object({
  overall_score: scoreSchema,
  parsing_score: scoreSchema,
  structure_score: scoreSchema,
  impact_score: scoreSchema,
  keyword_score: scoreSchema,
  detected_roles: z.array(z.string()),
  detected_skills: z.array(z.string()),
  detected_tools: z.array(z.string()),
  detected_languages: z.array(cvDetectedLanguageSchema),
  detected_industries: z.array(z.string()),
  estimated_experience_years: z.number().nullable(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missing_product_keywords: z.array(z.string()),
  recommendations: z.array(cvAnalysisRecommendationSchema),
  recruiter_summary: z.string().min(1),
});

export type CvAtsAnalysis = z.infer<typeof cvAtsAnalysisSchema>;
export type CvAnalysisRecommendation = z.infer<typeof cvAnalysisRecommendationSchema>;
export type CvDetectedLanguage = z.infer<typeof cvDetectedLanguageSchema>;

export class CvAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvAnalysisValidationError";
  }
}

export function parseCvAtsAnalysis(raw: unknown): CvAtsAnalysis {
  const result = cvAtsAnalysisSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new CvAnalysisValidationError(
      detail ? `Invalid CV analysis response: ${detail}` : "Invalid CV analysis response"
    );
  }
  return result.data;
}
