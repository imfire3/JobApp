import type { SupabaseClient } from "@supabase/supabase-js"
import { MIN_CV_PARSE_LENGTH } from "@/lib/resume/types"
import {
  draftToExtractedSnapshot,
  mapParsedResumeToProfileDraft,
  type ProfileDraft,
} from "@/lib/resume/map-to-profile"
import { parseResume } from "@/lib/resume/parse-resume"
import { resumeDevLog } from "@/lib/resume/normalize-text"
import { loadUserOpenAIKey } from "@/lib/openai/api-key"
import {
  parseEducationEntries,
  parseExperienceEntries,
  parseLanguageEntries,
  preferredContractsFromAiPreferences,
  profileSelectColumns,
  asStringArray,
} from "@/lib/profile/schema"
import type { ParsedResume } from "@/lib/resume/types"

export type ExtractProfileResult =
  | {
      ok: true
      profile: Record<string, unknown>
      draft: ProfileDraft
      parsed: ParsedResume
      extracted: boolean
      prompt_version: string
      model: string
    }
  | {
      ok: false
      profile: Record<string, unknown>
      draft: ProfileDraft | null
      parsed: ParsedResume | null
      extracted: false
      error: string
    }

function mapProfileRow(
  userId: string,
  cvText: string,
  cvMeta: { created_at?: string; updated_at?: string } | null,
  row: Record<string, unknown> | null
) {
  const aiPreferences = row?.ai_preferences ?? {}
  return {
    id: userId,
    cv_text: cvText,
    created_at: cvMeta?.created_at ?? new Date().toISOString(),
    updated_at: cvMeta?.updated_at ?? new Date().toISOString(),
    first_name: typeof row?.first_name === "string" ? row.first_name : null,
    last_name: typeof row?.last_name === "string" ? row.last_name : null,
    contact_email:
      typeof row?.contact_email === "string" ? row.contact_email : null,
    phone: typeof row?.phone === "string" ? row.phone : null,
    date_of_birth: typeof row?.date_of_birth === "string" ? row.date_of_birth : null,
    current_city: typeof row?.current_city === "string" ? row.current_city : null,
    current_title: typeof row?.current_title === "string" ? row.current_title : null,
    linkedin_url: typeof row?.linkedin_url === "string" ? row.linkedin_url : null,
    github_url: typeof row?.github_url === "string" ? row.github_url : null,
    website_url: typeof row?.website_url === "string" ? row.website_url : null,
    skills: asStringArray(row?.skills),
    experience_entries: parseExperienceEntries(row?.experience_entries),
    education_entries: parseEducationEntries(row?.education_entries),
    language_entries: parseLanguageEntries(row?.language_entries),
    target_roles: asStringArray(row?.target_roles),
    target_locations: asStringArray(row?.target_locations),
    desired_salary:
      typeof row?.desired_salary === "number" ? row.desired_salary : null,
    remote_preference:
      typeof row?.remote_preference === "string" ? row.remote_preference : null,
    preferred_contract_types: preferredContractsFromAiPreferences(aiPreferences),
    extracted_cv: row?.extracted_cv ?? {},
    extracted_cv_prompt_version:
      typeof row?.extracted_cv_prompt_version === "string"
        ? row.extracted_cv_prompt_version
        : null,
    profile_reviewed_at:
      typeof row?.profile_reviewed_at === "string" ? row.profile_reviewed_at : null,
    cv_file_name: typeof row?.cv_file_name === "string" ? row.cv_file_name : null,
    cv_file_path: typeof row?.cv_file_path === "string" ? row.cv_file_path : null,
    cv_file_updated_at:
      typeof row?.cv_file_updated_at === "string" ? row.cv_file_updated_at : null,
  }
}

export async function loadCandidateProfile(
  supabase: SupabaseClient,
  userId: string
) {
  const [{ data: cvData, error: cvError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      supabase
        .from("cv_contexts")
        .select("id,cv_text,updated_at,created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(profileSelectColumns())
        .eq("id", userId)
        .maybeSingle(),
    ])

  if (cvError && cvError.code !== "42P01") {
    throw new Error(cvError.message)
  }
  if (profileError && profileError.code !== "42P01" && profileError.code !== "42703") {
    throw new Error(profileError.message)
  }

  let cv = cvData
  if (!cv && (!cvError || cvError.code !== "42P01")) {
    const { data: created, error: createError } = await supabase
      .from("cv_contexts")
      .insert({ id: userId, cv_text: "" })
      .select("id,cv_text,updated_at,created_at")
      .single()

    if (createError && createError.code !== "42P01") {
      throw new Error(createError.message)
    }
    cv = created ?? null
  }

  return mapProfileRow(
    userId,
    cv?.cv_text ?? "",
    cv,
    (profileRow as Record<string, unknown> | null) ?? null
  )
}

function emptyDraftFromProfile(existing: Record<string, unknown>): ProfileDraft {
  return {
    first_name: null,
    last_name: null,
    contact_email: null,
    phone: null,
    date_of_birth: null,
    current_city: null,
    current_title: null,
    linkedin_url: null,
    github_url: null,
    website_url: null,
    skills: [],
    experience_entries: [],
    education_entries: [],
    language_entries: [],
    target_roles: [],
    target_locations: [],
    desired_salary: null,
    remote_preference: null,
    preferred_contract_types: [],
    cv_file_name:
      typeof existing.cv_file_name === "string" ? existing.cv_file_name : null,
    cv_file_path:
      typeof existing.cv_file_path === "string" ? existing.cv_file_path : null,
    cv_file_updated_at:
      typeof existing.cv_file_updated_at === "string"
        ? existing.cv_file_updated_at
        : null,
    profile_reviewed_at: null,
    extracted_cv_prompt_version: null,
    suggested_roles: [],
  }
}

/**
 * Parse CV text → draft for the form.
 * Persists only extracted_cv snapshot (+ prompt version). Does NOT upsert
 * structured profile columns — user confirms via PUT /api/profile.
 */
export async function runCvProfileExtraction(
  supabase: SupabaseClient,
  userId: string,
  options?: { force?: boolean }
): Promise<ExtractProfileResult> {
  const existing = await loadCandidateProfile(supabase, userId)
  const cvText = existing.cv_text?.trim() ?? ""

  if (cvText.length < MIN_CV_PARSE_LENGTH) {
    return {
      ok: false,
      profile: existing,
      draft: null,
      parsed: null,
      extracted: false,
      error: `CV trop court (minimum ${MIN_CV_PARSE_LENGTH} caractères)`,
    }
  }

  // Already reviewed: skip re-extract unless forced (settings "Relancer")
  if (!options?.force && existing.profile_reviewed_at) {
    return {
      ok: true,
      profile: existing,
      draft: emptyDraftFromProfile(existing),
      parsed: {
        personalInformation: {},
        experiences: [],
        skills: [],
        languages: [],
        education: [],
        resources: {},
        suggestedRoles: [],
        meta: {
          ocrUsed: false,
          textLength: cvText.length,
          promptVersion: existing.extracted_cv_prompt_version ?? undefined,
        },
      },
      extracted: false,
      prompt_version: existing.extracted_cv_prompt_version ?? "",
      model: "",
    }
  }

  try {
    const userKey = await loadUserOpenAIKey(supabase, userId)
    const parsed = await parseResume(cvText, { apiKey: userKey })
    const draft = mapParsedResumeToProfileDraft(parsed)

    // Preserve file meta from existing profile on the draft for UI
    draft.cv_file_name =
      typeof existing.cv_file_name === "string" ? existing.cv_file_name : null
    draft.cv_file_path =
      typeof existing.cv_file_path === "string" ? existing.cv_file_path : null
    draft.cv_file_updated_at =
      typeof existing.cv_file_updated_at === "string"
        ? existing.cv_file_updated_at
        : null

    const snapshot = draftToExtractedSnapshot(draft)
    const promptVersion = parsed.meta.promptVersion ?? "resume-pipeline-v1"

    // Snapshot only — do not overwrite validated structured columns
    const snapshotPayload: Record<string, unknown> = {
      id: userId,
      extracted_cv: snapshot,
      extracted_cv_prompt_version: promptVersion,
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(snapshotPayload, { onConflict: "id" })

    if (upsertError && upsertError.code !== "42P01" && upsertError.code !== "42703") {
      resumeDevLog("PROFILE MAPPING", "Snapshot upsert failed", upsertError.message)
      // Still return draft to the client even if snapshot failed
    }

    // Merge draft into a profile-shaped response for backwards-compatible clients,
    // but keep DB structured columns untouched (reload existing + overlay draft fields).
    const profileForClient = {
      ...existing,
      ...draft,
      id: userId,
      cv_text: cvText,
      profile_reviewed_at: existing.profile_reviewed_at,
      extracted_cv: snapshot,
      extracted_cv_prompt_version: promptVersion,
    }

    return {
      ok: true,
      profile: profileForClient,
      draft,
      parsed,
      extracted: true,
      prompt_version: promptVersion,
      model: parsed.meta.model ?? "",
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction CV échouée"
    resumeDevLog("CV PARSER", message)
    return {
      ok: false,
      profile: existing,
      draft: null,
      parsed: null,
      extracted: false,
      error: message,
    }
  }
}
