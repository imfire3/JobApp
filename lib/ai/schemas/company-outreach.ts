import { z } from "zod"

const softString = z.preprocess(
  (value) => (value == null ? "" : String(value)),
  z.string()
)

export const companyOutreachSchema = z.object({
  email_subject: softString,
  email_body: softString,
  linkedin_message: softString,
})

export type CompanyOutreach = z.infer<typeof companyOutreachSchema>

export class CompanyOutreachValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CompanyOutreachValidationError"
  }
}

export function parseCompanyOutreach(raw: unknown): CompanyOutreach {
  const parsed = companyOutreachSchema.safeParse(raw)
  if (!parsed.success) {
    throw new CompanyOutreachValidationError("Invalid company outreach response")
  }
  return parsed.data
}