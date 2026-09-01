import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getJobCollectionModeLabel, runJobCollectionForTarget } from "@/lib/sync/job-collection";

/**
 * POST /api/tracked-searches/run-all
 * Sync all enabled tracked searches for the current user.
 */
export async function POST() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const result = await runJobCollectionForTarget(supabase, user.id);
    return NextResponse.json({
      message: "All enabled tracked searches synced",
      mode: getJobCollectionModeLabel(),
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
