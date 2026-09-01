import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getJobCollectionModeLabel, runJobCollectionForTarget } from "@/lib/sync/job-collection";

/**
 * POST /api/tracked-searches/[searchId]/run
 * Run one tracked search through external connectors (mock or Apify).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data: trackedSearch, error: searchError } = await supabase
    .from("tracked_searches")
    .select("id,name,enabled")
    .eq("id", searchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (searchError) {
    return NextResponse.json({ error: searchError.message }, { status: 500 });
  }
  if (!trackedSearch) {
    return NextResponse.json({ error: "Tracked search not found" }, { status: 404 });
  }

  try {
    const result = await runJobCollectionForTarget(supabase, user.id, {
      trackedSearchId: searchId,
    });

    return NextResponse.json({
      message: `Sync finished for "${trackedSearch.name}"`,
      mode: getJobCollectionModeLabel(),
      tracked_search_id: searchId,
      ...result,
    });
  } catch (syncError) {
    return NextResponse.json(
      {
        error: syncError instanceof Error ? syncError.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
