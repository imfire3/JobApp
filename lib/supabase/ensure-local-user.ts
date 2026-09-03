import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LOCAL_ADMIN_ID, type LocalUser } from "@/lib/local-auth";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/admin";

/** In-memory cache so we don't hit Auth Admin on every request. */
const ensuredUserIds = new Set<string>();

/**
 * Local-auth users are not created by Supabase Auth signup.
 * Rows that FK to auth.users (cv_contexts, jobs, …) need the user to exist.
 * Idempotent: create via Admin API if missing, then seed profile + cv_contexts.
 */
export async function ensureLocalAuthUserInSupabase(
  user: LocalUser,
  client?: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ensuredUserIds.has(user.id)) {
    return { ok: true };
  }

  if (!hasServiceRoleKey()) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is required so the local admin can be created in auth.users.",
    };
  }

  const supabase = client ?? createServiceClient();

  try {
    const { data: existing } = await supabase.auth.admin.getUserById(user.id);

    if (!existing?.user) {
      const { error: createError } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email || `${user.id}@local.jobapp`,
        password: user.id === LOCAL_ADMIN_ID ? "admin" : `${randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: { local_auth: true },
      });

      if (createError) {
        const { data: again } = await supabase.auth.admin.getUserById(user.id);
        if (!again?.user) {
          return {
            ok: false,
            error: `Cannot create auth user for local session: ${createError.message}. You can also run supabase/bootstrap_local_admin.sql in the SQL Editor.`,
          };
        }
      }
    }

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        target_roles: ["Product Owner", "Product Manager"],
        target_locations: ["Paris", "remote", "hybrid"],
      },
      { onConflict: "id" }
    );

    const { error: cvError } = await supabase.from("cv_contexts").upsert(
      { id: user.id },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (cvError) {
      return {
        ok: false,
        error: `Cannot seed cv_contexts: ${cvError.message}`,
      };
    }

    ensuredUserIds.add(user.id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to ensure local auth user in Supabase",
    };
  }
}
