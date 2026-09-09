import type { SupabaseClient } from "@supabase/supabase-js";

export const MISSING_OPENAI_KEY_MESSAGE =
  "L’IA n’est pas disponible pour le moment. Réessaie plus tard ou contacte le support.";

export const INVALID_OPENAI_KEY_MESSAGE =
  "L’IA n’est pas disponible pour le moment (clé serveur invalide). Réessaie plus tard.";

export const QUOTA_OPENAI_MESSAGE =
  "Quota IA temporairement dépassé. Réessaie dans quelques minutes.";

/**
 * Always use the platform OPENAI_API_KEY from the server environment.
 * User-provided keys are ignored so demo users never configure OpenAI.
 */
export function resolveOpenAIApiKey(_userKey?: string | null): string {
  const key = process.env.OPENAI_API_KEY?.trim() || "";
  if (!key) {
    throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  }
  return key;
}

/**
 * Returns the platform OpenAI key when configured.
 * Kept for call-site compatibility; no longer reads user_settings.openai_key.
 */
export async function loadUserOpenAIKey(
  _supabase: SupabaseClient,
  _userId: string
): Promise<string | null> {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function mapOpenAIError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /incorrect api key|invalid.?api.?key|401|authentication|unauthorized/i.test(
      message
    )
  ) {
    return new Error(INVALID_OPENAI_KEY_MESSAGE);
  }
  if (/insufficient.?quota|\bquota\b|billing|payment|rate.?limit/i.test(message)) {
    return new Error(QUOTA_OPENAI_MESSAGE);
  }
  return error instanceof Error ? error : new Error(message);
}
