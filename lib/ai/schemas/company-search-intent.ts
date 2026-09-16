import { z } from "zod"
import type { CompanySearchCriteria } from "@/types"

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

const booleanSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value
  if (value == null || value === "") return false
  const raw = String(value).trim().toLowerCase()
  return ["true", "yes", "oui", "1", "remote", "télétravail", "teletravail"].includes(raw)
}, z.boolean())

export const companySearchIntentSchema = z.object({
  roles: softStringArray.default([]),
  sectors: softStringArray.default([]),
  locations: softStringArray.default([]),
  size_min: nullableSize.default(null),
  size_max: nullableSize.default(null),
  remote: booleanSchema.default(false),
  priority: softString.default(""),
  summary_fr: softString.default(""),
})

export type CompanySearchIntent = z.infer<typeof companySearchIntentSchema>

export class CompanySearchIntentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CompanySearchIntentValidationError"
  }
}

export function parseCompanySearchIntent(raw: unknown): CompanySearchCriteria {
  const parsed = companySearchIntentSchema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new CompanySearchIntentValidationError(
      detail ? `Invalid company search intent: ${detail}` : "Invalid company search intent"
    )
  }
  const data = parsed.data
  const roles = data.roles.length > 0 ? data.roles : ["Product Owner", "Product Manager"]
  const summary =
    data.summary_fr.trim() ||
    `Prospection ${roles.join(" / ")}${data.sectors.length ? ` en ${data.sectors.join(", ")}` : ""}${data.locations.length ? ` à ${data.locations.join(", ")}` : ""}.`
  const size =
    data.size_min != null || data.size_max != null
      ? [data.size_min ?? 1, data.size_max ?? 10000]
      : [null, null]
  return {
    roles,
    sectors: data.sectors,
    locations: data.locations,
    size_min: size[0],
    size_max: size[1],
    remote: data.remote,
    priority: data.priority || undefined,
    summary_fr: summary,
  }
}