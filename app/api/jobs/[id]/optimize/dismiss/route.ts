import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const bodySchema = z.object({
  proposal_id: z.string().min(1),
  cv_hash: z.string().min(1).optional(),
  job_hash: z.string().min(1).optional(),
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
  const dismissed = Array.isArray(jobFit.cv_optimize_dismissed)
    ? (jobFit.cv_optimize_dismissed as Array<Record<string, unknown>>)
    : [];

  dismissed.push({
    proposal_id: body.proposal_id,
    cv_hash: body.cv_hash || null,
    job_hash: body.job_hash || null,
    dismissed_at: new Date().toISOString(),
  });

  const nextJobFit = { ...jobFit, cv_optimize_dismissed: dismissed.slice(-200) };
  await supabase
    .from("jobs")
    .update({ raw_data: { ...rawData, job_fit: nextJobFit }, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
