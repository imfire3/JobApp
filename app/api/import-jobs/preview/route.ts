import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseJobsImportFile } from "@/lib/imports/jobs-file";
import { parseJobsJsonText } from "@/lib/imports/jobs-json";
import {
  isWttjApifyDataset,
  parseWttjJsonForPreview,
} from "@/lib/imports/import-wttj-json";

/**
 * POST /api/import-jobs/preview
 * Parse a file and return rows for table preview (no DB write).
 */
export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const uploaded = formData.get("file");
  if (!(uploaded instanceof File)) {
    return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
  }

  const fileName = uploaded.name.toLowerCase();
  const buffer = Buffer.from(await uploaded.arrayBuffer());

  try {
    const text = buffer.toString("utf-8");
    const parsed = fileName.endsWith(".json")
      ? (() => {
          const json = JSON.parse(text) as unknown;
          if (isWttjApifyDataset(json)) {
            const wttj = parseWttjJsonForPreview(json);
            return {
              totalRows: wttj.total_rows,
              rows: wttj.rows,
              invalidRows: wttj.invalid_rows,
            };
          }
          return parseJobsJsonText(text);
        })()
      : parseJobsImportFile(buffer);

    return NextResponse.json({
      rows: parsed.rows,
      invalid_rows: parsed.invalidRows,
      total_rows: parsed.totalRows,
      valid_count: parsed.rows.length,
      invalid_count: parsed.invalidRows.filter((row) => row.rowNumber > 0).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed" },
      { status: 400 }
    );
  }
}
