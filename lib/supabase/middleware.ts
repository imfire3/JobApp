import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthSecret,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/local-auth";
import { ONBOARDING_COOKIE } from "@/lib/onboarding/cookie";

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/setup/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/sync-jobs"
  );
}

function isOnboardingAllowed(pathname: string) {
  return (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api/onboarding") ||
    pathname.startsWith("/api/profile") ||
    pathname.startsWith("/api/tracked-searches") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/auth")
  );
}

function getLocalUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getAuthSecret());
}

export async function updateSession(request: NextRequest) {
  const localUser = getLocalUser(request);
  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE)?.value;
  const onboardingDone = onboardingCookie === "done";
  // Missing cookie = treat as pending for new signups; existing sessions without
  // cookie can still hit /api/onboarding which may auto-complete.
  const onboardingPending = !onboardingDone;

  if (localUser) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      if (onboardingDone) {
        url.pathname = "/dashboard";
      } else {
        url.pathname = "/login";
        url.searchParams.set("cv", "1");
      }
      return NextResponse.redirect(url);
    }

    if (isAuthRoute) {
      if (onboardingDone) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      // Pending: stay on login/signup to import CV on the same page
      return NextResponse.next({ request });
    }

    if (onboardingPending && !isOnboardingAllowed(pathname) && !isPublicRoute(pathname)) {
      const url = request.nextUrl.clone();
      // Resume onboarding: API keys page gates to CV as needed, then dashboard
      url.pathname = "/onboarding/api-keys";
      return NextResponse.redirect(url);
    }

    if (onboardingDone && pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  if (!isPublicRoute(pathname)) {
    // API clients must get JSON, not an HTML login redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
