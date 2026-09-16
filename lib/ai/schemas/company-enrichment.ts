import { z } from "zod"

const softString = z.preprocess(
  (value) => (value == null ? "" : String(value)),
  z.string()
)

const softStringArray = z.preprocess((value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean)
}, z.array(z.string()))

const nullableSize = z.preprocess((value) => {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.max(1, Math.min(100000, Math.round(n)))
}, z.number().int().min(1).max(100000).nullable())

export const companyEnrichmentSchema = z.object({
  name: softString,
  activity: softString.default(""),
  products: softStringArray.default([]),
  positioning: softString.default(""),
  keywords: softStringArray.default([]),
  sector: softString.default(""),
  headquarters: softString.default(""),
  size_min: nullableSize.default(null),
  size_max: nullableSize.default(null),
  description: softString.default(""),
  sources: softStringArray.default([]),
})

export type CompanyEnrichment = z.infer<typeof companyEnrichmentSchema>

export class CompanyEnrichmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CompanyEnrichmentValidationError"
  }
}

export function parseCompanyEnrichment(raw: unknown): CompanyEnrichment {
  const parsed = companyEnrichmentSchema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new CompanyEnrichmentValidationError(
      detail ? `Invalid company enrichment: ${detail}` : "Invalid company enrichment"
    )
  }
  return parsed.data
}