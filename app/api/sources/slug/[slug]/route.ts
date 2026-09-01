import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data: source, error: sourceError } = await supabase
    .from("job_sources")
    .select("*")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single();

  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 404 });

  const [{ data: searches }, { data: runs }] = await Promise.all([
    supabase
      .from("source_searches")
      .select("*")
      .eq("source_id", source.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sync_logs")
      .select("*")
      .eq("source_id", source.id)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({ source, searches: searches ?? [], sync_runs: runs ?? [] });
}
