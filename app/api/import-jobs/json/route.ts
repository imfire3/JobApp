import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { importWttjJson } from "@/lib/imports/import-wttj-json";

/**
 * POST /api/import-jobs/json
 * Import Welcome to the Jungle jobs from an Apify JSON export.
 * Accepts multipart file upload (.json) or raw JSON body.
 */
export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    let json: unknown;
    let replace = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      replace = formData.get("replace") === "true";
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Missing JSON file" }, { status: 400 });
      }
      const text = await file.text();
      try {
        json = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
      }
    } else {
      try {
        const body = await request.json();
        if (body && typeof body === "object" && !Array.isArray(body)) {
          const record = body as Record<string, unknown>;
          replace = record.replace === true;
          json = record.items ?? record.data ?? record.jobs ?? body;
        } else {
          json = body;
        }
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }

    const url = new URL(request.url);
    if (url.searchParams.get("replace") === "true") {
      replace = true;
    }

    const result = await importWttjJson(supabase, user.id, json, { replace });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
