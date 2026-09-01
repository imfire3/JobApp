#!/usr/bin/env node
/**
 * Delete all jobs for a user and import WTTJ jobs from a local JSON file.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMPORT_USER_ID  (or auto-detected from cv_contexts)
 *
 * Usage:
 *   node --import tsx scripts/replace-wttj-jobs.ts path/to/dataset.json
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { importWttjJson } from "../lib/imports/import-wttj-json";

function loadEnvLocal(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

async function resolveUserId(
  supabase: SupabaseClient,
  env: Record<string, string>
): Promise<string> {
  if (env.IMPORT_USER_ID) return env.IMPORT_USER_ID;

  const { data: cvRows, error: cvError } = await supabase
    .from("cv_contexts")
    .select("id")
    .limit(1);

  const cvRow = cvRows?.[0] as { id?: string } | undefined;
  if (!cvError && cvRow?.id) {
    return cvRow.id;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (authError || !authData.users[0]) {
    throw new Error(
      "Set IMPORT_USER_ID in .env.local or ensure at least one user exists in auth.users"
    );
  }

  return authData.users[0].id;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node --import tsx scripts/replace-wttj-jobs.ts <path-to-json>");
    process.exit(1);
  }

  const env = { ...loadEnvLocal(), ...process.env } as Record<string, string>;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  const json = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await resolveUserId(supabase, env);
  console.log("User ID:", userId);
  console.log("Replacing all jobs from:", absolutePath);

  const result = await importWttjJson(supabase, userId, json, { replace: true });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
