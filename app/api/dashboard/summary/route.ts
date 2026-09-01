import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { mapJobRows } from "@/lib/jobs/mapper";

export async function GET() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const [{ data: jobs, error: jobsError }, { data: sources, error: sourcesError }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("published_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("job_sources")
      .select("*")
      .eq("user_id", user.id),
  ]);

  if (jobsError) {
    if (jobsError.code === "42P01") {
      return NextResponse.json({
        jobs: [],
        sources: [],
        active_connectors: 0,
        ai_recommendations: buildAiRecommendations([]),
        recent_activity: [],
        last_sync_time: null,
        next_sync_time: null,
        source_health: {
          connected: 0,
          notConfigured: 0,
          error: 0,
        },
      });
    }
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  if (sourcesError) {
    return NextResponse.json({
      jobs: jobs ?? [],
      sources: [],
      active_connectors: 0,
      ai_recommendations: [],
      recent_activity: [],
      last_sync_time: null,
      next_sync_time: null,
      source_health: {
        connected: 0,
        notConfigured: 0,
        error: 0,
      },
    });
  }

  const sortedSources = [...(sources ?? [])].sort((a, b) => {
    const aTime = a.last_sync_at ? new Date(a.last_sync_at).getTime() : 0;
    const bTime = b.last_sync_at ? new Date(b.last_sync_at).getTime() : 0;
    return bTime - aTime;
  });

  const { data: activities } = await supabase
    .from("sync_logs")
    .select("source_id,phase,message,started_at,jobs_found,jobs_imported")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(8);

  const sourceNameById = new Map((sources ?? []).map((s) => [s.id, s.name]));

  const mappedJobs = mapJobRows(jobs ?? []);
  const aiRecommendations = buildAiRecommendations(mappedJobs);

  return NextResponse.json({
    jobs: mappedJobs,
    sources: sources ?? [],
    active_connectors: (sources ?? []).filter((s) => s.enabled).length,
    ai_recommendations: aiRecommendations,
    recent_activity: (activities ?? []).map((item) => ({
      time: item.started_at,
      label: sourceNameById.get(item.source_id) ?? "Connector",
      message:
        item.message ??
        `${item.jobs_found ?? 0} found, ${item.jobs_imported ?? 0} imported`,
      phase: item.phase ?? "completed",
    })),
    last_sync_time: sortedSources[0]?.last_sync_at ?? null,
    next_sync_time: sortedSources
      .map((s) => s.next_sync_at)
      .filter(Boolean)
      .sort()[0] ?? null,
    source_health: {
      connected: (sources ?? []).filter((s) => s.status === "connected").length,
      notConfigured: (sources ?? []).filter((s) => s.status === "not_configured").length,
      error: (sources ?? []).filter((s) => s.status === "error").length,
    },
  });
}

function buildAiRecommendations(
  jobs: Array<{
    title: string;
    company: string;
    match_score: number | null;
    status: string;
  }>
) {
  const highScore = jobs
    .filter((job) => (job.match_score ?? 0) >= 80 && job.status !== "applied")
    .slice(0, 3)
    .map((job) => `Prioritize ${job.title} at ${job.company} (${job.match_score}% match)`);

  if (highScore.length > 0) return highScore;
  return [
    "Run a sync now to refresh opportunities.",
    "Upload/update your CV to improve AI match quality.",
    "Select 3 strong jobs and generate cover letters in bulk.",
  ];
}
