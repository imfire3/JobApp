import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { runTrackedSyncForTarget, runTrackedSyncForUser } from "@/lib/sync/tracked-search-sync";

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    try {
      const fallback = await runTrackedSyncForUser();
      return NextResponse.json({
        message: "Daily sync completed for current authenticated user",
        mode: "user",
        ...fallback,
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
  let totalImported = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const user of usersData.users) {
    try {
      const result = await runTrackedSyncForTarget(admin as never, user.id);
      usersProcessed += 1;
      totalImported += result.imported;
      totalSkipped += result.skipped;
      errors.push(...result.errors.map((e) => `[${user.email ?? user.id}] ${e}`));
    } catch (error) {
      errors.push(`[${user.email ?? user.id}] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({
    message: "Daily sync completed",
    mode: "service-role",
    users_processed: usersProcessed,
    imported: totalImported,
    skipped: totalSkipped,
    errors,
  });
}
