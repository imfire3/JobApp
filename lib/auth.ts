import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createOfflineClient } from "@/lib/supabase/offline";
import { isSupabaseReachable } from "@/lib/supabase/fetch";
import {
  getAuthSecret,
  SESSION_COOKIE,
  verifySessionToken,
  type LocalUser,
} from "@/lib/local-auth";
import { ensureLocalAuthUserInSupabase } from "@/lib/supabase/ensure-local-user";

export type AppUser = LocalUser;

async function getLocalSessionUser(): Promise<LocalUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token, getAuthSecret());
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  const localUser = await getLocalSessionUser();

  if (localUser) {
    const reachable = await isSupabaseReachable();
    if (!reachable) {
      return {
        supabase: createOfflineClient() as never,
        user: localUser,
        error:
          "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL (project paused, deleted, or wrong host), then retry.",
        unreachable: true as const,
      };
    }

    try {
      // Local-auth has no Supabase JWT → service role bypasses RLS on the server.
      if (hasServiceRoleKey()) {
        const supabase = createServiceClient() as never;
        const ensured = await ensureLocalAuthUserInSupabase(localUser);
        if (!ensured.ok) {
          return {
            supabase,
            user: null,
            error: ensured.error,
            unreachable: false as const,
          };
        }
        return {
          supabase,
          user: localUser,
          error: null,
          unreachable: false as const,
        };
      }

      const supabase = await createClient();
      return {
        supabase,
        user: localUser,
        error: null,
        unreachable: false as const,
      };
    } catch (error) {
      return {
        supabase: createOfflineClient() as never,
        user: localUser,
        error:
          error instanceof Error
            ? error.message
            : "Supabase client failed to initialize. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
        unreachable: true as const,
      };
    }
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        supabase,
        user: null,
        error: error?.message ?? "Unauthorized",
        unreachable: false as const,
      };
    }

    return {
      supabase,
      user: { id: user.id, email: user.email ?? "" },
      error: null,
      unreachable: false as const,
    };
  } catch (error) {
    return {
      supabase: null as never,
      user: null,
      error:
        error instanceof Error
          ? error.message
          : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      unreachable: true as const,
    };
  }
}
