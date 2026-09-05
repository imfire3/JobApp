let unreachableUntil = 0;

export function markSupabaseUnreachable(ttlMs = 15_000) {
  unreachableUntil = Date.now() + ttlMs;
}

export function clearSupabaseUnreachable() {
  unreachableUntil = 0;
}

export function isSupabaseMarkedUnreachable() {
  return Date.now() < unreachableUntil;
}

export function resetSupabaseReachabilityForTests() {
  unreachableUntil = 0;
}
