import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { buildNextSyncAt } from "@/lib/sources/utils";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  status: z.enum(["connected", "not_configured", "error"]).optional(),
  sync_schedule: z.string().optional(),
  sync_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data: source, error: sourceError } = await supabase
    .from("job_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .single();
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 404 });

  const [{ data: searches }, { data: runs }] = await Promise.all([
    supabase
      .from("source_searches")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sync_logs")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({ source, searches: searches ?? [], sync_runs: runs ?? [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...payload };
  if (payload.sync_time) {
    updates.next_sync_at = buildNextSyncAt(payload.sync_time);
  }

  const { data, error: updateError } = await supabase
    .from("job_sources")
    .update(updates)
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ source: data });
}
