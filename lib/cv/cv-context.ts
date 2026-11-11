import type { SupabaseClient } from "@supabase/supabase-js";

export const MIN_CV_TEXT_LENGTH = 10;

export type CvTextSource = "cv_contexts" | "profiles" | null;

export type LoadedCvText = {
  cvText: string;
  source: CvTextSource;
  /** Previous saved version, only when the backup column exists and holds a value. */
  cvTextPrevious: string | null;
  /** False when the database schema does not have cv_text_previous yet. */
  previousAvailable: boolean;
};

type SupabaseErrorLike = { code?: string | null; message?: string | null } | null;

function isMissingColumnError(error: SupabaseErrorLike): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist/i.test(message) ||
    /could not find the '.*' column/i.test(message)
  );
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Loads the candidate CV in a schema-tolerant way.
 *
 * The `cv_text_previous` backup column may not exist on every environment
 * (migration 030). Selecting it together with `cv_text` would make the whole
 * query fail and hide a perfectly valid CV, so the two are fetched separately.
 */
export async function loadCvText(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedCvText> {
  let cvText = "";
  let source: CvTextSource = null;

  const { data: context, error: contextError } = await supabase
    .from("cv_contexts")
    .select("cv_text")
    .eq("id", userId)
    .maybeSingle();

  if (!contextError) {
    cvText = normalizeText(context?.cv_text);
    if (cvText.length >= MIN_CV_TEXT_LENGTH) source = "cv_contexts";
  }

  let cvTextPrevious: string | null = null;
  let previousAvailable = true;

  const { data: previousRow, error: previousError } = await supabase
    .from("cv_contexts")
    .select("cv_text_previous")
    .eq("id", userId)
    .maybeSingle();

  if (previousError) {
    // Only a missing column means the backup feature is unavailable. Any other
    // error is transient: keep the feature enabled and simply report no backup.
    previousAvailable = !isMissingColumnError(previousError);
  } else {
    const previous = normalizeText(
      (previousRow as Record<string, unknown> | null)?.cv_text_previous,
    );
    cvTextPrevious = previous.length > 0 ? previous : null;
  }

  if (!source) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("cv_text")
      .eq("id", userId)
      .maybeSingle();

    if (!profileError) {
      const profileCvText = normalizeText(profile?.cv_text);
      if (profileCvText.length >= MIN_CV_TEXT_LENGTH) {
        cvText = profileCvText;
        source = "profiles";
      }
    }
  }

  return { cvText, source, cvTextPrevious, previousAvailable };
}

type SaveCvResult = {
  previousSaved: boolean;
  error: string | null;
};

/**
 * Saves the CV and, when supported by the schema, keeps the previous version
 * for a reversible restore. Never fails the save because the backup column is
 * missing.
 */
export async function saveCvTextWithBackup(
  supabase: SupabaseClient,
  userId: string,
  cvText: string,
  cvTextPrevious: string | null,
): Promise<SaveCvResult> {
  const now = new Date().toISOString();

  const { error } = await supabase.from("cv_contexts").upsert(
    {
      id: userId,
      cv_text: cvText,
      cv_text_previous: cvTextPrevious,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (!error) {
    return { previousSaved: cvTextPrevious !== null, error: null };
  }

  if (!isMissingColumnError(error)) {
    return { previousSaved: false, error: error.message };
  }

  // Backup column missing: still persist the optimized CV.
  const { error: fallbackError } = await supabase.from("cv_contexts").upsert(
    {
      id: userId,
      cv_text: cvText,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  return {
    previousSaved: false,
    error: fallbackError?.message ?? null,
  };
}

/** Syncs a CV found outside cv_contexts so the rest of the app sees it. */
export async function syncCvTextToContext(
  supabase: SupabaseClient,
  userId: string,
  cvText: string,
): Promise<void> {
  try {
    await supabase
      .from("cv_contexts")
      .upsert({ id: userId, cv_text: cvText }, { onConflict: "id" });
  } catch {
    // Best effort only.
  }
}
