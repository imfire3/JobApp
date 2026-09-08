import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthenticatedUser } from "@/lib/auth"
import { runCvProfileExtraction } from "@/lib/profile/extract-service"

const bodySchema = z
  .object({
    force: z.boolean().optional(),
  })
  .optional()

/**
 * POST /api/profile/extract
 * Parse CV text → ParsedResume + profileDraft.
 * Persists extracted_cv snapshot only — structured columns are written on PUT /api/profile.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError, unreachable } = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }
  if (unreachable) {
    return NextResponse.json(
      {
        error:
          authError ??
          "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL, then retry.",
      },
      { status: 503 }
    )
  }

  let force = false
  try {
    const json = await request.json().catch(() => ({}))
    const body = bodySchema.parse(json) ?? {}
    force = body.force === true
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const result = await runCvProfileExtraction(supabase, user.id, { force })
    if (!result.ok) {
      return NextResponse.json(
        {
          profile: result.profile,
          draft: result.draft,
          parsed: result.parsed,
          extracted: false,
          error: result.error,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      profile: result.profile,
      draft: result.draft,
      parsed: result.parsed,
      extracted: result.extracted,
      prompt_version: result.prompt_version,
      model: result.model,
    })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "CV extract failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
