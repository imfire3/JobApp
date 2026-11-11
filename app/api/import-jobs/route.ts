import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseJobsImportFile, type ImportRow, type ParsedImportFile } from "@/lib/imports/jobs-file";
import { parseJobsJsonText } from "@/lib/imports/jobs-json";
import { importParsedJobs, buildImportResultMessage } from "@/lib/imports/run-import";
import { parseWebsitePaste, websitePasteRequestSchema } from "@/lib/imports/website-paste";
import { extractWebsitePasteWithAI } from "@/lib/openai/client";

/**
 * POST /api/import-jobs
 * Upload CSV, XLSX or Apify JSON, or import a copied job page as JSON.
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

  let parsed: ParsedImportFile<ImportRow>;
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json") {
      const payload = websitePasteRequestSchema.safeParse(await request.json().catch(() => null));
      if (!payload.success) {
        return NextResponse.json(
          { error: "Colle le texte de l’offre (100 000 caractères maximum) et vérifie son lien, s’il est renseigné." },
          { status: 400 }
        );
      }
      const row = await parseWebsitePaste(payload.data, extractWebsitePasteWithAI);
      if (!row) {
        return NextResponse.json(
          { error: "Impossible d’identifier l’offre. Colle son titre et le texte de l’annonce." },
          { status: 422 }
        );
      }
      parsed = { totalRows: 1, rows: [row], invalidRows: [] };
    } else {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
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
      const buffer = Buffer.from(await uploaded.arrayBuffer());
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
      message: buildImportResultMessage(result.summary),
      already_on_board: result.summary.already_on_board,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
