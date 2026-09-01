import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureUserSources } from "@/lib/sources/bootstrap";

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  await ensureUserSources(supabase, user.id);

  const { data: sources, error: sourcesError } = await supabase
    .from("job_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (sourcesError) {
    return NextResponse.json({ error: sourcesError.message }, { status: 500 });
  }

  const sourceIds = (sources ?? []).map((s) => s.id);
  const { data: searches } = await supabase
    .from("source_searches")
    .select("id,source_id")
    .eq("user_id", user.id)
    .in("source_id", sourceIds.length ? sourceIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: lastRuns } = await supabase
    .from("sync_logs")
    .select("source_id,status,started_at,error_message")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const searchCountBySource = new Map<string, number>();
  for (const search of searches ?? []) {
    const count = searchCountBySource.get(search.source_id) ?? 0;
    searchCountBySource.set(search.source_id, count + 1);
  }

  const runBySource = new Map<string, { status: string; started_at: string; error_message: string | null }>();
  for (const run of lastRuns ?? []) {
    if (!runBySource.has(run.source_id)) {
      runBySource.set(run.source_id, run);
    }
  }

  return NextResponse.json({
    sources: (sources ?? []).map((source) => ({
      ...source,
      searches_count: searchCountBySource.get(source.id) ?? 0,
      latest_run: runBySource.get(source.id) ?? null,
    })),
  });
}
