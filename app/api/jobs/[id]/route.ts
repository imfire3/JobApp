import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { toJobViewModel } from "@/lib/jobs/mapper";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/jobs/[id] — single job for the authenticated user
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, user, error: authError, unreachable } =
    await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }
  if (unreachable) {
    return NextResponse.json(
      { error: authError ?? "Supabase is unreachable" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*, tracked_searches(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const tracked = data.tracked_searches as { name?: string } | null;
  return NextResponse.json({
    job: {
      ...toJobViewModel(data),
      tracked_search_name: tracked?.name ?? null,
    },
  });
}
