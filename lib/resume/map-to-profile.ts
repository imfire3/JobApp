import { emptyCvExperience } from "@/lib/cv/experiences"
import { emptyEducationEntry } from "@/lib/profile/helpers"
import type {
  CandidateProfileFields,
  ProfileEducationEntry,
  ProfileExperienceEntry,
  ProfileLanguageEntry,
} from "@/lib/profile/types"
import { LANGUAGE_LEVELS } from "@/lib/profile/types"
import { resumeDevLog } from "@/lib/resume/normalize-text"
import {
  CONFIDENCE_SUGGEST,
  pickFieldValue,
  type FieldWithConfidence,
  type ParsedResume,
} from "@/lib/resume/types"

export type ProfileDraft = CandidateProfileFields & {
  suggested_roles: string[]
}

function mapLanguageLevel(level: string | undefined): ProfileLanguageEntry["level"] {
  if (!level) return ""
  const match = LANGUAGE_LEVELS.find(
    (item) => item.toLowerCase() === level.toLowerCase()
  )
  if (match) return match
  const lower = level.toLowerCase()
  if (/native|maternel|maternelle|c2/.test(lower)) return "Maternel"
  if (/fluent|courant|bilingual|bilingue|c1/.test(lower)) return "Courant"
  if (/interm|b1|b2/.test(lower)) return "Intermédiaire"
  if (/beginner|début|debut|a1|a2|basic|bases/.test(lower)) return "Débutant"
  return ""
}

function dateFieldToMonthYear(value: string | undefined): {
  month: string
  year: string
} {
  if (!value) return { month: "", year: "" }
  const iso = value.match(/^(\d{4})-(\d{2})/)
  if (iso) return { month: iso[2]!, year: iso[1]! }
  const yearOnly = value.match(/(\d{4})/)
  return { month: "", year: yearOnly?.[1] ?? "" }
}

function gateString(
  fieldValue: FieldWithConfidence<string> | undefined
): string | null {
  const value = pickFieldValue(fieldValue, CONFIDENCE_SUGGEST)
  return value?.trim() ? value.trim() : null
}

/**
 * Map ParsedResume → form draft.
 * confidence ≥ 0.85 auto-filled, 0.60–0.84 prefilled, < 0.60 empty.
 * Never invents languages / birth / location when absent.
 * suggested_roles are chips only — not written to target_roles.
 */
export function mapParsedResumeToProfileDraft(
  parsed: ParsedResume
): ProfileDraft {
  const experiences: ProfileExperienceEntry[] = parsed.experiences
    .map((exp) => {
      const title = pickFieldValue(exp.jobTitle, CONFIDENCE_SUGGEST) ?? ""
      const organization = pickFieldValue(exp.company, CONFIDENCE_SUGGEST) ?? ""
      if (!title && !organization) return null

      const start = dateFieldToMonthYear(
        pickFieldValue(exp.startDate, CONFIDENCE_SUGGEST)
      )
      const end = dateFieldToMonthYear(
        pickFieldValue(exp.endDate, CONFIDENCE_SUGGEST)
      )
      const isCurrent =
        pickFieldValue(exp.current, CONFIDENCE_SUGGEST) === true

      const empty = emptyCvExperience()
      return {
        id: crypto.randomUUID(),
        title,
        organization,
        location: pickFieldValue(exp.location, CONFIDENCE_SUGGEST) ?? "",
        locationType: empty.locationType,
        employmentType: empty.employmentType,
        isCurrent,
        startMonth: start.month || empty.startMonth,
        startYear: start.year || empty.startYear,
        endMonth: isCurrent ? "" : end.month,
        endYear: isCurrent ? "" : end.year,
        highlights: pickFieldValue(exp.description, CONFIDENCE_SUGGEST) ?? "",
        skills: pickFieldValue(exp.skills, CONFIDENCE_SUGGEST) ?? [],
      } satisfies ProfileExperienceEntry
    })
    .filter((item): item is ProfileExperienceEntry => item != null)

  const education = parsed.education
    .map((edu): ProfileEducationEntry | null => {
      const name = pickFieldValue(edu.degree, CONFIDENCE_SUGGEST) ?? ""
      const school = pickFieldValue(edu.school, CONFIDENCE_SUGGEST) ?? ""
      if (!name && !school) return null
      const start = dateFieldToMonthYear(
        pickFieldValue(edu.startDate, CONFIDENCE_SUGGEST)
      )
      const end = dateFieldToMonthYear(
        pickFieldValue(edu.endDate, CONFIDENCE_SUGGEST)
      )
      const base = emptyEducationEntry()
      return {
        id: crypto.randomUUID(),
        name,
        school,
        level: pickFieldValue(edu.field, CONFIDENCE_SUGGEST) ?? "",
        isCurrent: false,
        startMonth: start.month || base.startMonth,
        startYear: start.year || base.startYear,
        endMonth: end.month,
        endYear: end.year,
        description: pickFieldValue(edu.description, CONFIDENCE_SUGGEST) ?? "",
        skills: [],
      }
    })
    .filter((item): item is ProfileEducationEntry => item != null)

  const languages: ProfileLanguageEntry[] = parsed.languages
    .filter((lang) => lang.confidence >= CONFIDENCE_SUGGEST && lang.name.trim())
    .map((lang) => ({
      id: crypto.randomUUID(),
      language: lang.name.trim(),
      level: mapLanguageLevel(lang.level),
    }))

  const skills = parsed.skills
    .filter((skill) => skill.confidence >= CONFIDENCE_SUGGEST && skill.name.trim())
    .map((skill) => skill.name.trim())

  const draft: ProfileDraft = {
    first_name: gateString(parsed.personalInformation.firstName),
    last_name: gateString(parsed.personalInformation.lastName),
    contact_email: gateString(parsed.personalInformation.email),
    phone: gateString(parsed.personalInformation.phone),
    date_of_birth: gateString(parsed.personalInformation.birthDate),
    current_city: gateString(parsed.personalInformation.location),
    current_title: gateString(parsed.personalInformation.currentPosition),
    linkedin_url: gateString(parsed.resources.linkedin),
    github_url: gateString(parsed.resources.github),
    website_url: gateString(parsed.resources.website),
    skills: [...new Set(skills)],
    experience_entries: experiences,
    education_entries: education,
    language_entries: languages,
    // Job recherché: suggestions only — never auto-save target_roles from CV
    target_roles: [],
    target_locations: [],
    desired_salary: null,
    remote_preference: null,
    preferred_contract_types: [],
    cv_file_name: null,
    cv_file_path: null,
    cv_file_updated_at: null,
    profile_reviewed_at: null,
    extracted_cv_prompt_version: parsed.meta.promptVersion ?? null,
    suggested_roles: [...new Set(parsed.suggestedRoles.filter(Boolean))],
  }

  resumeDevLog("PROFILE MAPPING", "Draft mapped", {
    first_name: draft.first_name,
    contact_email: draft.contact_email,
    experiences: draft.experience_entries.length,
    education: draft.education_entries.length,
    skills: draft.skills.length,
    suggested_roles: draft.suggested_roles,
  })

  return draft
}

/** Serialize draft fields suitable for extracted_cv JSON snapshot (no final profile columns). */
export function draftToExtractedSnapshot(draft: ProfileDraft) {
  return {
    first_name: draft.first_name,
    last_name: draft.last_name,
    email: draft.contact_email,
    phone: draft.phone,
    date_of_birth: draft.date_of_birth,
    current_city: draft.current_city,
    current_title: draft.current_title,
    linkedin_url: draft.linkedin_url,
    github_url: draft.github_url,
    website_url: draft.website_url,
    skills: draft.skills,
    experience_entries: draft.experience_entries,
    education_entries: draft.education_entries,
    language_entries: draft.language_entries,
    suggested_roles: draft.suggested_roles,
  }
}
