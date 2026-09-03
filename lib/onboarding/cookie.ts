export const ONBOARDING_COOKIE = "jobapp_onboarding";
export type OnboardingCookieValue = "pending" | "done";

export function getOnboardingCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };
}
