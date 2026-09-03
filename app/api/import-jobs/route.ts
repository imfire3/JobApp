import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseJobsImportFile } from "@/lib/imports/jobs-file";
import { parseJobsJsonText } from "@/lib/imports/jobs-json";
import { importParsedJobs } from "@/lib/imports/run-import";

/**
 * POST /api/import-jobs
 * Upload CSV, XLSX or Apify JSON and import jobs into Supabase.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError, unreachable } =
    await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }
  if (unreachable) {
    return NextResponse.json(
      {
        error:
          authError ??
          "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL in .env.local, then restart the app.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a file field named 'file'" },
      { status: 400 }
    );
  }

  const uploaded = formData.get("file");
  if (!(uploaded instanceof File)) {
    return NextResponse.json(
      { error: "Missing file upload. Use field name 'file'" },
      { status: 400 }
    );
  }

  const fileName = uploaded.name.toLowerCase();
  const arrayBuffer = await uploaded.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    if (fileName.endsWith(".json")) {
      parsed = parseJobsJsonText(buffer.toString("utf-8"));
    } else if (fileName.endsWith(".csv") || fileName.endsWith(".xlsx")) {
      parsed = parseJobsImportFile(buffer);
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Upload .json, .csv or .xlsx" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid import file" },
      { status: 400 }
    );
  }

  try {
    const result = await importParsedJobs(supabase, user.id, parsed);
    return NextResponse.json({
      summary: result.summary,
      jobs: result.jobs,
      preview: parsed.rows.slice(0, 50),
      message: "Import complete",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
