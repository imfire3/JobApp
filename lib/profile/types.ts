import type { CvEmploymentType, CvLocationType } from "@/lib/cv/experiences"

export const LANGUAGE_LEVELS = [
  "Natif",
  "Bilingue",
  "Professionnel",
  "Intermédiaire",
  "Débutant",
] as const

/** Map legacy AI / stored levels onto the current enum. */
export function normalizeLanguageLevel(
  value: string | null | undefined
): LanguageLevel {
  if (!value?.trim()) return ""
  const trimmed = value.trim()
  if ((LANGUAGE_LEVELS as readonly string[]).includes(trimmed)) {
    return trimmed as (typeof LANGUAGE_LEVELS)[number]
  }
  const lower = trimmed.toLowerCase()
  if (lower.includes("maternel") || lower.includes("natif") || lower.includes("native")) {
    return "Natif"
  }
  if (lower.includes("biling")) return "Bilingue"
  if (
    lower.includes("courant") ||
    lower.includes("profession") ||
    lower.includes("fluent") ||
    lower.includes("c1") ||
    lower.includes("c2")
  ) {
    return "Professionnel"
  }
  if (lower.includes("inter") || lower.includes("b1") || lower.includes("b2")) {
    return "Intermédiaire"
  }
  if (lower.includes("début") || lower.includes("debut") || lower.includes("a1") || lower.includes("a2")) {
    return "Débutant"
  }
  return ""
}

export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number] | ""

export type ProfileExperienceEntry = {
  id: string
  title: string
  organization: string
  location: string
  locationType: CvLocationType
  employmentType: CvEmploymentType
  isCurrent: boolean
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
  highlights: string
  skills: string[]
}

export type ProfileEducationEntry = {
  id: string
  name: string
  school: string
  level: string
  isCurrent: boolean
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
  description: string
  skills: string[]
}

export type ProfileLanguageEntry = {
  id: string
  language: string
  level: LanguageLevel
}

export type CandidateProfileFields = {
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  phone: string | null
  date_of_birth: string | null
  current_city: string | null
  current_title: string | null
  bio: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  skills: string[]
  experience_entries: ProfileExperienceEntry[]
  education_entries: ProfileEducationEntry[]
  language_entries: ProfileLanguageEntry[]
  target_roles: string[]
  target_locations: string[]
  desired_salary: number | null
  remote_preference: string | null
  preferred_contract_types: string[]
  cv_file_name: string | null
  cv_file_path: string | null
  cv_file_updated_at: string | null
  profile_reviewed_at: string | null
  extracted_cv_prompt_version: string | null
}

export const REMOTE_PREFERENCE_OPTIONS = [
  { value: "occasional", label: "Télétravail occasionnel" },
  { value: "frequent", label: "Télétravail fréquent" },
  { value: "full", label: "Télétravail total" },
  { value: "onsite", label: "Présentiel" },
] as const

export const CONTRACT_TYPE_OPTIONS = [
  "CDI",
  "CDD",
  "Freelance",
  "Stage",
  "Alternance",
] as const
