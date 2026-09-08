import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import {
  candidateProfileUpdateSchema,
  preferredContractsFromAiPreferences,
} from "@/lib/profile/schema"
import { loadCandidateProfile } from "@/lib/profile/extract-service"

/**
 * GET /api/profile — CV context + structured candidate profile
 */
export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const profile = await loadCandidateProfile(supabase, user.id)
    return NextResponse.json({ profile })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Failed to load profile"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PUT /api/profile — save CV and/or structured candidate fields */
export async function PUT(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  let body: ReturnType<typeof candidateProfileUpdateSchema.parse>
  try {
    body = candidateProfileUpdateSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (body.cv_text !== undefined) {
    const { error } = await supabase.from("cv_contexts").upsert(
      {
        id: user.id,
        cv_text: body.cv_text,
      },
      { onConflict: "id" }
    )

    if (error) {
      const hint = /cv_contexts_id_fkey|foreign key/i.test(error.message)
        ? " Local admin missing in auth.users — re-login or run supabase/bootstrap_local_admin.sql."
        : ""
      return NextResponse.json({ error: `${error.message}${hint}` }, { status: 500 })
    }
  }

  const hasProfileFields =
    body.first_name !== undefined ||
    body.last_name !== undefined ||
    body.contact_email !== undefined ||
    body.phone !== undefined ||
    body.date_of_birth !== undefined ||
    body.current_city !== undefined ||
    body.current_title !== undefined ||
    body.linkedin_url !== undefined ||
    body.github_url !== undefined ||
    body.website_url !== undefined ||
    body.skills !== undefined ||
    body.experience_entries !== undefined ||
    body.education_entries !== undefined ||
    body.language_entries !== undefined ||
    body.target_roles !== undefined ||
    body.target_locations !== undefined ||
    body.desired_salary !== undefined ||
    body.remote_preference !== undefined ||
    body.preferred_contract_types !== undefined ||
    body.profile_reviewed !== undefined ||
    body.extracted_cv !== undefined ||
    body.extracted_cv_prompt_version !== undefined

  if (hasProfileFields) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("ai_preferences,target_roles,target_locations")
      .eq("id", user.id)
      .maybeSingle()

    const existingAi =
      existing?.ai_preferences && typeof existing.ai_preferences === "object"
        ? (existing.ai_preferences as Record<string, unknown>)
        : {}

    const nextContracts =
      body.preferred_contract_types ??
      preferredContractsFromAiPreferences(existingAi)

    const upsertPayload: Record<string, unknown> = {
      id: user.id,
    }

    if (body.first_name !== undefined) upsertPayload.first_name = body.first_name
    if (body.last_name !== undefined) upsertPayload.last_name = body.last_name
    if (body.contact_email !== undefined) {
      upsertPayload.contact_email = body.contact_email
    }
    if (body.phone !== undefined) upsertPayload.phone = body.phone
    if (body.date_of_birth !== undefined) {
      upsertPayload.date_of_birth = body.date_of_birth
    }
    if (body.current_city !== undefined) upsertPayload.current_city = body.current_city
    if (body.current_title !== undefined) {
      upsertPayload.current_title = body.current_title
    }
    if (body.linkedin_url !== undefined) upsertPayload.linkedin_url = body.linkedin_url
    if (body.github_url !== undefined) upsertPayload.github_url = body.github_url
    if (body.website_url !== undefined) upsertPayload.website_url = body.website_url
    if (body.skills !== undefined) {
      upsertPayload.skills = body.skills
      upsertPayload.keywords = body.skills
    }
    if (body.experience_entries !== undefined) {
      upsertPayload.experience_entries = body.experience_entries
    }
    if (body.education_entries !== undefined) {
      upsertPayload.education_entries = body.education_entries
      upsertPayload.education = body.education_entries.map((entry) =>
        [entry.name, entry.school].filter(Boolean).join(" — ")
      )
    }
    if (body.language_entries !== undefined) {
      upsertPayload.language_entries = body.language_entries
      upsertPayload.languages = body.language_entries.map((entry) => entry.language)
    }
    if (body.target_roles !== undefined) {
      upsertPayload.target_roles = body.target_roles
    } else if (existing?.target_roles) {
      upsertPayload.target_roles = existing.target_roles
    }
    if (body.target_locations !== undefined) {
      upsertPayload.target_locations = body.target_locations
    } else if (existing?.target_locations) {
      upsertPayload.target_locations = existing.target_locations
    }
    if (body.desired_salary !== undefined) {
      upsertPayload.desired_salary = body.desired_salary
    }
    if (body.remote_preference !== undefined) {
      upsertPayload.remote_preference = body.remote_preference
    }
    if (
      body.preferred_contract_types !== undefined ||
      body.extracted_cv !== undefined
    ) {
      upsertPayload.ai_preferences = {
        ...existingAi,
        preferred_contract_types: nextContracts,
      }
    }
    if (body.extracted_cv !== undefined) {
      upsertPayload.extracted_cv = body.extracted_cv
    }
    if (body.extracted_cv_prompt_version !== undefined) {
      upsertPayload.extracted_cv_prompt_version = body.extracted_cv_prompt_version
    }
    if (body.profile_reviewed === true) {
      upsertPayload.profile_reviewed_at = new Date().toISOString()
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(upsertPayload, { onConflict: "id" })

    if (profileError && profileError.code !== "42P01" && profileError.code !== "42703") {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
  }

  try {
    const profile = await loadCandidateProfile(supabase, user.id)
    return NextResponse.json({ profile })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Failed to load profile"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
