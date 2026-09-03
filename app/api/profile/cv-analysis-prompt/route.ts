import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { CV_ANALYSIS_SYSTEM_PROMPT } from "@/lib/ai/prompts/cv-analysis";
import { COVER_LETTER_SYSTEM_PROMPT } from "@/lib/ai/prompts/cover-letter";
import { JOB_MATCH_SYSTEM_PROMPT } from "@/lib/ai/prompts/job-match";
import { buildCvAnalysisUserPrompt } from "@/lib/ai/prompts/cv-analysis";
import { buildJobMatchUserPrompt } from "@/lib/ai/prompts/job-match";

const bodySchema = z.object({
  cv_analysis_system_prompt: z.string().max(20_000).nullable().optional(),
  job_match_system_prompt: z.string().max(20_000).nullable().optional(),
});

const SAMPLE_USER_CV_PROMPT = buildCvAnalysisUserPrompt("{{CV_TEXT}}");
const SAMPLE_JOB_MATCH_USER_PROMPT = buildJobMatchUserPrompt({
  cvText: "{{CV_TEXT}}",
  targetRoles: ["{{TARGET_ROLES}}"],
  targetLocations: ["{{TARGET_LOCATIONS}}"],
  jobTitle: "{{JOB_TITLE}}",
  company: "{{COMPANY}}",
  jobDescription: "{{JOB_DESCRIPTION}}",
  location: "{{LOCATION}}",
  remote: true,
});

function normalizePrompt(value: string | null | undefined, defaultPrompt: string) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === defaultPrompt.trim()) return null;
  return trimmed;
}

/**
 * GET/PUT /api/profile/cv-analysis-prompt
 * Manage visible/editable AI prompts for CV ATS analysis and job match.
 */
export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("cv_analysis_system_prompt, job_match_system_prompt")
    .eq("id", user.id)
    .maybeSingle();

  if (error && error.code !== "42P01" && error.code !== "42703") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cvCustom =
    typeof data?.cv_analysis_system_prompt === "string" &&
    data.cv_analysis_system_prompt.trim()
      ? data.cv_analysis_system_prompt
      : null;

  const jobCustom =
    typeof data?.job_match_system_prompt === "string" &&
    data.job_match_system_prompt.trim()
      ? data.job_match_system_prompt
      : null;

  return NextResponse.json({
    cv_analysis: {
      prompt: cvCustom ?? CV_ANALYSIS_SYSTEM_PROMPT,
      default_prompt: CV_ANALYSIS_SYSTEM_PROMPT,
      is_custom: Boolean(cvCustom),
      user_message_template: SAMPLE_USER_CV_PROMPT,
      focuses: [
        "parsing_score",
        "structure_score",
        "impact_score",
        "keyword_score",
        "missing_product_keywords",
        "detected_skills / tools / roles",
      ],
    },
    job_match: {
      prompt: jobCustom ?? JOB_MATCH_SYSTEM_PROMPT,
      default_prompt: JOB_MATCH_SYSTEM_PROMPT,
      is_custom: Boolean(jobCustom),
      user_message_template: SAMPLE_JOB_MATCH_USER_PROMPT,
      focuses: [
        "match_score",
        "mission vs CV evidence",
        "keywords / skills / tools from job posting",
        "match_reasons",
        "match_gaps",
        "cover_letter_angle",
      ],
    },
    cover_letter: {
      prompt: COVER_LETTER_SYSTEM_PROMPT,
      default_prompt: COVER_LETTER_SYSTEM_PROMPT,
      is_custom: false,
      editable: false,
      focuses: [
        "personalized hook",
        "CV evidence only",
        "first 90 days",
        "job language (FR/EN)",
      ],
    },
    // backward-compatible aliases for previous UI
    prompt: cvCustom ?? CV_ANALYSIS_SYSTEM_PROMPT,
    default_prompt: CV_ANALYSIS_SYSTEM_PROMPT,
    is_custom: Boolean(cvCustom),
  });
}

export async function PUT(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema> & { prompt?: string | null };
  try {
    const raw = await request.json();
    // Support legacy { prompt } from first UI version
    if (raw && typeof raw === "object" && "prompt" in raw && !("cv_analysis_system_prompt" in raw)) {
      body = {
        cv_analysis_system_prompt:
          raw.prompt === undefined ? undefined : (raw.prompt as string | null),
      };
    } else {
      body = bodySchema.parse(raw);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (body.cv_analysis_system_prompt !== undefined) {
    updates.cv_analysis_system_prompt = normalizePrompt(
      body.cv_analysis_system_prompt,
      CV_ANALYSIS_SYSTEM_PROMPT
    );
  }
  if (body.job_match_system_prompt !== undefined) {
    updates.job_match_system_prompt = normalizePrompt(
      body.job_match_system_prompt,
      JOB_MATCH_SYSTEM_PROMPT
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No prompt fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        id: user.id,
        ...updates,
      },
      { onConflict: "id" }
    )
    .select("cv_analysis_system_prompt, job_match_system_prompt")
    .single();

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json(
        {
          error:
            "Prompt columns missing. Run: npx supabase db push",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cvCustom =
    typeof data?.cv_analysis_system_prompt === "string" &&
    data.cv_analysis_system_prompt.trim()
      ? data.cv_analysis_system_prompt
      : null;

  const jobCustom =
    typeof data?.job_match_system_prompt === "string" &&
    data.job_match_system_prompt.trim()
      ? data.job_match_system_prompt
      : null;

  return NextResponse.json({
    cv_analysis: {
      prompt: cvCustom ?? CV_ANALYSIS_SYSTEM_PROMPT,
      default_prompt: CV_ANALYSIS_SYSTEM_PROMPT,
      is_custom: Boolean(cvCustom),
      user_message_template: SAMPLE_USER_CV_PROMPT,
    },
    job_match: {
      prompt: jobCustom ?? JOB_MATCH_SYSTEM_PROMPT,
      default_prompt: JOB_MATCH_SYSTEM_PROMPT,
      is_custom: Boolean(jobCustom),
      user_message_template: SAMPLE_JOB_MATCH_USER_PROMPT,
    },
    cover_letter: {
      prompt: COVER_LETTER_SYSTEM_PROMPT,
      default_prompt: COVER_LETTER_SYSTEM_PROMPT,
      is_custom: false,
      editable: false,
    },
    prompt: cvCustom ?? CV_ANALYSIS_SYSTEM_PROMPT,
    default_prompt: CV_ANALYSIS_SYSTEM_PROMPT,
    is_custom: Boolean(cvCustom),
  });
}
