import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { deleteAllUserJobs } from "@/lib/imports/import-wttj-json";
import { mapJobRows, toJobViewModel } from "@/lib/jobs/mapper";
import { JOB_STATUSES } from "@/types";
import { z } from "zod";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(JOB_STATUSES).optional(),
  selected: z.boolean().optional(),
  cover_letter: z.string().optional(),
});

/**
 * GET /api/jobs — list all jobs for the authenticated user
 */
export async function GET() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*, tracked_searches(name)")
    .eq("user_id", user.id)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ jobs: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: mapJobRows(data ?? []) });
}

/**
 * PATCH /api/jobs — update job status, selection, or cover letter
 */
export async function PATCH(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.selected !== undefined) {
    updates.selected = body.selected;
    if (body.selected && body.status === undefined) {
      updates.status = "selected";
    }
    if (!body.selected && body.status === undefined) {
      updates.status = "new";
    }
  }
  if (body.cover_letter !== undefined) updates.cover_letter = body.cover_letter;

  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.cover_letter !== undefined) {
    const { error: coverLetterError } = await supabase
      .from("cover_letters")
      .upsert(
        {
          user_id: user.id,
          job_id: body.id,
          content: body.cover_letter,
        },
        { onConflict: "user_id,job_id" }
      );

    if (coverLetterError) {
      return NextResponse.json({ error: coverLetterError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ job: toJobViewModel(data) });
}

/**
 * DELETE /api/jobs — remove all jobs for the authenticated user
 */
export async function DELETE() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  try {
    const deleted = await deleteAllUserJobs(supabase, user.id);
    return NextResponse.json({ deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
