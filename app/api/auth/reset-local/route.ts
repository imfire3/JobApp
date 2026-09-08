import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAuthenticatedUser } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/local-auth"
import {
  ONBOARDING_COOKIE,
  getOnboardingCookieOptions,
} from "@/lib/onboarding/cookie"

/**
 * POST /api/auth/reset-local
 * Clears session + onboarding cookies and resets onboarding flags for the
 * current user (if any), so the app can return to the landing page cleanly.
 */
export async function POST() {
  const { supabase, user } = await getAuthenticatedUser()

  if (user) {
    try {
      await supabase.from("user_settings").upsert(
        {
          id: user.id,
          onboarding_completed: false,
          onboarding_completed_at: null,
        },
        { onConflict: "id" }
      )
      await supabase
        .from("profiles")
        .update({ profile_reviewed_at: null })
        .eq("id", user.id)
    } catch {
      // Best-effort: cookies still get cleared below.
    }
  }

  const response = NextResponse.json({ ok: true })
  const secure = process.env.NODE_ENV === "production"

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  })

  response.cookies.set(ONBOARDING_COOKIE, "", {
    ...getOnboardingCookieOptions(),
    maxAge: 0,
  })

  // Also clear any leftover cookie values from the request jar.
  const jar = await cookies()
  for (const cookie of jar.getAll()) {
    if (cookie.name.startsWith("jobapp_")) {
      response.cookies.set(cookie.name, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
        maxAge: 0,
      })
    }
  }

  return response
}
