import { z } from "zod"

const softStringArray = z.preprocess((value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean)
}, z.array(z.string()))

const scoreOrUnknown = z.preprocess((value) => {
  if (value === "unknown" || value === null || value === undefined) return null
  if (typeof value === "string" && value.toLowerCase() === "unknown") return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}, z.number().int().min(0).max(100).nullable())

export const companyMatchSchema = z.object({
  roleMatch: scoreOrUnknown,
  industryMatch: scoreOrUnknown,
  skillsMatch: scoreOrUnknown,
  locationMatch: scoreOrUnknown,
  productMaturity: scoreOrUnknown,
  hiringPotential: scoreOrUnknown,
  suggestedRoles: softStringArray.default([]),
  strengths: softStringArray.default([]),
  risks: softStringArray.default([]),
  reason: z.preprocess(
    (value) => (value == null ? "" : String(value)),
    z.string()
  ),
  confidence: z.preprocess((value) => {
    if (value == null) return "low"
    const raw = String(value).trim().toLowerCase()
    if (["high", "medium", "low"].includes(raw)) return raw
    return "low"
  }, z.enum(["high", "medium", "low"])),
})

export type CompanyMatchResult = z.infer<typeof companyMatchSchema>

export class CompanyMatchValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CompanyMatchValidationError"
  }
}

export function parseCompanyMatch(raw: unknown): CompanyMatchResult {
  const parsed = companyMatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw new CompanyMatchValidationError("Invalid company match response")
  }
  return parsed.data
}

export function calculateCompanyMatchScore(match: CompanyMatchResult): number {
  const weights = {
    roleMatch: 0.30,
    industryMatch: 0.25,
    skillsMatch: 0.20,
    locationMatch: 0.10,
    productMaturity: 0.10,
    hiringPotential: 0.05,
  }

  let totalWeight = 0
  let weightedSum = 0

  for (const [key, weight] of Object.entries(weights)) {
    const value = match[key as keyof typeof weights]
    if (value != null) {
      weightedSum += value * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) return 0
  return Math.round((weightedSum / totalWeight) * 100)
}