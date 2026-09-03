import { createClient } from "@supabase/supabase-js";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

/**
 * Service-role client for server routes when using local-auth.
 * Bypasses RLS; never import this into client components.
 */
export function createServiceClient() {
  const { url } = assertSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (required for local-auth + Supabase)."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: supabaseFetch,
    },
  });
}

export function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
