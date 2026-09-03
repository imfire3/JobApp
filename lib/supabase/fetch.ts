import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isSupabaseMarkedUnreachable,
  markSupabaseUnreachable,
} from "@/lib/supabase/reachability";

const FETCH_TIMEOUT_MS = 4_000;

export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (isSupabaseMarkedUnreachable()) {
    throw new TypeError("Failed to fetch");
  }

  try {
    const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
    return await fetch(input, { ...init, signal });
  } catch (error) {
    markSupabaseUnreachable();
    throw error;
  }
}

export async function isSupabaseReachable() {
  if (!isSupabaseConfigured()) return false;
  if (isSupabaseMarkedUnreachable()) return false;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;

  try {
    await supabaseFetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    return true;
  } catch {
    return false;
  }
}
