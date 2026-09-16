import { z } from "zod"

const softStringArray = z.preprocess((value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean)
}, z.array(z.string()))

export const companySearchQueriesSchema = z.object({
  queries: softStringArray,
})

export type CompanySearchQueries = z.infer<typeof companySearchQueriesSchema>

export class CompanySearchQueriesValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CompanySearchQueriesValidationError"
  }
}

export function parseCompanySearchQueries(raw: unknown): string[] {
  const parsed = companySearchQueriesSchema.safeParse(raw)
  if (!parsed.success) {
    throw new CompanySearchQueriesValidationError("Invalid company search queries response")
  }
  const queries = parsed.data.queries.filter((q) => q.length >= 3 && q.length <= 100)
  if (queries.length === 0) {
    throw new CompanySearchQueriesValidationError("No valid queries generated")
  }
  return queries.slice(0, 10)
}