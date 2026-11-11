import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/local-auth";
import { createClient } from "@/lib/supabase/server";
import {
  ONBOARDING_COOKIE,
  getOnboardingCookieOptions,
} from "@/lib/onboarding/cookie";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return NextResponse.json({ error: "Déconnexion impossible" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  const clear = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
  response.cookies.set(SESSION_COOKIE, "", clear);
  response.cookies.set(ONBOARDING_COOKIE, "", {
    ...getOnboardingCookieOptions(),
    maxAge: 0,
  });
  return response;
}
