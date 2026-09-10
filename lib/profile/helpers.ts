import { emptyCvExperience } from "@/lib/cv/experiences"
import type {
  ProfileEducationEntry,
  ProfileExperienceEntry,
  ProfileLanguageEntry,
} from "@/lib/profile/types"

export function emptyExperienceEntry(): ProfileExperienceEntry {
  return {
    id: crypto.randomUUID(),
    ...emptyCvExperience(),
  }
}

export function emptyEducationEntry(): ProfileEducationEntry {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    name: "",
    school: "",
    level: "",
    isCurrent: false,
    startMonth: String(now.getMonth() + 1).padStart(2, "0"),
    startYear: String(now.getFullYear()),
    endMonth: "",
    endYear: "",
    description: "",
    skills: [],
  }
}

export function emptyLanguageEntry(): ProfileLanguageEntry {
  return {
    id: crypto.randomUUID(),
    language: "",
    level: "",
  }
}

export function formatDisplayDate(isoDate: string | null | undefined) {
  if (!isoDate) return ""
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return isoDate
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function parseDisplayDateToIso(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const slash = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  return trimmed
}
