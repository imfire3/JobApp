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

export async function importParsedJobs(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedImportFile
): Promise<ImportSummary> {
  const urlCandidates = parsed.rows.map((row) => row.url);
  const existingUrls = new Set<string>();
  const chunkSize = 500;

  for (let offset = 0; offset < urlCandidates.length; offset += chunkSize) {
    const chunk = urlCandidates.slice(offset, offset + chunkSize);
    if (chunk.length === 0) continue;

    const { data, error } = await supabase
      .from("jobs")
      .select("url")
      .eq("user_id", userId)
      .in("url", chunk);
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const url = typeof row.url === "string" ? row.url : "";
      if (url) existingUrls.add(url);
    }
  }

  const rowsToInsert = parsed.rows.filter((row) => !existingUrls.has(row.url));
  const duplicates = parsed.rows.length - rowsToInsert.length;

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
      .select("id");

    if (insertError) {
      if (insertError.code === "23505") {
        imported = 0;
      } else {
        throw new Error(insertError.message);
      }
    } else {
      imported = inserted?.length ?? 0;
    }
  }

  return {
    total_rows: parsed.totalRows,
    imported,
    duplicates: duplicates + Math.max(0, rowsToInsert.length - imported),
    invalid: parsed.invalidRows.filter((row) => row.rowNumber > 0).length,
    invalid_rows: parsed.invalidRows,
  };
}
