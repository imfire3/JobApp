import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

export function createClient() {
  const { url, anonKey } = assertSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    global: {
      fetch: supabaseFetch,
    },
  });
}
