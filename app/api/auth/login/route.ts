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
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ONBOARDING_COOKIE,
  getOnboardingCookieOptions,
} from "@/lib/onboarding/cookie";

const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1),
});

async function loginWithSupabase(email: string, password: string) {
  if (!z.email().safeParse(email).success || password.length < 8) {
    return NextResponse.json({ error: "Adresse e-mail ou mot de passe incorrect" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !user) {
    const limited = error?.status === 429;
    const notConfirmed =
      error?.code === "email_not_confirmed" ||
      (error?.message ?? "").toLowerCase().includes("not confirmed");
    return NextResponse.json({
      error: limited
        ? "Trop de tentatives. Réessaie dans quelques instants."
        : notConfirmed
          ? "Ton adresse e-mail n’est pas encore confirmée. Ouvre le lien reçu ou renvoie l’e-mail de confirmation."
          : "Adresse e-mail ou mot de passe incorrect",
      code: notConfirmed ? "email_not_confirmed" : undefined,
    }, { status: limited ? 429 : notConfirmed ? 403 : 401 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  const response = NextResponse.json({ user: { id: user.id, email: user.email } }, {
    headers: { "Cache-Control": "private, no-store" },
  });
  response.cookies.set(ONBOARDING_COOKIE, settings?.onboarding_completed ? "done" : "pending", getOnboardingCookieOptions());
  return response;
}

export async function POST(request: Request) {
  let body: z.infer<typeof loginSchema>;
  try {
    body = loginSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const identifier = (body.identifier ?? body.email ?? "").trim();
  if (process.env.NODE_ENV === "production") {
    return loginWithSupabase(identifier, body.password);
  }

  const result = authenticateLocalUser(identifier, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Best-effort: seed auth.users so cv_contexts / jobs FK succeed after login
  await ensureLocalAuthUserInSupabase(result.user, undefined, {});

  let onboardingCookieValue: "pending" | "done" = "pending";
  try {
    const supabase = createServiceClient();
    const { data: settings } = await supabase
      .from("user_settings")
      .select("onboarding_completed")
      .eq("id", result.user.id)
      .maybeSingle();
    if (settings?.onboarding_completed === true) {
      onboardingCookieValue = "done";
    }
  } catch {
    // If DB check fails, default to pending (will auto-complete via /api/onboarding)
  }

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(result.user, getAuthSecret()),
    getSessionCookieOptions()
  );
  response.cookies.set(ONBOARDING_COOKIE, onboardingCookieValue, getOnboardingCookieOptions());
  return response;
}
