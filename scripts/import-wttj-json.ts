#!/usr/bin/env npx tsx
/**
 * Local script to preview or import a WTTJ Apify JSON export.
 *
 * Usage:
 *   npx tsx scripts/import-wttj-json.ts path/to/dataset.json
 *   npx tsx scripts/import-wttj-json.ts path/to/dataset.json --import
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseWttjJson } from "../lib/imports/import-wttj-json";
import { importWttjJobs } from "../lib/imports/import-wttj-json";

const filePath = process.argv[2];
const shouldImport = process.argv.includes("--import");

if (!filePath) {
  console.error("Usage: npx tsx scripts/import-wttj-json.ts <path-to-json> [--import]");
  process.exit(1);
}

const absolutePath = resolve(filePath);
const raw = readFileSync(absolutePath, "utf-8");

let json: unknown;
try {
  json = JSON.parse(raw);
} catch {
  console.error("Invalid JSON file:", absolutePath);
  process.exit(1);
}

const parsed = parseWttjJson(json);

console.log("WTTJ Apify JSON preview");
console.log("=======================");
console.log("Total items:", parsed.received);
console.log("Valid items:", parsed.valid.length);
console.log("Invalid items:", parsed.invalid);
console.log("Duplicates in file:", parsed.duplicatesWithinFile);

if (parsed.errors.length > 0) {
  console.log("\nFirst errors:");
  parsed.errors.slice(0, 5).forEach((err) => {
    console.log(`  [${err.index}] ${err.message}`);
  });
}

if (parsed.valid.length > 0) {
  console.log("\nFirst normalized item:");
  console.log(JSON.stringify(parsed.valid[0], null, 2));
}

if (shouldImport) {
  void (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const userId = process.env.IMPORT_USER_ID;

    if (!url || !serviceKey) {
      console.error(
        "\nMissing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping Supabase import."
      );
      process.exit(1);
    }

    if (!userId) {
      console.error(
        "\nSet IMPORT_USER_ID to the target auth.users id before using --import."
      );
      process.exit(1);
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const result = await importWttjJobs(supabase, userId, parsed.valid);
    console.log("\nImport result:");
    console.log(JSON.stringify(result, null, 2));
  })();
}
