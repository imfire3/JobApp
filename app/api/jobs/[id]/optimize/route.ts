import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { optimizeCvForJob } from "@/lib/openai/client";
import { cvOptimizeResponseSchema } from "@/lib/ai/schemas/cv-optimize";
import { CV_OPTIMIZE_PROMPT_VERSION } from "@/lib/ai/prompts/cv-optimize";
import { hashCvContent } from "@/lib/cv-analysis/hash";
import { hashJobContent } from "@/lib/jobs/job-fit-cache";
import {
  filterDismissedProposals,
  sanitizeCvOptimizeResponse,
} from "@/lib/jobs/cv-optimize-apply";
import {
  MIN_CV_TEXT_LENGTH,
  loadCvText,
  syncCvTextToContext,
} from "@/lib/cv/cv-context";

const bodySchema = z
  .object({
    force: z.boolean().optional(),
  })
  .optional();

function buildAnswersKey(answers: unknown): string {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return "none";
  try {
    return JSON.stringify(answers);
  } catch {
    return "none";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema> | undefined;
  try {
    body = bodySchema.parse(await request.json().catch(() => undefined));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id: jobId } = await params;

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const loadedCv = await loadCvText(supabase, user.id);
  const cvText = loadedCv.cvText;

  if (cvText.length < MIN_CV_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "CV trop court ou manquant. Ajoute ton CV dans ton profil ou relance l'analyse du CV." },
      { status: 400 },
    );
  }

  // Synchroniser vers cv_contexts si trouvé ailleurs
  if (loadedCv.source && loadedCv.source !== "cv_contexts") {
    await syncCvTextToContext(supabase, user.id, cvText);
  }

  const j = job as Record<string, unknown>;
  const requirements = Array.isArray(j.requirements) ? (j.requirements as string[]).join("\n") : "";
  const jobContent = [
    (j.title as string) || "",
    (j.company as string) || "",
    (j.description as string) || "",
    requirements,
  ]
    .join("\n\n")
    .trim();

  if (!jobContent) {
    return NextResponse.json({ error: "Offre vide." }, { status: 400 });
  }

  const rawData = ((job as Record<string, unknown>).raw_data && typeof (job as Record<string, unknown>).raw_data === "object" && !Array.isArray((job as Record<string, unknown>).raw_data)
    ? ((job as Record<string, unknown>).raw_data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const jobFit = (rawData.job_fit && typeof rawData.job_fit === "object" && !Array.isArray(rawData.job_fit)
    ? (rawData.job_fit as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const existingCvOpt = (jobFit.cv_optimize && typeof jobFit.cv_optimize === "object" && !Array.isArray(jobFit.cv_optimize)
    ? (jobFit.cv_optimize as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const optimizeSection = (jobFit.optimize && typeof jobFit.optimize === "object" && !Array.isArray(jobFit.optimize)
    ? (jobFit.optimize as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const optimizeAnswers = optimizeSection.answers;
  const dismissed = Array.isArray(jobFit.cv_optimize_dismissed)
    ? (jobFit.cv_optimize_dismissed as Array<{ proposal_id: string; cv_hash?: string | null; job_hash?: string | null }>)
    : [];

  const cvHash = hashCvContent(cvText);
  const jobHash = hashJobContent({ title: (j.title as string) || "", company: (j.company as string) || "", description: jobContent });
  const answersKey = buildAnswersKey(optimizeAnswers);
  const cacheKey = `${cvHash}:${jobHash}:${CV_OPTIMIZE_PROMPT_VERSION}:${answersKey}`;

  if (!body?.force && existingCvOpt.cache_key === cacheKey && existingCvOpt.response) {
    const cached = cvOptimizeResponseSchema.safeParse(existingCvOpt.response);
    if (cached.success) {
      const filtered = cvOptimizeResponseSchema.parse(
        sanitizeCvOptimizeResponse(
          filterDismissedProposals(cached.data, dismissed, cvHash, jobHash),
          jobContent,
          cvText,
        ),
      );
      return NextResponse.json({
        response: filtered,
        cached: true,
        prompt_version: CV_OPTIMIZE_PROMPT_VERSION,
        cv_text_current: cvText,
        cv_text_previous_exists: Boolean(loadedCv.cvTextPrevious),
      });
    }
  }

  let candidateConfirmations: string | null = null;
  if (optimizeAnswers && typeof optimizeAnswers === "object" && !Array.isArray(optimizeAnswers)) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(optimizeAnswers as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (o.answer) {
          parts.push(`- Question ${k}: réponse=${o.answer}${o.detail ? `, détail="${o.detail}"` : ""}`);
        }
      }
    }
    if (parts.length > 0) candidateConfirmations = parts.join("\n");
  }

  try {
    const aiResponse = await optimizeCvForJob({
      cvText,
      jobPosting: jobContent,
      candidateConfirmations,
    });
    const validated = cvOptimizeResponseSchema.parse(aiResponse);
    const filtered = cvOptimizeResponseSchema.parse(
      sanitizeCvOptimizeResponse(
        filterDismissedProposals(validated, dismissed, cvHash, jobHash),
        jobContent,
        cvText,
      ),
    );

    const nextJobFit: Record<string, unknown> = {
      ...jobFit,
      cv_optimize: {
        response: validated,
        cache_key: cacheKey,
        cv_hash: cvHash,
        job_hash: jobHash,
        updated_at: new Date().toISOString(),
        prompt_version: CV_OPTIMIZE_PROMPT_VERSION,
      },
    };
    const nextRawData = {
      ...rawData,
      job_fit: nextJobFit,
    };

    await supabase
      .from("jobs")
      .update({ raw_data: nextRawData, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("user_id", user.id);

    return NextResponse.json({
      response: filtered,
      cached: false,
      prompt_version: CV_OPTIMIZE_PROMPT_VERSION,
      cv_text_current: cvText,
      cv_text_previous_exists: Boolean(loadedCv.cvTextPrevious),
    });
  } catch (error) {
    console.error("cv-optimize generate error", error);
    return NextResponse.json({ error: "Erreur lors de l'optimisation du CV." }, { status: 500 });
  }
}
