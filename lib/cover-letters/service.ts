import { generateCoverLetterContent } from "@/lib/ai/cover-letter";
import type { CoverLetterPromptInput } from "@/lib/ai/prompts/cover-letter";
import { toJobViewModel } from "@/lib/jobs/mapper";
import type { Job } from "@/types";

type SupabaseClient = {
  from: (table: string) => any;
};

export interface CoverLetterRecord {
  id: string;
  user_id: string;
  job_id: string;
  content: string;
  language: string | null;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateCoverLetterResult {
  coverLetterId: string;
  content: string;
  job: Job;
}

export interface BatchCoverLetterItemResult {
  jobId: string;
  status: "success" | "error";
  coverLetterId?: string;
  content?: string;
  error?: string;
}

export interface BatchCoverLetterResult {
  total: number;
  success: number;
  failed: number;
  results: BatchCoverLetterItemResult[];
}

type JobRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  title: string;
  company: string;
  contract_type: string | null;
  city: string | null;
  remote_mode: string | null;
  salary_min: number | null;
  salary_max: number | null;
  experience_min_years: number | null;
  experience_level: number | null;
  summary: string | null;
  profile: string | null;
  skills: string[] | null;
  published_at: string | null;
  description: string | null;
  ai_summary: string | null;
  url: string;
  status: string;
};

export async function loadCvText(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("cv_contexts")
    .select("cv_text")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const cvText = data?.cv_text?.trim();
  return cvText || null;
}

export async function loadOwnedJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as JobRow | null) ?? null;
}

function toPromptInput(job: JobRow, cvText: string): CoverLetterPromptInput {
  const skills = Array.isArray(job.skills)
    ? job.skills.filter((skill): skill is string => typeof skill === "string")
    : [];

  return {
    cvText,
    title: job.title,
    company: job.company,
    city: job.city,
    contractType: job.contract_type,
    remoteMode: job.remote_mode,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    experienceMinYears: job.experience_level ?? job.experience_min_years,
    summary: job.summary,
    profile: job.profile,
    skills,
    description: job.description,
    aiSummary: job.ai_summary,
    url: job.url,
  };
}

export async function generateAndSaveCoverLetter(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<GenerateCoverLetterResult> {
  const cvText = await loadCvText(supabase, userId);
  if (!cvText) {
    throw new CoverLetterError(
      "Please add your CV text in CV Context before generating cover letters",
      400
    );
  }

  const job = await loadOwnedJob(supabase, userId, jobId);
  if (!job) {
    throw new CoverLetterError("Job not found", 404);
  }

  const generated = await generateCoverLetterContent(toPromptInput(job, cvText));

  const { data: savedLetter, error: saveError } = await supabase
    .from("cover_letters")
    .upsert(
      {
        user_id: userId,
        job_id: job.id,
        content: generated.content,
        language: generated.language,
        model: generated.model,
        prompt_version: generated.promptVersion,
        generated_by: "ai",
      },
      { onConflict: "user_id,job_id" }
    )
    .select("*")
    .single();

  if (saveError) {
    throw new Error(saveError.message);
  }

  const nextStatus =
    job.status === "new" || job.status === "selected" ? "cover_generated" : job.status;

  const { data: updatedJob, error: updateError } = await supabase
    .from("jobs")
    .update({
      cover_letter: generated.content,
      status: nextStatus,
    })
    .eq("id", job.id)
    .eq("user_id", userId)
    .select("*, tracked_searches(name)")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    coverLetterId: savedLetter.id as string,
    content: generated.content,
    job: toJobViewModel(updatedJob),
  };
}

export async function generateCoverLetterBatch(
  supabase: SupabaseClient,
  userId: string,
  jobIds: string[]
): Promise<BatchCoverLetterResult> {
  const uniqueJobIds = [...new Set(jobIds)];
  const results: BatchCoverLetterItemResult[] = [];
  let success = 0;
  let failed = 0;

  for (const jobId of uniqueJobIds) {
    try {
      const result = await generateAndSaveCoverLetter(supabase, userId, jobId);
      success += 1;
      results.push({
        jobId,
        status: "success",
        coverLetterId: result.coverLetterId,
        content: result.content,
      });
    } catch (error) {
      failed += 1;
      results.push({
        jobId,
        status: "error",
        error:
          error instanceof CoverLetterError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Generation failed",
      });
    }
  }

  return {
    total: uniqueJobIds.length,
    success,
    failed,
    results,
  };
}

export class CoverLetterError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CoverLetterError";
  }
}
