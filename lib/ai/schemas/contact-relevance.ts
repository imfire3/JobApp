import { z } from "zod"

const softStringArray = z.preprocess((value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean)
}, z.array(z.string()))

export const contactRelevanceSchema = z.object({
  relevance_score: z.preprocess((value) => {
    const n = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, Math.round(n)))
  }, z.number().int().min(0).max(100)),
  role_type: z
    .preprocess((value) => {
      if (value == null || value === "") return "other"
      const raw = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")
      if (
        ["recruiter", "head_of_product", "cpo", "product_director", "founder", "other"].includes(raw)
      ) {
        return raw
      }
      if (raw.includes("recruit") || raw.includes("talent") || raw.includes("rh")) return "recruiter"
      if (raw.includes("head_of_product") || raw.includes("product_head") || raw.includes("product_manager")) {
        return "head_of_product"
      }
      if (raw.includes("product_director") || raw.includes("cp") || raw.includes("chief")) {
        return "product_director"
      }
      if (raw.includes("founder") || raw.includes("ceo") || raw.includes("president")) {
        return "founder"
      }
      return "other"
    }, z.enum(["recruiter", "head_of_product", "cpo", "product_director", "founder", "other"]))
    .default("other"),
  factors: softStringArray.default([]),
})

export type ContactRelevance = z.infer<typeof contactRelevanceSchema>

export class ContactRelevanceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ContactRelevanceValidationError"
  }
}

export function parseContactRelevance(raw: unknown): ContactRelevance {
  const parsed = contactRelevanceSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ContactRelevanceValidationError("Invalid contact relevance response")
  }
  return parsed.data
}