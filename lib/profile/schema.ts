import { z } from "zod"
import { LANGUAGE_LEVELS } from "@/lib/profile/types"

const optionalNullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value == null) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const employmentTypeSchema = z.enum([
  "CDI",
  "CDD",
  "Freelance",
  "Stage",
  "Alternance",
  "",
])

const locationTypeSchema = z.enum(["onsite", "hybrid", "remote", ""])

const languageLevelSchema = z.union([
  z.enum(LANGUAGE_LEVELS),
  z.literal(""),
])

export const profileExperienceEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  organization: z.string(),
  location: z.string().default(""),
  locationType: locationTypeSchema.default(""),
  employmentType: employmentTypeSchema.default(""),
  isCurrent: z.boolean().default(false),
  startMonth: z.string().default(""),
  startYear: z.string().default(""),
  endMonth: z.string().default(""),
  endYear: z.string().default(""),
  highlights: z.string().default(""),
  skills: z.array(z.string()).default([]),
})

export const profileEducationEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  school: z.string().default(""),
  level: z.string().default(""),
  isCurrent: z.boolean().default(false),
  startMonth: z.string().default(""),
  startYear: z.string().default(""),
  endMonth: z.string().default(""),
  endYear: z.string().default(""),
  description: z.string().default(""),
  skills: z.array(z.string()).default([]),
})

export const profileLanguageEntrySchema = z.object({
  id: z.string().min(1),
  language: z.string().min(1),
  level: languageLevelSchema.default(""),
})

const urlSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined
    if (value == null || value.trim() === "") return null
    const trimmed = value.trim()
    if (!/^https?:\/\//i.test(trimmed) && !/^www\./i.test(trimmed) && !/linkedin\.com/i.test(trimmed)) {
      // Allow empty-ish and relative-looking values as plain strings if they look like URLs
      if (!trimmed.includes(".") && !trimmed.includes("/")) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid URL",
        })
        return z.NEVER
      }
    }
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed.replace(/^\/+/, "")}`
  })

const dateOfBirthSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined
    if (value == null || value.trim() === "") return null
    const trimmed = value.trim()
    const slash = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
    if (slash) {
      return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    ctx.addIssue({ code: "custom", message: "Invalid date of birth" })
    return z.NEVER
  })

const emailSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined
    if (value == null || value.trim() === "") return null
    const trimmed = value.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      ctx.addIssue({ code: "custom", message: "Invalid email" })
      return z.NEVER
    }
    return trimmed
  })

export const candidateProfileUpdateSchema = z.object({
  cv_text: z.string().optional(),
  first_name: optionalNullableString,
  last_name: optionalNullableString,
  contact_email: emailSchema,
  phone: optionalNullableString,
  date_of_birth: dateOfBirthSchema,
  current_city: optionalNullableString,
  current_title: optionalNullableString,
  bio: optionalNullableString,
  linkedin_url: urlSchema,
  github_url: urlSchema,
  website_url: urlSchema,
  skills: z.array(z.string()).optional(),
  experience_entries: z.array(profileExperienceEntrySchema).optional(),
  education_entries: z.array(profileEducationEntrySchema).optional(),
  language_entries: z.array(profileLanguageEntrySchema).optional(),
  target_roles: z.array(z.string()).optional(),
  target_locations: z.array(z.string()).optional(),
  desired_salary: z.union([z.number().int().min(0), z.null()]).optional(),
  remote_preference: optionalNullableString,
  preferred_contract_types: z.array(z.string()).optional(),
  profile_reviewed: z.boolean().optional(),
  extracted_cv: z.unknown().optional(),
  extracted_cv_prompt_version: optionalNullableString,
})

export type CandidateProfileUpdate = z.infer<typeof candidateProfileUpdateSchema>

const PROFILE_SELECT_COLUMNS = [
  "first_name",
  "last_name",
  "contact_email",
  "phone",
  "date_of_birth",
  "current_city",
  "current_title",
  "bio",
  "linkedin_url",
  "github_url",
  "website_url",
  "skills",
  "experience_entries",
  "education_entries",
  "language_entries",
  "target_roles",
  "target_locations",
  "desired_salary",
  "remote_preference",
  "ai_preferences",
  "extracted_cv",
  "extracted_cv_prompt_version",
  "profile_reviewed_at",
  "cv_file_name",
  "cv_file_path",
  "cv_file_updated_at",
].join(",")

export function profileSelectColumns() {
  return PROFILE_SELECT_COLUMNS
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

export function asObjectArray<T>(value: unknown, parseOne: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      try {
        return parseOne(item)
      } catch {
        return null
      }
    })
    .filter((item): item is T => item != null)
}

export function parseExperienceEntries(value: unknown) {
  return asObjectArray(value, (item) => {
    const parsed = profileExperienceEntrySchema.safeParse(item)
    return parsed.success ? parsed.data : null
  })
}

export function parseEducationEntries(value: unknown) {
  return asObjectArray(value, (item) => {
    const parsed = profileEducationEntrySchema.safeParse(item)
    return parsed.success ? parsed.data : null
  })
}

export function parseLanguageEntries(value: unknown) {
  return asObjectArray(value, (item) => {
    const parsed = profileLanguageEntrySchema.safeParse(item)
    return parsed.success ? parsed.data : null
  })
}

export function preferredContractsFromAiPreferences(aiPreferences: unknown): string[] {
  if (!aiPreferences || typeof aiPreferences !== "object") return []
  const contracts = (aiPreferences as { preferred_contract_types?: unknown })
    .preferred_contract_types
  return asStringArray(contracts)
}
