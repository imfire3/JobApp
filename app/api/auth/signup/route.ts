import { NextResponse } from "next/server"
import { z } from "zod"
import {
  isSelfSignupAllowed,
  SELF_SIGNUP_CLOSED_MESSAGE,
} from "@/lib/auth/self-signup"
import {
  createSessionToken,
  getAuthSecret,
  getSessionCookieOptions,
  registerLocalUser,
  SESSION_COOKIE,
} from "@/lib/local-auth"
import {
  getOnboardingCookieOptions,
  ONBOARDING_COOKIE,
} from "@/lib/onboarding/cookie"
import { ensureLocalAuthUserInSupabase } from "@/lib/supabase/ensure-local-user"

const signupSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
})

/** Local self-signup only — closed on Vercel (demo request flow). */
export async function POST(request: Request) {
  if (!isSelfSignupAllowed()) {
    return NextResponse.json(
      { error: SELF_SIGNUP_CLOSED_MESSAGE },
      { status: 403 }
    )
  }

  let body: z.infer<typeof signupSchema>
  try {
    body = signupSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Requête invalide" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const identifier = (body.identifier ?? body.email ?? "").trim()
  const result = registerLocalUser(identifier, body.password)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.includes("already exists") ? 409 : 400 }
    )
  }

  await ensureLocalAuthUserInSupabase(result.user)

  const response = NextResponse.json({ user: result.user })
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(result.user, getAuthSecret()),
    getSessionCookieOptions()
  )
  response.cookies.set(
    ONBOARDING_COOKIE,
    "pending",
    getOnboardingCookieOptions()
  )
  return response
}
