import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { LOCAL_ADMIN_ID, type LocalUser } from "@/lib/local-auth";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/admin";

/** In-memory cache so we don't hit Auth Admin on every request. */
const ensuredUserIds = new Set<string>();

export function isEmailTakenError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("email address has already") ||
    normalized.includes("user already exists")
  );
}

function localAuthEmail(user: LocalUser) {
  return user.email?.trim() || `${user.id}@local.jobapp`;
}

/** Unique fallback so createUser never fails on email uniqueness. */
function syntheticLocalEmail(userId: string) {
  return `local-${userId.replace(/-/g, "")}@jobapp.internal`;
}

function localAuthPassword(user: LocalUser) {
  return user.id === LOCAL_ADMIN_ID ? "admin" : `${randomUUID()}Aa1!`;
}

async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return null;

    const match = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function createAuthUserForLocalSession(
  supabase: SupabaseClient,
  user: LocalUser
): Promise<{ ok: true } | { ok: false; error: string }> {
  const preferredEmail = localAuthEmail(user);
  const password = localAuthPassword(user);

  const { error: createError } = await supabase.auth.admin.createUser({
    id: user.id,
    email: preferredEmail,
    password,
    email_confirm: true,
    user_metadata: { local_auth: true, preferred_email: preferredEmail },
  });

  if (!createError) return { ok: true };

  const { data: byId } = await supabase.auth.admin.getUserById(user.id);
  if (byId?.user) return { ok: true };

  if (!isEmailTakenError(createError.message)) {
    return {
      ok: false,
      error: `Cannot create auth user for local session: ${createError.message}. You can also run supabase/bootstrap_local_admin.sql in the SQL Editor.`,
    };
  }

  // Email already used by another auth user — keep the fixed local id with a
  // synthetic email so FK rows (cv_contexts, jobs, …) still resolve.
  const existingByEmail = await findAuthUserByEmail(supabase, preferredEmail);
  if (existingByEmail?.id === user.id) {
    return { ok: true };
  }

  const { error: retryError } = await supabase.auth.admin.createUser({
    id: user.id,
    email: syntheticLocalEmail(user.id),
    password,
    email_confirm: true,
    user_metadata: {
      local_auth: true,
      preferred_email: preferredEmail,
    },
  });

  if (retryError) {
    const { data: again } = await supabase.auth.admin.getUserById(user.id);
    if (again?.user) return { ok: true };

    return {
      ok: false,
      error: `Cannot create auth user for local session: ${retryError.message}. You can also run supabase/bootstrap_local_admin.sql in the SQL Editor.`,
    };
  }

  return { ok: true };
}

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
      const created = await createAuthUserForLocalSession(supabase, user);
      if (!created.ok) return created;
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

/** Test helper */
export function __resetEnsuredLocalUsersForTests() {
  ensuredUserIds.clear();
}
