import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/local-auth";
import {
  ONBOARDING_COOKIE,
  getOnboardingCookieOptions,
} from "@/lib/onboarding/cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });
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
