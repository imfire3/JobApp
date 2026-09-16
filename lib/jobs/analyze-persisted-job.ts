import type { SupabaseClient } from "@supabase/supabase-js"
import { JOB_MATCH_PROMPT_VERSION } from "@/lib/ai/prompts/job-match"
import { hashCvContent } from "@/lib/cv-analysis/hash"
import { computeAtsOfferScore } from "@/lib/jobs/ats-offer-score"
import { hashJobContent } from "@/lib/jobs/job-fit-cache"
import { toJobViewModel } from "@/lib/jobs/mapper"
import { analyzeJobMatch } from "@/lib/openai/client"
import type { JobAnalysis } from "@/types"

export type AnalyzePersistedJobContext = {
  cvText: string
  targetRoles: string[]
  targetLocations: string[]
  cvSkills: string[]
  cvTools: string[]
  cvYearsExperience: number | null
  customJobPrompt: string | null
  apiKey: string | null
}

export async function loadAnalyzeContext(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; context: AnalyzePersistedJobContext }
  | { ok: false; error: string }
> {
  const [
    { data: profile, error: profileError },
    { data: candidateProfile },
    { data: settings },
  ] = await Promise.all([
    supabase.from("cv_contexts").select("cv_text").eq("id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("target_roles,target_locations,skills,tools,years_experience")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select("job_match_system_prompt,openai_key")
      .eq("id", userId)
      .maybeSingle(),
  ])

  if (profileError || !profile?.cv_text) {
    return {
      ok: false,
      error: "Ajoute ton CV dans Profil & CV avant d’analyser une offre.",
    }
  }

  const targetRoles = Array.isArray(candidateProfile?.target_roles)
    ? candidateProfile.target_roles.filter(
        (role): role is string => typeof role === "string" && role.trim().length > 0
      )
    : []
  const targetLocations = Array.isArray(candidateProfile?.target_locations)
    ? candidateProfile.target_locations.filter(
        (location): location is string =>
          typeof location === "string" && location.trim().length > 0
      )
    : []
  const cvSkills = Array.isArray(candidateProfile?.skills)
    ? candidateProfile.skills.filter(
        (skill): skill is string => typeof skill === "string" && skill.trim().length > 0
      )
    : []
  const cvTools = Array.isArray(candidateProfile?.tools)
    ? candidateProfile.tools.filter(
        (tool): tool is string => typeof tool === "string" && tool.trim().length > 0
      )
    : []
  const cvYearsExperience =
    typeof candidateProfile?.years_experience === "number" &&
    Number.isFinite(candidateProfile.years_experience)
      ? candidateProfile.years_experience
      : null

  return {
    ok: true,
    context: {
      cvText: profile.cv_text,
      targetRoles,
      targetLocations,
      cvSkills,
      cvTools,
      cvYearsExperience,
      customJobPrompt:
        typeof settings?.job_match_system_prompt === "string" &&
        settings.job_match_system_prompt.trim()
          ? settings.job_match_system_prompt
          : null,
      apiKey:
        typeof settings?.openai_key === "string" ? settings.openai_key : null,
    },
  }
}

export async function analyzeAndPersistJob(
  supabase: SupabaseClient,
  userId: string,
  job: Record<string, unknown>,
  context: AnalyzePersistedJobContext
): Promise<{ analysis: JobAnalysis; matchScore: number | null }> {
  const view = toJobViewModel(job as never)
  const analysis = await analyzeJobMatch(
    {
      cvText: context.cvText,
      targetRoles: context.targetRoles,
      targetLocations: context.targetLocations,
      jobTitle: String(job.title ?? ""),
      company: String(job.company ?? ""),
      jobDescription:
        typeof job.description === "string" ? job.description : "",
      location: view.location ?? undefined,
      remote: view.remote,
    },
    {
      systemPrompt: context.customJobPrompt,
      apiKey: context.apiKey,
    }
  )

  const existingRaw =
    job.raw_data && typeof job.raw_data === "object" && !Array.isArray(job.raw_data)
      ? (job.raw_data as Record<string, unknown>)
      : {}
  const existingJobFit =
    existingRaw.job_fit &&
    typeof existingRaw.job_fit === "object" &&
    !Array.isArray(existingRaw.job_fit)
      ? (existingRaw.job_fit as Record<string, unknown>)
      : {}
  const existingConfirmations = Array.isArray(existingJobFit.confirmations)
    ? existingJobFit.confirmations
    : []

  const ats = computeAtsOfferScore({
    keywordsMatched: analysis.keywords_matched,
    keywordsMissing: analysis.keywords_missing,
    jobSkills:
      view.skills && view.skills.length > 0
        ? view.skills
        : analysis.keywords_from_job,
    jobTools: view.tools,
    jobTitle: String(job.title ?? ""),
    jobExperienceYears: view.experience_min_years ?? view.experience_level,
    cvText: context.cvText,
    cvSkills: context.cvSkills,
    cvTools: context.cvTools,
    cvTargetRoles: context.targetRoles,
    cvYearsExperience: context.cvYearsExperience,
  })

  const cvContentHash = hashCvContent(context.cvText)
  const jobContentHash = hashJobContent({
    title: String(job.title ?? ""),
    company: String(job.company ?? ""),
    description: typeof job.description === "string" ? job.description : "",
    summary: typeof job.summary === "string" ? job.summary : null,
  })

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      ai_match_score: analysis.match_score,
      ai_strengths: analysis.match_reasons,
      ai_gaps: analysis.match_gaps,
      match_score: analysis.match_score,
      match_reasons: analysis.match_reasons,
      match_gaps: analysis.match_gaps,
      cover_letter_angle: analysis.cover_letter_angle,
      raw_data: {
        ...existingRaw,
        job_fit: {
          keywords_from_job: analysis.keywords_from_job,
          keywords_matched: analysis.keywords_matched,
          keywords_missing: analysis.keywords_missing,
          cv_improvements: analysis.cv_improvements,
          cv_improvement_items: analysis.cv_improvement_items ?? [],
          criteria_assessment: analysis.criteria_assessment ?? [],
          score_breakdown: analysis.score_breakdown ?? [],
          ats_score: ats.ats_score,
          ats_breakdown: ats.ats_breakdown,
          job_posting_summary: analysis.job_posting_summary,
          score_confidence: analysis.score_confidence ?? null,
          score_explanation: analysis.score_explanation ?? null,
          limitations: analysis.limitations ?? [],
          status: analysis.status ?? "ok",
          prompt_version: JOB_MATCH_PROMPT_VERSION,
          cv_content_hash: cvContentHash,
          job_content_hash: jobContentHash,
          confirmations: existingConfirmations,
        },
      },
    })
    .eq("id", job.id)
    .eq("user_id", userId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return { analysis, matchScore: analysis.match_score }
}
