import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { supabase, user: null, error: error?.message ?? "Unauthorized" };
    }

    return { supabase, user, error: null };
  } catch (error) {
    return {
      supabase: null as never,
      user: null,
      error:
        error instanceof Error
          ? error.message
          : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    };
  }
}
