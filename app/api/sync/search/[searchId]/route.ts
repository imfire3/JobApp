import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { runTrackedSyncForTarget } from "@/lib/sync/tracked-search-sync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const result = await runTrackedSyncForTarget(supabase, user.id, {
    trackedSearchId: searchId,
  });
  return NextResponse.json({ message: "Search test sync finished", ...result });
}
