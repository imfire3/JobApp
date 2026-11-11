import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const bodySchema = z.object({
  question_id: z.string().min(1),
  answer: z.enum(["yes", "no", "unknown"]),
  detail: z.string().max(4000).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (body.answer === "yes" && !body.detail?.trim()) {
    return NextResponse.json(
      { error: "Ajoute un exemple pour préciser cette expérience." },
      { status: 400 },
    );
  }

  const { id: jobId } = await params;

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, user_id, raw_data")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const rawData = (job.raw_data && typeof job.raw_data === "object" && !Array.isArray(job.raw_data)
    ? (job.raw_data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const jobFit = (rawData.job_fit && typeof rawData.job_fit === "object" && !Array.isArray(rawData.job_fit)
    ? (rawData.job_fit as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const optimize = (jobFit.optimize && typeof jobFit.optimize === "object" && !Array.isArray(jobFit.optimize)
    ? (jobFit.optimize as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const answers = (optimize.answers && typeof optimize.answers === "object" && !Array.isArray(optimize.answers)
    ? (optimize.answers as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  answers[body.question_id] = {
    answer: body.answer,
    detail: body.detail?.trim() || null,
    answered_at: new Date().toISOString(),
  };

  const nextOptimize = { ...optimize, answers };
  const nextJobFit = { ...jobFit, optimize: nextOptimize };
  await supabase
    .from("jobs")
    .update({ raw_data: { ...rawData, job_fit: nextJobFit }, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, question_id: body.question_id, answer: body.answer });
}
