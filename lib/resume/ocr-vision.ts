import OpenAI from "openai"
import { getDocumentProxy, renderPageAsImage } from "unpdf"
import {
  mapOpenAIError,
  resolveOpenAIApiKey,
} from "@/lib/openai/api-key"
import { normalizeResumeText, resumeDevLog } from "@/lib/resume/normalize-text"

const MAX_OCR_PAGES = 4
const OCR_SCALE = 1.5

function getVisionModel() {
  return process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini"
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64")
}

async function ocrImagesWithVision(
  images: Array<{ mimeType: string; base64: string }>,
  apiKey?: string | null
): Promise<string> {
  if (images.length === 0) return ""

  const client = new OpenAI({ apiKey: resolveOpenAIApiKey(apiKey) })
  const model = getVisionModel()

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: [
        "Extract ALL readable text from these resume/CV page image(s).",
        "Preserve reading order, line breaks, emails, phones, URLs, job titles, companies, and dates.",
        "Do not invent content. Return plain text only, no markdown.",
      ].join(" "),
    },
    ...images.map(
      (image): OpenAI.Chat.Completions.ChatCompletionContentPart => ({
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType};base64,${image.base64}`,
          detail: "high",
        },
      })
    ),
  ]

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [{ role: "user", content }],
      max_tokens: 4000,
    })
    return normalizeResumeText(response.choices[0]?.message?.content ?? "")
  } catch (error) {
    throw mapOpenAIError(error)
  }
}

/**
 * OCR a PDF by rendering pages to images then calling OpenAI Vision.
 * Limited to first MAX_OCR_PAGES for cost/latency.
 */
export async function ocrPdfWithVision(
  bytes: Uint8Array,
  options?: { apiKey?: string | null }
): Promise<string> {
  const pdf = await getDocumentProxy(bytes)
  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES)
  resumeDevLog("CV IMPORT", `OCR Vision starting for ${pageCount} page(s)`)

  const images: Array<{ mimeType: string; base64: string }> = []

  for (let page = 1; page <= pageCount; page++) {
    try {
      const image = await renderPageAsImage(pdf, page, {
        scale: OCR_SCALE,
        canvasImport: () => import("@napi-rs/canvas"),
      })
      images.push({
        mimeType: "image/png",
        base64: bufferToBase64(image),
      })
    } catch (error) {
      resumeDevLog("CV IMPORT", `Failed to render PDF page ${page}`, error)
    }
  }

  if (images.length === 0) {
    throw new Error("Unable to render PDF pages for OCR")
  }

  return ocrImagesWithVision(images, options?.apiKey)
}

/** OCR a single image file (png/jpeg/webp) via OpenAI Vision. */
export async function ocrImageWithVision(
  bytes: Uint8Array,
  mimeType: string,
  options?: { apiKey?: string | null }
): Promise<string> {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
  if (!allowed.includes(mimeType)) {
    throw new Error(`Unsupported image type for OCR: ${mimeType}`)
  }
  const normalizedMime = mimeType === "image/jpg" ? "image/jpeg" : mimeType
  return ocrImagesWithVision(
    [
      {
        mimeType: normalizedMime,
        base64: Buffer.from(bytes).toString("base64"),
      },
    ],
    options?.apiKey
  )
}
