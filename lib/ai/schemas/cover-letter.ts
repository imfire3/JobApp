import { z } from "zod"

const softString = z.preprocess(
  (value) => (value == null ? "" : value),
  z.string()
)

export const coverLetterPackRawSchema = z.object({
  angle_briefing: softString.default(""),
  subject: softString.default(""),
  letter: softString.default(""),
  /** Legacy alias some models may use */
  content: softString.optional(),
  coach_notes: z
    .preprocess((value) => {
      if (value == null) return []
      if (typeof value === "string") {
        return value
          .split(/\n+/)
          .map((line) => line.replace(/^[-•*]\s*/, "").trim())
          .filter(Boolean)
      }
      return value
    }, z.array(softString))
    .default([]),
})

export type CoverLetterPack = {
  angle_briefing: string
  subject: string
  letter: string
  coach_notes: string[]
}

/**
 * Parse model output into a cover-letter pack.
 * Falls back to treating raw text as the letter body only.
 */
export function parseCoverLetterPack(raw: unknown): CoverLetterPack {
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) {
      throw new Error("Empty cover letter from OpenAI")
    }
    // Strip optional markdown fences
    const unfenced = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
    try {
      const parsed = JSON.parse(unfenced) as unknown
      return normalizePack(parsed)
    } catch {
      return {
        angle_briefing: "",
        subject: "",
        letter: trimmed,
        coach_notes: [],
      }
    }
  }

  return normalizePack(raw)
}

function normalizePack(raw: unknown): CoverLetterPack {
  const parsed = coverLetterPackRawSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error("Invalid cover letter pack response")
  }

  const letter =
    parsed.data.letter.trim() ||
    (parsed.data.content ?? "").trim()

  if (!letter) {
    throw new Error("Empty cover letter from OpenAI")
  }

  const notes = parsed.data.coach_notes
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 6)

  return {
    angle_briefing: parsed.data.angle_briefing.trim(),
    subject: parsed.data.subject.trim(),
    letter,
    coach_notes: notes,
  }
}
