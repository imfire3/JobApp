import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getAuthenticatedUser } from "@/lib/auth";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/profile/import-cv
 * Upload CV (PDF for MVP) and store text as AI context for cover letters.
 */
export async function POST(request: Request) {
  const { supabase, user, error, unreachable } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (unreachable) {
    return NextResponse.json(
      {
        error:
          error ??
          "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL, then retry.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CV file is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Max size is 8MB." },
      { status: 400 }
    );
  }

  let extractedText = "";
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    const mimeType = file.type;

    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const parser = new PDFParse({ data: bytes });
      const textResult = await parser.getText();
      extractedText = (textResult.text ?? "").trim();
      await parser.destroy();
    } else {
      return NextResponse.json(
        { error: "Unsupported format for MVP. Please upload a PDF." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to parse file. Please try another document." },
      { status: 400 }
    );
  }

  if (!extractedText) {
    return NextResponse.json(
      { error: "No readable text found in this file." },
      { status: 400 }
    );
  }

  const { data: profile, error: updateError } = await supabase
    .from("cv_contexts")
    .upsert({
      id: user.id,
      cv_text: extractedText,
    })
    .select("id,cv_text,created_at,updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    profile,
    extracted_text: extractedText,
    text_length: extractedText.length,
    message: "CV imported successfully.",
  });
}
