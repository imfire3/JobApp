let unreachableUntil = 0;

export function markSupabaseUnreachable(ttlMs = 60_000) {
  unreachableUntil = Date.now() + ttlMs;
}

export function isSupabaseMarkedUnreachable() {
  return Date.now() < unreachableUntil;
}

export function resetSupabaseReachabilityForTests() {
  unreachableUntil = 0;
}
