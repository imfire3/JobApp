import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth";
import { getJobCollectionModeLabel, runJobCollectionForTarget } from "@/lib/sync/job-collection";

function isAuthorizedSync(request: Request): boolean {
  const secret = process.env.JOB_SYNC_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  return bearer === `Bearer ${secret}`;
}

/**
 * POST /api/sync-jobs
 * Protected cron entrypoint — sync all enabled tracked searches.
 */
export async function POST(request: Request) {
  if (!isAuthorizedSync(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide Authorization: Bearer <JOB_SYNC_SECRET>." },
      { status: 401 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    try {
      const result = await runJobCollectionForUserScoped();
      return NextResponse.json({
        message: "Job sync completed for current authenticated user",
        mode: getJobCollectionModeLabel(),
        scope: "user",
        ...result,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Missing SUPABASE_SERVICE_ROLE_KEY and no authenticated user context",
        },
        { status: 401 }
      );
    }
  }

  const admin = createSupabaseClient(url, serviceRoleKey);
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers();
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  let usersProcessed = 0;
  let totalRuns = 0;
  let totalImported = 0;
  let totalDuplicates = 0;
  let totalIgnoredOld = 0;
  const errors: string[] = [];

  for (const user of usersData.users) {
    try {
      const result = await runJobCollectionForTarget(admin as never, user.id);
      usersProcessed += 1;
      totalRuns += result.runs;
      totalImported += result.imported;
      totalDuplicates += result.duplicates;
      totalIgnoredOld += result.ignored_old;
      errors.push(...result.errors.map((entry) => `[${user.email ?? user.id}] ${entry}`));
    } catch (error) {
      errors.push(
        `[${user.email ?? user.id}] ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return NextResponse.json({
    message: "Job sync completed",
    mode: getJobCollectionModeLabel(),
    scope: "all-users",
    users_processed: usersProcessed,
    runs: totalRuns,
    imported: totalImported,
    duplicates: totalDuplicates,
    ignored_old: totalIgnoredOld,
    errors,
  });
}

async function runJobCollectionForUserScoped() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) throw new Error(error ?? "Unauthorized");
  return runJobCollectionForTarget(supabase, user.id);
}
