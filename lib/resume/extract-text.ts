import { extractPdfText } from "@/lib/cv/extract-pdf-text"
import {
  isTextInsufficient,
  normalizeResumeText,
  resumeDevLog,
} from "@/lib/resume/normalize-text"
import { ocrImageWithVision, ocrPdfWithVision } from "@/lib/resume/ocr-vision"
import { MIN_NATIVE_TEXT_LENGTH } from "@/lib/resume/types"

export type ExtractResumeTextResult = {
  text: string
  ocrUsed: boolean
  source: "native" | "ocr" | "image"
  nativeLength: number
}

const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
])

function isPdf(mimeType: string, fileName: string): boolean {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")
}

function isImage(mimeType: string, fileName: string): boolean {
  if (IMAGE_MIME.has(mimeType)) return true
  return /\.(png|jpe?g|webp)$/i.test(fileName)
}

/**
 * Extract resume text: native PDF text first, OCR Vision fallback when insufficient.
 * Images go straight to Vision OCR.
 */
export async function extractResumeText(
  bytes: Uint8Array,
  options: {
    mimeType: string
    fileName: string
    apiKey?: string | null
  }
): Promise<ExtractResumeTextResult> {
  const { mimeType, fileName, apiKey } = options

  if (isImage(mimeType, fileName)) {
    resumeDevLog("CV IMPORT", "Image upload — OCR Vision")
    const text = await ocrImageWithVision(
      bytes,
      mimeType || guessImageMime(fileName),
      { apiKey }
    )
    return {
      text,
      ocrUsed: true,
      source: "image",
      nativeLength: 0,
    }
  }

  if (!isPdf(mimeType, fileName)) {
    throw new Error("Unsupported format. Upload a PDF or image (PNG/JPEG/WebP).")
  }

  let nativeText = ""
  try {
    nativeText = normalizeResumeText(await extractPdfText(bytes))
  } catch (error) {
    resumeDevLog("CV IMPORT", "Native PDF text extraction failed", error)
    nativeText = ""
  }

  const nativeLength = nativeText.length
  resumeDevLog("CV IMPORT", `Native PDF text length=${nativeLength}`)

  if (!isTextInsufficient(nativeText, MIN_NATIVE_TEXT_LENGTH)) {
    return {
      text: nativeText,
      ocrUsed: false,
      source: "native",
      nativeLength,
    }
  }

  resumeDevLog("CV IMPORT", "Native text insufficient — OCR Vision fallback")
  const ocrText = await ocrPdfWithVision(bytes, { apiKey })
  if (!ocrText.trim()) {
    // Prefer native if OCR returned nothing
    if (nativeText.trim()) {
      return {
        text: nativeText,
        ocrUsed: false,
        source: "native",
        nativeLength,
      }
    }
    throw new Error("No readable text found in this file (native + OCR).")
  }

  return {
    text: ocrText,
    ocrUsed: true,
    source: "ocr",
    nativeLength,
  }
}

function guessImageMime(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  return "image/jpeg"
}
