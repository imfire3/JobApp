import { z } from "zod"

const stringArray = z.array(z.string()).default([])

export const trackedSearchWriteSchema = z.object({
  name: z.string().min(2),
  enabled: z.boolean().default(true),
  job_titles: stringArray,
  keywords: stringArray,
  excluded_keywords: stringArray,
  locations: stringArray,
  maximum_distance: z.number().nullable().optional(),
  remote_preference: z.string().default("any"),
  hybrid: z.boolean().default(false),
  on_site: z.boolean().default(false),
  experience: stringArray,
  contract_types: stringArray,
  minimum_salary: z.number().nullable().optional(),
  maximum_salary: z.number().nullable().optional(),
  salary_period: z.enum(["year", "day"]).default("year"),
  currency: z.string().default("EUR"),
  industries: stringArray,
  excluded_industries: stringArray,
  company_size: z.string().nullable().optional(),
  company_culture: z.string().nullable().optional(),
  company_names: stringArray,
  languages: stringArray,
  expertises: stringArray,
  only_with_salary: z.boolean().default(false),
  exclusive_only: z.boolean().default(false),
  top_recruiter_only: z.boolean().default(false),
  start_date_preference: z.string().nullable().optional(),
  publish_window: z.string().nullable().optional(),
  ai_preferences: z.record(z.string(), z.unknown()).default({}),
  minimum_match_score: z.number().nullable().optional(),
})

export const trackedSearchPatchSchema = trackedSearchWriteSchema.partial()

export type TrackedSearchWrite = z.infer<typeof trackedSearchWriteSchema>
