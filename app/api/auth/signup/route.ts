import { NextResponse } from "next/server"
import { z } from "zod"
import {
  isHostedSignupEnabled,
  isSelfSignupAllowed,
  SIGNUP_CLOSED_MESSAGE,
} from "@/lib/auth/self-signup"
import { PASSWORD_RULES } from "@/lib/auth/password-rules"
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
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

const signupSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().superRefine((value, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(value)) {
        ctx.addIssue({ code: "custom", message: rule.error })
      }
    }
  }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().optional(),
})

function emailFromBody(body: z.infer<typeof signupSchema>) {
  return (body.email ?? body.identifier ?? "").trim()
}

function mapSupabaseSignupError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes("already registered")) {
    return {
      status: 409,
      error:
        "Un compte existe déjà avec cette adresse. Connecte-toi ou utilise la récupération de mot de passe.",
    }
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return {
      status: 429,
      error: "Trop de tentatives. Réessaie dans quelques minutes.",
    }
  }
  return { status: 400, error: message || "Inscription impossible" }
}

/**
 * Hosted signup (Supabase Auth): creates the account and sends the address
 * confirmation e-mail. The session is only created after the candidate clicks
 * the confirmation link, which then lands on /auth/callback.
 */
async function signupWithSupabase(
  request: Request,
  body: z.infer<typeof signupSchema>
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Configuration Supabase incomplète (URL et clé anon)." },
      { status: 503 }
    )
  }

  const email = emailFromBody(body)
  if (!z.email().safeParse(email).success) {
    return NextResponse.json({ error: "Adresse e-mail invalide" }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const next = encodeURIComponent("/login?cv=1&confirmed=1")
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: body.password,
    options: {
      data: {
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${next}`,
    },
  })

  if (error) {
    const mapped = mapSupabaseSignupError(error.message)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }

  // When "Confirm email" is disabled in Supabase, a session is returned
  // immediately. Keep the same onboarding contract as the local flow.
  if (data.session) {
    const response = NextResponse.json({
      user: { id: data.user?.id, email: data.user?.email },
      confirmed: true,
    })
    response.cookies.set(ONBOARDING_COOKIE, "pending", getOnboardingCookieOptions())
    return response
  }

  return NextResponse.json({
    confirmation_required: true,
    email,
    message:
      "Compte créé. Ouvre le lien de confirmation envoyé par e-mail, puis importe ton CV.",
  })
}

export async function POST(request: Request) {
  if (!isSelfSignupAllowed() && !isHostedSignupEnabled()) {
    return NextResponse.json({ error: SIGNUP_CLOSED_MESSAGE }, { status: 403 })
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

  if (process.env.NODE_ENV === "production") {
    return signupWithSupabase(request, body)
  }

  const identifier = emailFromBody(body)
  const result = registerLocalUser(identifier, body.password)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.includes("already exists") ? 409 : 400 }
    )
  }

  await ensureLocalAuthUserInSupabase(result.user, undefined, {
    first_name: body.first_name,
    last_name: body.last_name,
    date_of_birth: body.date_of_birth,
    contact_email: identifier,
  })

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
