import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { toJobViewModel } from "@/lib/jobs/mapper";
import { analyzeJobMatch } from "@/lib/openai/client";

const bodySchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * POST /api/analyze-job
 * Compares a job description with the user's CV and target roles via OpenAI.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", body.jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("cv_contexts")
    .select("cv_text")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.cv_text) {
    return NextResponse.json(
      { error: "Please add your CV in Settings before analyzing jobs" },
      { status: 400 }
    );
  }

  try {
    const view = toJobViewModel(job);
    const analysis = await analyzeJobMatch({
      cvText: profile.cv_text,
      targetRoles: [],
      targetLocations: [],
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description ?? "",
      location: view.location ?? undefined,
      remote: view.remote,
    });

    const { data: updated, error: updateError } = await supabase
      .from("jobs")
      .update({
        ai_match_score: analysis.match_score,
        ai_strengths: analysis.match_reasons,
        ai_gaps: analysis.match_gaps,
        match_score: analysis.match_score,
        match_reasons: analysis.match_reasons,
        match_gaps: analysis.match_gaps,
        cover_letter_angle: analysis.cover_letter_angle,
      })
      .eq("id", job.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ analysis, job: toJobViewModel(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
