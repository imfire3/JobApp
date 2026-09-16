import { z } from "zod"
import {
  MY_IMPORTED_SOURCE_SLUG,
  SOURCE_CATALOG,
} from "@/lib/sources/constants"

const sourceSlugs = [
  MY_IMPORTED_SOURCE_SLUG,
  ...SOURCE_CATALOG.map((entry) => entry.slug),
] as [string, ...string[]]

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

const nullableScore = z.preprocess((value) => {
  if (value == null || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)))
  }
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.max(0, Math.min(100, Math.round(Number(value))))
  }
  return null
}, z.number().int().min(0).max(100).nullable())

const hoursSchema = z.preprocess((value) => {
  if (value == null || value === "") return 168
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 168
  return Math.max(1, Math.min(24 * 31, Math.round(n)))
}, z.number().int().min(1).max(24 * 31))

export const researchPlanSchema = z.object({
  roles: softStringArray.default([]),
  keywords: softStringArray.default([]),
  location: softString.default(""),
  published_within_hours: hoursSchema.default(168),
  min_match_score: nullableScore.default(null),
  source_slugs: z
    .preprocess((value) => {
      if (!Array.isArray(value)) return ["france-travail"]
      const cleaned = value
        .map((item) => String(item ?? "").trim())
        .filter((slug) => sourceSlugs.includes(slug))
      return cleaned.length > 0 ? cleaned : ["france-travail"]
    }, z.array(z.enum(sourceSlugs as [string, ...string[]])))
    .default(["france-travail"]),
  summary_fr: softString.default(""),
})

export type ResearchPlan = z.infer<typeof researchPlanSchema>

export class ResearchPlanValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResearchPlanValidationError"
  }
}

export function parseResearchPlan(raw: unknown): ResearchPlan {
  const parsed = researchPlanSchema.safeParse(raw)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new ResearchPlanValidationError(
      detail ? `Invalid research plan: ${detail}` : "Invalid research plan"
    )
  }
  let plan = parsed.data
  if (plan.roles.length === 0 && plan.keywords.length === 0) {
    plan = {
      ...plan,
      roles: ["Product Owner", "Product Manager"],
      keywords: ["Product Owner", "Product Manager"],
    }
  }
  if (!plan.summary_fr.trim()) {
    const roles = plan.roles.join(" / ") || "rôles cibles"
    const where = plan.location.trim() || "France"
    const hours = plan.published_within_hours
    const score =
      plan.min_match_score != null
        ? `, score ≥ ${plan.min_match_score}% après import`
        : ""
    plan = {
      ...plan,
      summary_fr: `Recherche ${roles} à ${where}, publiées depuis ${hours}h${score}.`,
    }
  }
  return plan
}
