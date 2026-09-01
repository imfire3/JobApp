import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  CvAnalysisError,
  getLatestCvAnalysis,
  runCvAnalysis,
} from "@/lib/cv-analysis/service";

/**
 * GET /api/profile/analyze-cv — fetch latest CV analysis (with stale flag)
 * POST /api/profile/analyze-cv — run ATS-oriented analysis on saved CV text
 */
export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  try {
    const result = await getLatestCvAnalysis(supabase, user.id);
    return NextResponse.json({ analysis: result });
  } catch (error) {
    if (error instanceof CvAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to load analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  try {
    const result = await runCvAnalysis(supabase, user.id);
    return NextResponse.json({ analysis: result });
  } catch (error) {
    if (error instanceof CvAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "CV analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
