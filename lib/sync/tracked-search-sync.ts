import { getAuthenticatedUser } from "@/lib/auth";
import {
  runJobCollectionForTarget,
  runJobCollectionForUser,
  type JobCollectionResult,
  type JobCollectionScope,
} from "@/lib/sync/job-collection";

/** @deprecated Use JobCollectionResult from lib/sync/job-collection */
export type TrackedSyncResult = JobCollectionResult & { skipped: number };

type SyncScope = JobCollectionScope & { sourceId?: string };

function toLegacyResult(result: JobCollectionResult): TrackedSyncResult {
  return {
    ...result,
    skipped: result.duplicates,
  };
}

export async function runTrackedSyncForUser(scope?: SyncScope): Promise<TrackedSyncResult> {
  const { trackedSearchId } = scope ?? {};
  const result = await runJobCollectionForUser({ trackedSearchId });
  return toLegacyResult(result);
}

export async function runTrackedSyncForTarget(
  supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"],
  userId: string,
  scope?: SyncScope
): Promise<TrackedSyncResult> {
  const { trackedSearchId } = scope ?? {};
  const result = await runJobCollectionForTarget(supabase, userId, { trackedSearchId });
  return toLegacyResult(result);
}
