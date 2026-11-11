import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MIN_CV_TEXT_LENGTH,
  loadCvText,
  saveCvTextWithBackup,
  type LoadedCvText,
} from "./cv-context";

type Row = Record<string, unknown> | null;
type QueryResult = { data: Row; error: { code?: string; message?: string } | null };

type MockOptions = {
  cvContexts?: (columns: string) => QueryResult;
  profiles?: (columns: string) => QueryResult;
  onUpsert?: (payload: Record<string, unknown>) => QueryResult;
};

function createSupabaseMock(options: MockOptions) {
  const upserts: Array<Record<string, unknown>> = [];

  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          return {
            eq() {
              return {
                maybeSingle: async (): Promise<QueryResult> => {
                  if (table === "cv_contexts") {
                    return options.cvContexts?.(columns) ?? { data: null, error: null };
                  }
                  if (table === "profiles") {
                    return options.profiles?.(columns) ?? { data: null, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        async upsert(payload: Record<string, unknown>) {
          upserts.push(payload);
          return options.onUpsert?.(payload) ?? { data: payload, error: null };
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient, upserts };
}

const missingColumnError = {
  code: "42703",
  message: "column cv_contexts.cv_text_previous does not exist",
};

function expectLoaded(result: LoadedCvText) {
  assert.ok(result.cvText.length >= MIN_CV_TEXT_LENGTH);
}

test("loadCvText keeps the CV when the backup column is missing", async () => {
  const { client } = createSupabaseMock({
    cvContexts: (columns) => {
      if (columns === "cv_text") {
        return { data: { cv_text: "Un CV valide avec du contenu." }, error: null };
      }
      return { data: null, error: missingColumnError };
    },
  });

  const result = await loadCvText(client, "user-1");

  expectLoaded(result);
  assert.equal(result.source, "cv_contexts");
  assert.equal(result.cvText, "Un CV valide avec du contenu.");
  assert.equal(result.previousAvailable, false);
  assert.equal(result.cvTextPrevious, null);
});

test("loadCvText reads the previous version when available", async () => {
  const { client } = createSupabaseMock({
    cvContexts: (columns) => {
      if (columns === "cv_text") {
        return { data: { cv_text: "Version actuelle du CV." }, error: null };
      }
      return { data: { cv_text_previous: "Version précédente du CV." }, error: null };
    },
  });

  const result = await loadCvText(client, "user-1");

  assert.equal(result.cvText, "Version actuelle du CV.");
  assert.equal(result.cvTextPrevious, "Version précédente du CV.");
  assert.equal(result.previousAvailable, true);
});

test("loadCvText falls back to profiles when cv_contexts is empty", async () => {
  const { client } = createSupabaseMock({
    cvContexts: () => ({ data: null, error: null }),
    profiles: () => ({
      data: { cv_text: "CV présent uniquement dans le profil candidat." },
      error: null,
    }),
  });

  const result = await loadCvText(client, "user-1");

  expectLoaded(result);
  assert.equal(result.source, "profiles");
  assert.equal(result.cvText, "CV présent uniquement dans le profil candidat.");
});

test("loadCvText returns an empty text when nothing usable is found", async () => {
  const { client } = createSupabaseMock({
    cvContexts: () => ({ data: { cv_text: "   " }, error: null }),
    profiles: () => ({ data: { cv_text: "" }, error: null }),
  });

  const result = await loadCvText(client, "user-1");

  assert.equal(result.source, null);
  assert.equal(result.cvText, "");
});

test("saveCvTextWithBackup persists the CV even without the backup column", async () => {
  const { client, upserts } = createSupabaseMock({
    onUpsert: (payload) =>
      "cv_text_previous" in payload
        ? { data: null, error: missingColumnError }
        : { data: payload, error: null },
  });

  const result = await saveCvTextWithBackup(client, "user-1", "CV optimisé", "CV original");

  assert.equal(result.error, null);
  assert.equal(result.previousSaved, false);
  assert.equal(upserts.length, 2);
  assert.equal(upserts[1].cv_text, "CV optimisé");
  assert.equal("cv_text_previous" in upserts[1], false);
});

test("saveCvTextWithBackup reports a real database error", async () => {
  const { client } = createSupabaseMock({
    onUpsert: () => ({ data: null, error: { message: "permission denied" } }),
  });

  const result = await saveCvTextWithBackup(client, "user-1", "CV optimisé", "CV original");

  assert.equal(result.previousSaved, false);
  assert.equal(result.error, "permission denied");
});
