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
    pathname === "/api/demo-request" ||
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
    pathname.startsWith("/api/welcome") ||
    pathname.startsWith("/api/auth")
  );
}

function getLocalUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getAuthSecret());
}

function clearSessionCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";
  const cleared = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: 0,
    expires: new Date(0),
  };
  response.cookies.set(SESSION_COOKIE, "", cleared);
  response.cookies.set(ONBOARDING_COOKIE, "", cleared);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ONBOARDING_COOKIE);
}

export async function updateSession(request: NextRequest) {
  const localUser = getLocalUser(request);
  const pathname = request.nextUrl.pathname;
  const forceLanding = request.nextUrl.searchParams.get("lp") === "1";
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE)?.value;
  const onboardingDone = onboardingCookie === "done";
  // Missing cookie = treat as pending for new signups; existing sessions without
  // cookie can still hit /api/onboarding which may auto-complete.
  const onboardingPending = !onboardingDone;

  // Reset → LP: always allow the landing page and drop the session cookie.
  if (pathname === "/" && forceLanding) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lp");
    const response = NextResponse.redirect(url);
    clearSessionCookies(response);
    return response;
  }

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
      // Resume at CV step; /login?cv=1 then routes to profile once CV exists
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("cv", "1");
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
