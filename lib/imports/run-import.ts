import type { SupabaseClient } from "@supabase/supabase-js";
import { buildJobInsertPayload } from "@/lib/jobs/mapper";
import type { ParsedImportFile } from "@/lib/imports/jobs-file";

export type AlreadyOnBoardJob = {
  id: string;
  url: string;
  title: string;
  company: string;
};

export type ImportSummary = {
  total_rows: number;
  imported: number;
  duplicates: number;
  updated: number;
  invalid: number;
  invalid_rows: Array<{ rowNumber: number; errors: string[] }>;
  already_on_board: AlreadyOnBoardJob[];
};

export type ImportedJobRef = {
  id: string;
  url: string;
  title: string;
  company: string;
  was_duplicate: boolean;
  was_updated: boolean;
};

export type ImportParsedJobsResult = {
  summary: ImportSummary;
  jobs: ImportedJobRef[];
};

export function buildImportResultMessage(summary: ImportSummary): string {
  const parts: string[] = [];
  if (summary.imported > 0) {
    parts.push(
      summary.imported === 1
        ? "1 offre ajoutée au board"
        : `${summary.imported} offres ajoutées au board`
    );
  }
  if (summary.duplicates > 0) {
    parts.push(
      summary.duplicates === 1
        ? "1 offre était déjà sur ton board (non réimportée)"
        : `${summary.duplicates} offres étaient déjà sur ton board (non réimportées)`
    );
  }
  if (summary.invalid > 0) {
    parts.push(
      summary.invalid === 1
        ? "1 ligne invalide ignorée"
        : `${summary.invalid} lignes invalides ignorées`
    );
  }
  if (parts.length === 0) {
    return "Aucune offre à importer.";
  }
  return parts.join(" · ");
}

export async function importParsedJobs(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedImportFile
): Promise<ImportParsedJobsResult> {
  const urlCandidates = parsed.rows.map((row) => row.url);
  const existingByUrl = new Map<string, AlreadyOnBoardJob>();
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
      });
    }
  }

  const rowsToInsert = parsed.rows.filter((row) => !existingByUrl.has(row.url));
  const duplicateRows = parsed.rows.filter((row) => existingByUrl.has(row.url));
  const jobsByUrl = new Map<string, ImportedJobRef>();
  const alreadyOnBoard: AlreadyOnBoardJob[] = [];

  for (const row of duplicateRows) {
    const existing = existingByUrl.get(row.url);
    if (!existing) continue;
    alreadyOnBoard.push(existing);
    jobsByUrl.set(row.url, {
      id: existing.id,
      url: existing.url,
      title: existing.title,
      company: existing.company,
      was_duplicate: true,
      was_updated: false,
    });
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
      // Unique constraint race: treat remaining as duplicates if we can resolve them
    } else {
      imported = inserted?.length ?? 0;
      for (const row of inserted ?? []) {
        if (typeof row.id !== "string" || typeof row.url !== "string") continue;
        jobsByUrl.set(row.url, {
          id: row.id,
          url: row.url,
          title: typeof row.title === "string" ? row.title : "",
          company: typeof row.company === "string" ? row.company : "",
          was_duplicate: false,
          was_updated: false,
        });
      }
    }
  }

  const orderedJobs = parsed.rows
    .map((row) => jobsByUrl.get(row.url))
    .filter((job): job is ImportedJobRef => Boolean(job));

  const duplicates =
    alreadyOnBoard.length + Math.max(0, rowsToInsert.length - imported);

  return {
    summary: {
      total_rows: parsed.totalRows,
      imported,
      duplicates,
      updated: 0,
      invalid: parsed.invalidRows.filter((row) => row.rowNumber > 0).length,
      invalid_rows: parsed.invalidRows,
      already_on_board: alreadyOnBoard,
    },
    jobs: orderedJobs,
  };
}
