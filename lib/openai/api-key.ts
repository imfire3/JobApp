import type { SupabaseClient } from "@supabase/supabase-js";

export const MISSING_OPENAI_KEY_MESSAGE =
  "Ajoute ta clé API OpenAI dans Réglages (compte OpenAI avec crédit disponible sur platform.openai.com).";

export const INVALID_OPENAI_KEY_MESSAGE =
  "Clé OpenAI invalide ou sans crédit. Vérifie ta clé et ton solde sur platform.openai.com.";

export const QUOTA_OPENAI_MESSAGE =
  "Quota OpenAI dépassé ou facturation inactive. Ajoute du crédit sur platform.openai.com.";

export function resolveOpenAIApiKey(userKey?: string | null): string {
  const key = userKey?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  if (!key) {
    throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  }
  return key;
}

export async function loadUserOpenAIKey(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("openai_key")
    .eq("id", userId)
    .maybeSingle();

  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw new Error(error.message);
  }

  const key = typeof data?.openai_key === "string" ? data.openai_key.trim() : "";
  return key || null;
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
