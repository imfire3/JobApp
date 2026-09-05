import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract plain text from a PDF buffer.
 * Uses unpdf (serverless-friendly PDF.js) — pdf-parse crashes on Vercel
 * because it requires DOMMatrix / @napi-rs/canvas.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  if (Array.isArray(text)) {
    return text.join("\n").trim();
  }
  return String(text ?? "").trim();
}
