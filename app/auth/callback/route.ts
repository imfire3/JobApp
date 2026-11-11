import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function safeNext(origin: string, nextPath: string | null) {
  const fallback = new URL("/dashboard", origin);
  if (!nextPath) return fallback;
  if (!URL.canParse(nextPath, origin)) return fallback;
  const candidate = new URL(nextPath, origin);
  return candidate.origin === origin ? candidate : fallback;
}

async function handleCallback(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(origin, searchParams.get("next"));
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "lien-expire");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(next);
  } else if (tokenHash && type) {
    // Email templates configured with {{ .TokenHash }} land directly here.
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
    });
    if (!error) return NextResponse.redirect(next);
  }

  const url = new URL("/login", origin);
  url.searchParams.set("error", "lien-expire");
  return NextResponse.redirect(url);
}

/** Supabase confirmation / recovery links are opened with a GET. */
export async function GET(request: Request) {
  return handleCallback(request);
}

export async function POST(request: Request) {
  return handleCallback(request);
}
