import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateLocalUser,
  createSessionToken,
  getAuthSecret,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/local-auth";
import { ensureLocalAuthUserInSupabase } from "@/lib/supabase/ensure-local-user";
import {
  ONBOARDING_COOKIE,
  getOnboardingCookieOptions,
} from "@/lib/onboarding/cookie";

const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof loginSchema>;
  try {
    body = loginSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const identifier = (body.identifier ?? body.email ?? "").trim();
  const result = authenticateLocalUser(identifier, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Best-effort: seed auth.users so cv_contexts / jobs FK succeed after login
  await ensureLocalAuthUserInSupabase(result.user);

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(result.user, getAuthSecret()),
    getSessionCookieOptions()
  );
  // Pending until /api/onboarding auto-completes (existing CV) or user finishes wizard
  response.cookies.set(ONBOARDING_COOKIE, "pending", getOnboardingCookieOptions());
  return response;
}
