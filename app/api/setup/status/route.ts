import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export async function GET() {
  const configured = isSupabaseConfigured();

  return NextResponse.json({
    configured,
    message: configured
      ? "Supabase credentials detected."
      : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev.",
  });
}
