import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

export async function createClient() {
  const { url, anonKey } = assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can fail in Server Components; middleware handles refresh.
        }
      },
    },
    global: {
      fetch: supabaseFetch,
    },
  });
}
