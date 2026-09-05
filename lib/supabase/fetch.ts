import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clearSupabaseUnreachable,
  isSupabaseMarkedUnreachable,
  markSupabaseUnreachable,
} from "@/lib/supabase/reachability";

const FETCH_TIMEOUT_MS = 8_000;

function isCallerAbortError(error: unknown, callerSignal?: AbortSignal | null) {
  if (!callerSignal?.aborted) return false;
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
}

export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (isSupabaseMarkedUnreachable()) {
    throw new TypeError("Failed to fetch");
  }

  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;

  try {
    const response = await fetch(input, { ...init, signal });
    clearSupabaseUnreachable();
    return response;
  } catch (error) {
    // Caller cancelled the request — do not treat Supabase as down.
    if (isCallerAbortError(error, init?.signal)) {
      throw error;
    }
    markSupabaseUnreachable();
    throw error;
  }
}

/** Health probe that can recover after a transient outage. */
export async function isSupabaseReachable() {
  if (!isSupabaseConfigured()) return false;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      markSupabaseUnreachable();
      return false;
    }
    clearSupabaseUnreachable();
    return true;
  } catch {
    markSupabaseUnreachable();
    return false;
  }
}
