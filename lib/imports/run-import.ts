import type { SupabaseClient } from "@supabase/supabase-js";
import { buildJobInsertPayload } from "@/lib/jobs/mapper";
import type { ParsedImportFile } from "@/lib/imports/jobs-file";

export type ImportSummary = {
  total_rows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  invalid_rows: Array<{ rowNumber: number; errors: string[] }>;
};

export type ImportedJobRef = {
  id: string;
  url: string;
  title: string;
  company: string;
  was_duplicate: boolean;
};

export type ImportParsedJobsResult = {
  summary: ImportSummary;
  jobs: ImportedJobRef[];
};

export async function importParsedJobs(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedImportFile
): Promise<ImportParsedJobsResult> {
  const urlCandidates = parsed.rows.map((row) => row.url);
  const existingByUrl = new Map<string, ImportedJobRef>();
  const chunkSize = 500;

  for (let offset = 0; offset < urlCandidates.length; offset += chunkSize) {
    const chunk = urlCandidates.slice(offset, offset + chunkSize);
    if (chunk.length === 0) continue;

    const { data, error } = await supabase
      .from("jobs")
      .select("id,url,title,company")
      .eq("user_id", userId)
      .in("url", chunk);
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      if (typeof row.url !== "string" || typeof row.id !== "string") continue;
      existingByUrl.set(row.url, {
        id: row.id,
        url: row.url,
        title: typeof row.title === "string" ? row.title : "",
        company: typeof row.company === "string" ? row.company : "",
        was_duplicate: true,
      });
    }
  }

  const rowsToInsert = parsed.rows.filter((row) => !existingByUrl.has(row.url));
  const duplicates = parsed.rows.length - rowsToInsert.length;
  const jobs: ImportedJobRef[] = [];

  for (const row of parsed.rows) {
    const existing = existingByUrl.get(row.url);
    if (existing) jobs.push(existing);
  }

  let imported = 0;
  if (rowsToInsert.length > 0) {
    const scrapedAt = new Date().toISOString();
    const payload = rowsToInsert.map((row) =>
      buildJobInsertPayload({
        userId,
        job: row,
        rawData: row.raw_data ?? (row as unknown as Record<string, unknown>),
        scrapedAt,
      })
    );

    const { data: inserted, error: insertError } = await supabase
      .from("jobs")
      .insert(payload as never)
      .select("id,url,title,company");

    if (insertError) {
      if (insertError.code !== "23505") {
        throw new Error(insertError.message);
      }
    } else {
      imported = inserted?.length ?? 0;
      for (const row of inserted ?? []) {
        if (typeof row.id !== "string" || typeof row.url !== "string") continue;
        jobs.push({
          id: row.id,
          url: row.url,
          title: typeof row.title === "string" ? row.title : "",
          company: typeof row.company === "string" ? row.company : "",
          was_duplicate: false,
        });
      }
    }
  }

  // Keep preview order
  const byUrl = new Map(jobs.map((job) => [job.url, job]));
  const orderedJobs = parsed.rows
    .map((row) => byUrl.get(row.url))
    .filter((job): job is ImportedJobRef => Boolean(job));

  return {
    summary: {
      total_rows: parsed.totalRows,
      imported,
      duplicates: duplicates + Math.max(0, rowsToInsert.length - imported),
      invalid: parsed.invalidRows.filter((row) => row.rowNumber > 0).length,
      invalid_rows: parsed.invalidRows,
    },
    jobs: orderedJobs,
  };
}
