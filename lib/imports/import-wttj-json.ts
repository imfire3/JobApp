import {
  extractApifyItems,
} from "@/lib/imports/jobs-json";
import {
  normalizeWttjJob,
  type WttjApifyItem,
  type WttjNormalizedJob,
} from "@/lib/imports/normalize-wttj-job";
import type { ParsedImportRow } from "@/lib/imports/jobs-file";

export interface WttjImportError {
  index: number;
  message: string;
}

export interface WttjImportResult {
  received: number;
  imported: number;
  duplicates: number;
  invalid: number;
  errors: WttjImportError[];
}

export interface WttjParseResult {
  received: number;
  valid: WttjNormalizedJob[];
  invalid: number;
  errors: WttjImportError[];
  duplicatesWithinFile: number;
}

export function isWttjApifyDataset(json: unknown): boolean {
  try {
    const items = extractApifyItems(json) as WttjApifyItem[];
    if (items.length === 0) return false;
    const first = items[0];
    return Boolean(
      first.name ||
        first.organizationName ||
        first.contractType ||
        first.organizationSlug
    );
  } catch {
    return false;
  }
}

export function wttjJobToPreviewRow(job: WttjNormalizedJob, rowNumber: number): ParsedImportRow {
  const location = [job.city, job.district, job.country_code].filter(Boolean).join(", ") || null;
  return {
    rowNumber,
    source: job.source,
    title: job.title,
    company: job.company,
    location,
    remote: job.remote_mode === "remote" || job.remote_mode === "hybrid",
    contract_type: job.contract_type,
    salary: null,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency,
    experience_min_years: job.experience_level,
    remote_mode: job.remote_mode,
    posted_at: job.published_at ?? new Date().toISOString(),
    url: job.url,
    description: job.summary ?? job.description,
    raw_data: job.raw_data as Record<string, unknown>,
  };
}

export function parseWttjJsonForPreview(json: unknown): {
  rows: ParsedImportRow[];
  invalid_rows: Array<{ rowNumber: number; errors: string[] }>;
  total_rows: number;
} {
  const items = extractApifyItems(json) as WttjApifyItem[];
  const rows: ParsedImportRow[] = [];
  const invalid_rows: Array<{ rowNumber: number; errors: string[] }> = [];
  const seenUrls = new Set<string>();
  let duplicatesWithinFile = 0;

  items.forEach((item, index) => {
    const rowNumber = index + 1;
    const normalized = normalizeWttjJob(item);
    if (normalized.errors.length > 0 || !normalized.job) {
      invalid_rows.push({ rowNumber, errors: normalized.errors });
      return;
    }
    if (seenUrls.has(normalized.job.url)) {
      duplicatesWithinFile += 1;
      return;
    }
    seenUrls.add(normalized.job.url);
    rows.push(wttjJobToPreviewRow(normalized.job, rowNumber));
  });

  if (duplicatesWithinFile > 0) {
    invalid_rows.push({
      rowNumber: 0,
      errors: [`${duplicatesWithinFile} duplicate URL(s) were skipped inside the JSON file`],
    });
  }

  return {
    rows,
    invalid_rows,
    total_rows: items.length,
  };
}

export function parseWttjJson(json: unknown): WttjParseResult {
  const items = extractApifyItems(json) as WttjApifyItem[];
  const valid: WttjNormalizedJob[] = [];
  const errors: WttjImportError[] = [];
  const seenUrls = new Set<string>();
  let duplicatesWithinFile = 0;

  items.forEach((item, index) => {
    const normalized = normalizeWttjJob(item);
    if (normalized.errors.length > 0 || !normalized.job) {
      errors.push({
        index,
        message: normalized.errors.join("; ") || "Invalid row",
      });
      return;
    }

    if (seenUrls.has(normalized.job.url)) {
      duplicatesWithinFile += 1;
      return;
    }

    seenUrls.add(normalized.job.url);
    valid.push(normalized.job);
  });

  return {
    received: items.length,
    valid,
    invalid: errors.length,
    errors,
    duplicatesWithinFile,
  };
}

export function parseWttjJsonText(text: string): WttjParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
  return parseWttjJson(parsed);
}

import type { SupabaseClient } from "@supabase/supabase-js";

const INSERT_BATCH_SIZE = 50;

function toInsertRow(userId: string, job: WttjNormalizedJob): Record<string, unknown> {
  return {
    user_id: userId,
    source: job.source,
    source_job_id: job.source_job_id,
    source_reference: job.source_reference,
    title: job.title,
    company: job.company,
    company_slug: job.company_slug,
    company_logo_url: job.company_logo_url,
    company_website: job.company_website,
    company_industry: job.company_industry,
    company_size: job.company_size,
    contract_type: job.contract_type,
    remote_mode: job.remote_mode,
    language: job.language,
    city: job.city,
    district: job.district,
    country_code: job.country_code,
    country: job.country_code === "FR" ? "France" : job.country_code,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency ?? "EUR",
    salary_period: job.salary_period ?? "year",
    experience_level: job.experience_level,
    experience_min_years: job.experience_level,
    education_level: job.education_level,
    category: job.category,
    subcategory: job.subcategory,
    sectors: job.sectors,
    summary: job.summary,
    description: job.description,
    profile: job.profile,
    recruitment_process: job.recruitment_process,
    benefits: job.benefits,
    skills: job.skills,
    tools: job.tools,
    apply_url: job.apply_url,
    published_at: job.published_at,
    scraped_at: new Date().toISOString(),
    url: job.url,
    status: job.status,
    selected: job.selected,
    raw_data: job.raw_data,
    ai_summary: null,
    ai_match_score: null,
    ai_strengths: null,
    ai_gaps: null,
    cover_letter_angle: null,
  };
}

export async function deleteAllUserJobs(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: jobRows, error: listError } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId);

  if (listError) {
    throw new Error(listError.message);
  }

  const jobIds = (jobRows ?? []).map((row) => row.id as string);
  if (jobIds.length === 0) {
    return 0;
  }

  const { error: coverLetterError } = await supabase
    .from("cover_letters")
    .delete()
    .eq("user_id", userId);

  if (coverLetterError && coverLetterError.code !== "42P01") {
    throw new Error(coverLetterError.message);
  }

  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? jobIds.length;
}

export async function importWttjJobs(
  supabase: SupabaseClient,
  userId: string,
  jobs: WttjNormalizedJob[]
): Promise<WttjImportResult> {
  if (jobs.length === 0) {
    return { received: 0, imported: 0, duplicates: 0, invalid: 0, errors: [] };
  }

  const urls = jobs.map((j) => j.url);
  const { data: existingRows, error: lookupError } = await supabase
    .from("jobs")
    .select("url")
    .eq("user_id", userId)
    .in("url", urls);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const existingUrls = new Set((existingRows ?? []).map((r) => r.url));
  const toInsert = jobs.filter((job) => !existingUrls.has(job.url));
  const duplicates = jobs.length - toInsert.length;

  let imported = 0;
  const errors: WttjImportError[] = [];

  for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
    const batch = toInsert.slice(i, i + INSERT_BATCH_SIZE);
    const rows = batch.map((job) => toInsertRow(userId, job));

    const { data, error } = await supabase
      .from("jobs")
      .insert(rows as never)
      .select("id");

    if (error) {
      if (error.code === "23505") {
        // Race or partial duplicate — try one-by-one
        for (let j = 0; j < batch.length; j++) {
          const single = toInsertRow(userId, batch[j]);
          const { error: singleError } = await supabase
            .from("jobs")
            .insert([single] as never)
            .select("id");
          if (singleError) {
            if (singleError.code === "23505") continue;
            errors.push({
              index: i + j,
              message: singleError.message,
            });
          } else {
            imported += 1;
          }
        }
      } else {
        errors.push({
          index: i,
          message: error.message,
        });
      }
    } else {
      imported += data?.length ?? batch.length;
    }
  }

  return {
    received: jobs.length,
    imported,
    duplicates,
    invalid: 0,
    errors,
  };
}

export async function importWttjJson(
  supabase: SupabaseClient,
  userId: string,
  json: unknown,
  options?: { replace?: boolean }
): Promise<WttjImportResult & { deleted?: number }> {
  const parsed = parseWttjJson(json);

  let deleted = 0;
  if (options?.replace) {
    deleted = await deleteAllUserJobs(supabase, userId);
  }

  const importResult = await importWttjJobs(supabase, userId, parsed.valid);

  return {
    received: parsed.received,
    imported: importResult.imported,
    duplicates: options?.replace ? 0 : importResult.duplicates + parsed.duplicatesWithinFile,
    invalid: parsed.invalid,
    errors: parsed.errors,
    deleted: options?.replace ? deleted : undefined,
  };
}
