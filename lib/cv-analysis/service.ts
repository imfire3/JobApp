import { analyzeCvForAts } from "@/lib/ai/cv-analysis";
import { CV_ANALYSIS_PROMPT_VERSION } from "@/lib/ai/prompts/cv-analysis";
import { CvAnalysisValidationError } from "@/lib/ai/schemas/cv-analysis";
import type { CvAtsAnalysis } from "@/lib/ai/schemas/cv-analysis";
import { hashCvContent } from "@/lib/cv-analysis/hash";
import type { CvAnalysisResponse } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MIN_CV_LENGTH = 200;
export const MAX_CV_LENGTH = 30_000;

export class CvAnalysisError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CvAnalysisError";
    this.status = status;
  }
}

type CvAnalysisRow = {
  id: string;
  user_id: string;
  analysis: CvAtsAnalysis;
  model: string;
  prompt_version: string;
  cv_content_hash: string;
  created_at: string;
  updated_at: string;
};

export async function loadSavedCvText(
  supabase: SupabaseClient,
  userId: string
): Promise<{ cvText: string; updatedAt: string | null }> {
  const { data, error } = await supabase
    .from("cv_contexts")
    .select("cv_text, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new CvAnalysisError(error.message, 500);

  const cvText = data?.cv_text?.trim() ?? "";
  return { cvText, updatedAt: data?.updated_at ?? null };
}

export async function loadCvAnalysisSystemPrompt(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("cv_analysis_system_prompt")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return null;
    throw new CvAnalysisError(error.message, 500);
  }

  const prompt = data?.cv_analysis_system_prompt;
  return typeof prompt === "string" && prompt.trim() ? prompt : null;
}

function assertCvReady(cvText: string): void {
  if (!cvText) {
    throw new CvAnalysisError(
      "No CV text saved. Please save your CV before running analysis.",
      400
    );
  }
  if (cvText.length < MIN_CV_LENGTH) {
    throw new CvAnalysisError(
      `CV text is too short for analysis (minimum ${MIN_CV_LENGTH} characters).`,
      400
    );
  }
  if (cvText.length > MAX_CV_LENGTH) {
    throw new CvAnalysisError(
      `CV text is too long for analysis (maximum ${MAX_CV_LENGTH} characters).`,
      400
    );
  }
}

function toResponse(
  row: CvAnalysisRow,
  currentHash: string,
  cvUpdatedAt: string | null
): CvAnalysisResponse {
  return {
    analysis: row.analysis,
    model: row.model,
    prompt_version: row.prompt_version,
    cv_content_hash: row.cv_content_hash,
    is_stale: row.cv_content_hash !== currentHash,
    analyzed_at: row.updated_at,
    cv_updated_at: cvUpdatedAt,
  };
}

export async function getLatestCvAnalysis(
  supabase: SupabaseClient,
  userId: string
): Promise<CvAnalysisResponse | null> {
  const { cvText, updatedAt } = await loadSavedCvText(supabase, userId);
  const currentHash = cvText ? hashCvContent(cvText) : "";

  const { data, error } = await supabase
    .from("cv_analyses")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new CvAnalysisError(error.message, 500);
  }

  if (!data) return null;

  return toResponse(data as CvAnalysisRow, currentHash, updatedAt);
}

export async function runCvAnalysis(
  supabase: SupabaseClient,
  userId: string
): Promise<CvAnalysisResponse> {
  const { cvText, updatedAt } = await loadSavedCvText(supabase, userId);
  assertCvReady(cvText);

  const cvContentHash = hashCvContent(cvText);
  const customPrompt = await loadCvAnalysisSystemPrompt(supabase, userId);

  let analysis: CvAtsAnalysis;
  let model: string;
  let promptVersion: string;
  try {
    ({ analysis, model, promptVersion } = await analyzeCvForAts(cvText, {
      systemPrompt: customPrompt,
    }));
  } catch (error) {
    if (error instanceof CvAnalysisValidationError) {
      throw new CvAnalysisError(error.message, 422);
    }
    const message = error instanceof Error ? error.message : "CV analysis failed";
    throw new CvAnalysisError(message, 500);
  }

  const { data, error } = await supabase
    .from("cv_analyses")
    .upsert(
      {
        user_id: userId,
        analysis,
        model,
        prompt_version: promptVersion || CV_ANALYSIS_PROMPT_VERSION,
        cv_content_hash: cvContentHash,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new CvAnalysisError(
        "CV analysis table is not available. Run database migrations first.",
        500
      );
    }
    throw new CvAnalysisError(error.message, 500);
  }

  return toResponse(data as CvAnalysisRow, cvContentHash, updatedAt);
}

export function isCvContentStale(
  savedCvText: string,
  analysisHash: string | null | undefined
): boolean {
  if (!analysisHash || !savedCvText.trim()) return false;
  return hashCvContent(savedCvText) !== analysisHash;
}
