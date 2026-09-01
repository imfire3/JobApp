export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

const PLACEHOLDER_URLS = new Set([
  "https://your-project.supabase.co",
  "http://your-project.supabase.co",
]);

const PLACEHOLDER_KEYS = new Set(["your-anon-key", "your_anon_key"]);

export function hasSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

function isValidSupabaseAnonKey(anonKey: string) {
  const key = anonKey.trim();
  // Legacy JWT anon key or newer publishable key format.
  return key.startsWith("eyJ") || key.startsWith("sb_publishable_");
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;
  if (PLACEHOLDER_URLS.has(url.trim())) return false;
  if (PLACEHOLDER_KEYS.has(anonKey.trim())) return false;
  if (!url.includes(".supabase.co")) return false;
  if (!isValidSupabaseAnonKey(anonKey)) return false;
  return true;
}

export function assertSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }
  return { url, anonKey };
}
