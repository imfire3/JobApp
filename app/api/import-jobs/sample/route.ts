import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getAuthenticatedUser } from "@/lib/auth";
import { buildJobInsertPayload } from "@/lib/jobs/mapper";
import { parseJobsImportFile } from "@/lib/imports/jobs-file";

export async function POST() {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let parsed;
  try {
    const filePath = join(process.cwd(), "data", "sample_jobs.csv");
    const fileBuffer = await readFile(filePath);
    parsed = parseJobsImportFile(fileBuffer);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read sample file" },
      { status: 500 }
    );
  }

  const urlCandidates = parsed.rows.map((row) => row.url);
  const existingUrls = new Set<string>();
  if (urlCandidates.length > 0) {
    const { data, error } = await supabase.from("jobs").select("url").in("url", urlCandidates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of data ?? []) {
      if (typeof row.url === "string" && row.url) existingUrls.add(row.url);
    }
  }

  const rowsToInsert = parsed.rows.filter((row) => !existingUrls.has(row.url));
  let imported = 0;
  if (rowsToInsert.length > 0) {
    const scrapedAt = new Date().toISOString();
    const payload = rowsToInsert.map((row) =>
      buildJobInsertPayload({
        userId: user.id,
        job: row,
        rawData: row as unknown as Record<string, unknown>,
        scrapedAt,
      })
    );

    const { data, error } = await supabase.from("jobs").insert(payload as never).select("id");
    if (error) {
      if (error.code !== "23505") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      imported = data?.length ?? 0;
    }
  }

  return NextResponse.json({
    message: "Sample jobs imported",
    total_rows: parsed.totalRows,
    imported,
    duplicates: parsed.totalRows - imported,
    invalid: parsed.invalidRows.filter((row) => row.rowNumber > 0).length,
  });
}
