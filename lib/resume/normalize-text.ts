export function normalizeResumeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

export function isTextInsufficient(text: string, minLength = 80): boolean {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length < minLength) return true
  // Heuristic: mostly non-letters → likely garbage / encoding issues
  const letters = cleaned.replace(/[^a-zA-ZÀ-ÿ]/g, "").length
  return letters < minLength * 0.4
}

export function resumeDevLog(scope: string, message: string, data?: unknown) {
  if (process.env.NODE_ENV === "production") return
  if (data !== undefined) {
    console.info(`[${scope}] ${message}`, data)
    return
  }
  console.info(`[${scope}] ${message}`)
}
