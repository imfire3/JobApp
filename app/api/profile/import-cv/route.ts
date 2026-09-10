import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { MIN_CV_LENGTH } from "@/lib/cv-analysis/service"
import { runCvProfileExtraction } from "@/lib/profile/extract-service"
import { loadUserOpenAIKey } from "@/lib/openai/api-key"
import { extractResumeText } from "@/lib/resume/extract-text"
import { resumeDevLog } from "@/lib/resume/normalize-text"

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
const CV_BUCKET = "cv-files"

function isAllowedFile(mimeType: string, fileName: string): boolean {
  const lower = fileName.toLowerCase()
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return true
  if (
    ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType) ||
    /\.(png|jpe?g|webp)$/i.test(lower)
  ) {
    return true
  }
  return false
}

/**
 * POST /api/profile/import-cv
 * Upload CV → extract text → persist structured profile (name, experiences…) in DB.
 * Profile is filled server-side; the client does not need to visit /profile-ai.
 */
export async function POST(request: Request) {
  try {
    const { supabase, user, error, unreachable } = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }
    if (unreachable) {
      return NextResponse.json(
        {
          error:
            error ??
            "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL, then retry.",
        },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CV file is required" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Max size is 8MB." },
        { status: 400 }
      )
    }

    // Own two independent copies up-front: PDF parsers may detach the buffer they receive.
    const rawBytes = new Uint8Array(await file.arrayBuffer())
    const parseBytes = rawBytes.slice()
    const uploadBytes = rawBytes.slice()
    const fileName = file.name
    const mimeType = file.type || "application/octet-stream"

    if (!isAllowedFile(mimeType, fileName)) {
      return NextResponse.json(
        {
          error:
            "Unsupported format. Please upload a PDF or image (PNG/JPEG/WebP).",
        },
        { status: 400 }
      )
    }

    let extractedText = ""
    let ocrUsed = false
    let source: "native" | "ocr" | "image" = "native"

    try {
      const userKey = await loadUserOpenAIKey(supabase, user.id)
      const result = await extractResumeText(parseBytes, {
        mimeType,
        fileName,
        apiKey: userKey,
      })
      extractedText = result.text
      ocrUsed = result.ocrUsed
      source = result.source
      resumeDevLog(
        "CV IMPORT",
        `Extracted text_length=${extractedText.length} ocr=${ocrUsed} source=${source}`
      )
    } catch (extractError) {
      const message =
        extractError instanceof Error
          ? extractError.message
          : "Failed to parse file. Please try another document."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No readable text found in this file." },
        { status: 400 }
      )
    }

    const { data: cvRow, error: updateError } = await supabase
      .from("cv_contexts")
      .upsert({
        id: user.id,
        cv_text: extractedText,
      })
      .select("id,cv_text,created_at,updated_at")
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const isPdf =
      mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")
    const storagePath = isPdf
      ? `${user.id}/original.pdf`
      : `${user.id}/original${extFromName(fileName)}`
    let cvFileName: string | null = file.name
    let cvFilePath: string | null = storagePath
    let cvFileUpdatedAt: string | null = new Date().toISOString()

    // Storage is best-effort — never abort profile fill if upload fails
    try {
      const { error: uploadError } = await supabase.storage
        .from(CV_BUCKET)
        .upload(storagePath, uploadBytes, {
          contentType: isPdf ? "application/pdf" : mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.warn("[import-cv] storage upload failed:", uploadError.message)
        cvFileName = null
        cvFilePath = null
        cvFileUpdatedAt = null
      }
    } catch (uploadCaught) {
      console.warn(
        "[import-cv] storage upload threw:",
        uploadCaught instanceof Error ? uploadCaught.message : uploadCaught
      )
      cvFileName = null
      cvFilePath = null
      cvFileUpdatedAt = null
    }

    const { error: metaError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        cv_file_name: cvFileName,
        cv_file_path: cvFilePath,
        cv_file_updated_at: cvFileUpdatedAt,
      },
      { onConflict: "id" }
    )

    if (metaError && metaError.code !== "42P01" && metaError.code !== "42703") {
      console.warn("[import-cv] profile file meta update failed:", metaError.message)
    }

    // Structured profile fill in DB (prénom, expériences, skills…) — no UI visit required
    let profileFilled = false
    let profileExtractError: string | null = null
    let candidateProfile: Record<string, unknown> | null = null
    if (extractedText.trim().length >= MIN_CV_LENGTH) {
      try {
        const extractResult = await runCvProfileExtraction(supabase, user.id, {
          force: true,
          persist: true,
        })
        profileFilled = extractResult.extracted === true && extractResult.ok
        if (!extractResult.ok) {
          profileExtractError = extractResult.error
        }
        candidateProfile = extractResult.profile
        resumeDevLog("CV IMPORT", "Profile extract+persist done", {
          ok: extractResult.ok,
          extracted: extractResult.extracted,
          first_name:
            typeof extractResult.draft?.first_name === "string"
              ? extractResult.draft.first_name
              : null,
          experiences: extractResult.draft?.experience_entries?.length ?? 0,
        })
      } catch (profileError) {
        profileExtractError =
          profileError instanceof Error
            ? profileError.message
            : "Profile extract failed"
        console.warn("[import-cv] profile extract failed:", profileExtractError)
      }
    }

    // ATS analysis is deferred (runs later on profile pages) so signup import stays fast.

    return NextResponse.json({
      profile: candidateProfile ?? {
        ...cvRow,
        cv_file_name: cvFileName,
        cv_file_path: cvFilePath,
        cv_file_updated_at: cvFileUpdatedAt,
      },
      extracted_text: extractedText,
      text_length: extractedText.length,
      ocr_used: ocrUsed,
      source,
      cv_file_name: cvFileName,
      cv_file_path: cvFilePath,
      cv_file_updated_at: cvFileUpdatedAt,
      profile_filled: profileFilled,
      profile_extract_error: profileExtractError,
      analysis: null,
      analysis_error: null,
      message: profileFilled
        ? "CV importé et profil rempli."
        : ocrUsed
          ? "CV imported successfully (OCR used)."
          : "CV imported successfully.",
    })
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "CV import failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function extFromName(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.(png|jpe?g|webp)$/)
  if (!match) return ".bin"
  if (match[1] === "jpeg") return ".jpg"
  return `.${match[1]}`
}
