import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/local-auth"
import { ONBOARDING_COOKIE } from "@/lib/onboarding/cookie"

function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production"
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: 0,
    expires: new Date(0),
  }

  response.cookies.set(SESSION_COOKIE, "", base)
  response.cookies.set(ONBOARDING_COOKIE, "", base)
  response.cookies.delete(SESSION_COOKIE)
  response.cookies.delete(ONBOARDING_COOKIE)
}

async function resetLocalState() {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user) return

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

/**
 * GET /api/auth/reset-local
 * Clears session and redirects to /?lp=1 so middleware forces the landing page
 * even if a stale session cookie briefly remains.
 */
export async function GET(request: Request) {
  await resetLocalState()

  const landing = new URL("/", request.url)
  landing.searchParams.set("lp", "1")
  const response = NextResponse.redirect(landing)
  clearAuthCookies(response)

  return response
}

/**
 * POST /api/auth/reset-local
 * Same clear as GET, JSON response for callers that prefer fetch.
 */
export async function POST() {
  await resetLocalState()

  const response = NextResponse.json({ ok: true, redirect: "/?lp=1" })
  clearAuthCookies(response)
  return response
}
