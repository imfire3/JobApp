import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthSecret,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/local-auth";

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

function getLocalUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getAuthSecret());
}

export async function updateSession(request: NextRequest) {
  const localUser = getLocalUser(request);
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  if (localUser) {
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (!isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
