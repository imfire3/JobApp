import { z } from "zod"
import {
  emptyCvExperience,
  type CvEmploymentType,
  type CvLocationType,
} from "@/lib/cv/experiences"
import type {
  ProfileEducationEntry,
  ProfileExperienceEntry,
  ProfileLanguageEntry,
} from "@/lib/profile/types"
import { LANGUAGE_LEVELS } from "@/lib/profile/types"

const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const stringArray = z
  .array(z.string())
  .optional()
  .default([])
  .transform((values) =>
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
  )

const employmentTypeSchema = z
  .union([
    z.enum(["CDI", "CDD", "Freelance", "Stage", "Alternance"]),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value): CvEmploymentType => {
    if (!value) return ""
    return value
  })

const locationTypeSchema = z
  .union([z.enum(["onsite", "hybrid", "remote"]), z.literal(""), z.null()])
  .optional()
  .transform((value): CvLocationType => {
    if (!value) return ""
    return value
  })

const monthSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return ""
    const digits = value.replace(/\D/g, "")
    if (digits.length === 1) return `0${digits}`
    if (digits.length >= 2) return digits.slice(0, 2)
    return ""
  })

const yearSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return ""
    const digits = String(value).replace(/\D/g, "")
    return digits.length >= 4 ? digits.slice(0, 4) : digits
  })

export const cvExtractExperienceRawSchema = z.object({
  title: nullableString,
  organization: nullableString,
  location: nullableString,
  location_type: locationTypeSchema,
  employment_type: employmentTypeSchema,
  is_current: z.boolean().optional().default(false),
  start_month: monthSchema,
  start_year: yearSchema,
  end_month: monthSchema,
  end_year: yearSchema,
  description: nullableString,
  skills: stringArray,
})

export const cvExtractEducationRawSchema = z.object({
  name: nullableString,
  school: nullableString,
  level: nullableString,
  is_current: z.boolean().optional().default(false),
  start_month: monthSchema,
  start_year: yearSchema,
  end_month: monthSchema,
  end_year: yearSchema,
  description: nullableString,
  skills: stringArray,
})

const languageLevelSchema = z
  .union([z.enum(LANGUAGE_LEVELS), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return "" as const
    const normalized = value.trim()
    const match = LANGUAGE_LEVELS.find(
      (level) => level.toLowerCase() === normalized.toLowerCase()
    )
    if (match) return match
    const lower = normalized.toLowerCase()
    if (/native|maternel|maternelle|c2/.test(lower)) return "Maternel" as const
    if (/fluent|courant|bilingual|bilingue|c1/.test(lower)) return "Courant" as const
    if (/interm|b1|b2/.test(lower)) return "Intermédiaire" as const
    if (/beginner|début|debut|a1|a2|basic|bases/.test(lower)) return "Débutant" as const
    return "" as const
  })

export const cvExtractLanguageRawSchema = z.object({
  language: nullableString,
  level: languageLevelSchema,
})

/** Raw model output for structured profile extraction. */
export const cvExtractRawSchema = z.object({
  first_name: nullableString,
  last_name: nullableString,
  email: nullableString,
  phone: nullableString,
  date_of_birth: nullableString,
  current_city: nullableString,
  current_title: nullableString,
  linkedin_url: nullableString,
  github_url: nullableString,
  website_url: nullableString,
  skills: stringArray,
  experiences: z.array(cvExtractExperienceRawSchema).optional().default([]),
  education: z.array(cvExtractEducationRawSchema).optional().default([]),
  languages: z.array(cvExtractLanguageRawSchema).optional().default([]),
})

export type CvExtractRaw = z.infer<typeof cvExtractRawSchema>

export type CvExtractedProfile = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  current_city: string | null
  current_title: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  skills: string[]
  experience_entries: ProfileExperienceEntry[]
  education_entries: ProfileEducationEntry[]
  language_entries: ProfileLanguageEntry[]
}

export class CvExtractValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CvExtractValidationError"
  }
}

function newId() {
  return crypto.randomUUID()
}

export function normalizeDateOfBirth(value: string | null): string | null {
  if (!value) return null
  const slash = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (slash) {
    const day = slash[1].padStart(2, "0")
    const month = slash[2].padStart(2, "0")
    return `${slash[3]}-${month}-${day}`
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return value
  return null
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null
  return trimmed
}

export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null
  let text = value.trim()
  text = text.replace(/^(telephone|téléphone|tel|tél)\s*[:.]?\s*/i, "")
  text = text.replace(/\s+/g, " ").trim()
  if (!text) return null
  const digits = text.replace(/\D/g, "")
  if (digits.length < 8) return null
  return text
}

export function normalizeLinkedIn(value: string | null | undefined): string | null {
  if (!value) return null
  let text = value.trim()
  // Strip "Linkedin :" labels, but never "linkedin.com/…"
  text = text.replace(/^(linkedin)\s*[:]\s*/i, "").trim()
  text = text.replace(/^(linkedin)\s+(?=@|[A-Za-z0-9_-]+$)/i, "").trim()
  if (!text) return null

  if (/^https?:\/\//i.test(text)) {
    const handleMatch = text.match(/linkedin\.com\/in\/([A-Za-z0-9_-]+)/i)
    if (handleMatch) return `https://linkedin.com/in/${handleMatch[1]}`
    return text.replace(/^http:\/\//i, "https://")
  }

  const pathMatch = text.match(/(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_-]+)/i)
  if (pathMatch) {
    return `https://linkedin.com/in/${pathMatch[1]}`
  }

  if (/linkedin\.com/i.test(text) || /^www\./i.test(text)) {
    return `https://${text.replace(/^\/+/, "")}`
  }

  const handle = text.replace(/^@/, "").replace(/^\/+/, "")
  if (/^[A-Za-z0-9_-]{2,100}$/.test(handle) && !handle.includes(".")) {
    return `https://linkedin.com/in/${handle}`
  }

  return null
}

export function normalizeGithub(value: string | null | undefined): string | null {
  if (!value) return null
  let text = value.trim()
  // Strip "Github :" labels, but never "github.com/…"
  text = text.replace(/^(github)\s*[:]\s*/i, "").trim()
  text = text.replace(/^(github)\s+(?=@|[A-Za-z0-9_-]+$)/i, "").trim()
  if (!text) return null

  if (/^https?:\/\//i.test(text)) {
    return text.replace(/^http:\/\//i, "https://")
  }

  const urlMatch = text.match(/(?:www\.)?github\.com\/([A-Za-z0-9_-]+)/i)
  if (urlMatch) {
    return `https://github.com/${urlMatch[1]}`
  }

  if (/^www\./i.test(text) || /github\.com/i.test(text)) {
    return `https://${text.replace(/^\/+/, "")}`
  }

  const handle = text.replace(/^@/, "").replace(/^\/+/, "")
  if (/^[A-Za-z0-9_-]{1,100}$/.test(handle)) {
    return `https://github.com/${handle}`
  }

  return null
}

export function normalizeWebsite(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/linkedin\.com|github\.com/i.test(trimmed)) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  if (trimmed.includes(".")) return `https://${trimmed.replace(/^\/+/, "")}`
  return null
}

export function parseCvExtract(raw: unknown): CvExtractedProfile {
  let parsed: CvExtractRaw
  try {
    parsed = cvExtractRawSchema.parse(raw)
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "unexpected payload"
    throw new CvExtractValidationError(`Invalid CV extract payload: ${detail}`)
  }

  const experience_entries: ProfileExperienceEntry[] = parsed.experiences
    .filter((item) => item.title || item.organization)
    .map((item) => {
      const empty = emptyCvExperience()
      return {
        id: newId(),
        title: item.title ?? "",
        organization: item.organization ?? "",
        location: item.location ?? "",
        locationType: item.location_type ?? empty.locationType,
        employmentType: item.employment_type ?? empty.employmentType,
        isCurrent: item.is_current ?? false,
        startMonth: item.start_month || "",
        startYear: item.start_year || "",
        endMonth: item.is_current ? "" : item.end_month || "",
        endYear: item.is_current ? "" : item.end_year || "",
        highlights: item.description ?? "",
        skills: item.skills,
      }
    })

  const education_entries: ProfileEducationEntry[] = parsed.education
    .filter((item) => item.name || item.school)
    .map((item) => ({
      id: newId(),
      name: item.name ?? "",
      school: item.school ?? "",
      level: item.level ?? "",
      isCurrent: item.is_current ?? false,
      startMonth: item.start_month || "",
      startYear: item.start_year || "",
      endMonth: item.is_current ? "" : item.end_month || "",
      endYear: item.is_current ? "" : item.end_year || "",
      description: item.description ?? "",
      skills: item.skills,
    }))

  const language_entries: ProfileLanguageEntry[] = parsed.languages
    .filter((item) => item.language)
    .map((item) => ({
      id: newId(),
      language: item.language!,
      level: item.level || "",
    }))

  return {
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    email: normalizeEmail(parsed.email),
    phone: normalizePhone(parsed.phone),
    date_of_birth: normalizeDateOfBirth(parsed.date_of_birth),
    current_city: parsed.current_city,
    current_title: parsed.current_title,
    linkedin_url: normalizeLinkedIn(parsed.linkedin_url),
    github_url: normalizeGithub(parsed.github_url),
    website_url: normalizeWebsite(parsed.website_url),
    skills: parsed.skills,
    experience_entries,
    education_entries,
    language_entries,
  }
}
