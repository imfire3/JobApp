import { extractCvProfile } from "@/lib/ai/cv-extract"
import {
  normalizeDateOfBirth,
  normalizeEmail,
  normalizeGithub,
  normalizeLinkedIn,
  normalizePhone,
  normalizeWebsite,
  type CvExtractedProfile,
} from "@/lib/ai/schemas/cv-extract"
import { resumeDevLog } from "@/lib/resume/normalize-text"
import { extractRegexContact } from "@/lib/resume/regex-contact"
import { detectResumeSections } from "@/lib/resume/section-detect"
import {
  field,
  type FieldWithConfidence,
  type ParsedResume,
} from "@/lib/resume/types"

function preferField<T>(
  primary: FieldWithConfidence<T> | undefined,
  secondary: FieldWithConfidence<T> | undefined
): FieldWithConfidence<T> | undefined {
  if (!primary) return secondary
  if (!secondary) return primary
  return primary.confidence >= secondary.confidence ? primary : secondary
}

function llmString(
  value: string | null | undefined,
  confidence = 0.82
): FieldWithConfidence<string> | undefined {
  if (!value?.trim()) return undefined
  return field(value.trim(), confidence, "llm")
}

function parseDateParts(value: string | undefined): {
  month: string
  year: string
} {
  if (!value) return { month: "", year: "" }
  const iso = value.match(/^(\d{4})-(\d{2})/)
  if (iso) return { month: iso[2]!, year: iso[1]! }
  const yearOnly = value.match(/(\d{4})/)
  return { month: "", year: yearOnly?.[1] ?? "" }
}

function experienceFromAi(profile: CvExtractedProfile): ParsedResume["experiences"] {
  return profile.experience_entries.map((entry) => {
    const start =
      entry.startYear
        ? `${entry.startYear}-${entry.startMonth || "01"}`
        : undefined
    const end =
      entry.isCurrent
        ? undefined
        : entry.endYear
          ? `${entry.endYear}-${entry.endMonth || "01"}`
          : undefined
    return {
      jobTitle: entry.title ? field(entry.title, 0.84, "llm") : undefined,
      company: entry.organization
        ? field(entry.organization, 0.84, "llm")
        : undefined,
      location: entry.location ? field(entry.location, 0.75, "llm") : undefined,
      startDate: start ? field(start, 0.8, "llm") : undefined,
      endDate: end ? field(end, 0.8, "llm") : undefined,
      current: field(entry.isCurrent, 0.85, "llm"),
      description: entry.highlights
        ? field(entry.highlights, 0.8, "llm")
        : undefined,
      skills:
        entry.skills.length > 0
          ? field(entry.skills, 0.78, "llm")
          : undefined,
    }
  })
}

function educationFromAi(profile: CvExtractedProfile): ParsedResume["education"] {
  return profile.education_entries.map((entry) => {
    const start =
      entry.startYear
        ? `${entry.startYear}-${entry.startMonth || "01"}`
        : undefined
    const end =
      entry.isCurrent
        ? undefined
        : entry.endYear
          ? `${entry.endYear}-${entry.endMonth || "01"}`
          : undefined
    return {
      degree: entry.name ? field(entry.name, 0.84, "llm") : undefined,
      school: entry.school ? field(entry.school, 0.84, "llm") : undefined,
      field: entry.level ? field(entry.level, 0.7, "llm") : undefined,
      startDate: start ? field(start, 0.75, "llm") : undefined,
      endDate: end ? field(end, 0.75, "llm") : undefined,
      description: entry.description
        ? field(entry.description, 0.75, "llm")
        : undefined,
    }
  })
}

function deriveSuggestedRoles(
  currentTitle: string | undefined,
  experiences: ParsedResume["experiences"]
): string[] {
  const titles = new Set<string>()
  if (currentTitle?.trim()) titles.add(currentTitle.trim())
  for (const exp of experiences) {
    const title = exp.jobTitle?.value?.trim()
    if (title) titles.add(title)
  }
  return [...titles].slice(0, 8)
}

/**
 * Parse CV text into ParsedResume: regex contact + section detect + LLM structured extract.
 */
export async function parseResume(
  cvText: string,
  options?: {
    apiKey?: string | null
    ocrUsed?: boolean
  }
): Promise<ParsedResume> {
  const sections = detectResumeSections(cvText)
  resumeDevLog("CV PARSER", `Detected ${sections.length} section(s)`, {
    ids: sections.map((s) => s.id),
  })

  const contact = extractRegexContact(cvText)
  let ai: CvExtractedProfile | null = null
  let promptVersion: string | undefined
  let model: string | undefined

  try {
    const result = await extractCvProfile(cvText, { apiKey: options?.apiKey })
    ai = result.profile
    promptVersion = result.promptVersion
    model = result.model
  } catch (error) {
    resumeDevLog("CV PARSER", "LLM extract failed — regex-only fallback", error)
  }

  const experiences = ai ? experienceFromAi(ai) : []
  const education = ai ? educationFromAi(ai) : []
  const skills =
    ai?.skills.map((name) => ({
      name,
      confidence: 0.82,
    })) ?? []
  const languages =
    ai?.language_entries.map((entry) => ({
      name: entry.language,
      level: entry.level || undefined,
      confidence: 0.8,
    })) ?? []

  const firstName = preferField(
    contact.firstName,
    llmString(ai?.first_name, 0.8)
  )
  const lastName = preferField(
    contact.lastName,
    llmString(ai?.last_name, 0.8)
  )
  const email = preferField(
    contact.email,
    ai?.email
      ? field(normalizeEmail(ai.email) ?? ai.email, 0.85, "llm")
      : undefined
  )
  const phone = preferField(
    contact.phone,
    ai?.phone
      ? field(normalizePhone(ai.phone) ?? ai.phone, 0.85, "llm")
      : undefined
  )
  const linkedin = preferField(
    contact.linkedin,
    ai?.linkedin_url
      ? field(normalizeLinkedIn(ai.linkedin_url) ?? ai.linkedin_url, 0.85, "llm")
      : undefined
  )
  const github = preferField(
    contact.github,
    ai?.github_url
      ? field(normalizeGithub(ai.github_url) ?? ai.github_url, 0.85, "llm")
      : undefined
  )
  const website = preferField(
    contact.website,
    ai?.website_url
      ? field(normalizeWebsite(ai.website_url) ?? ai.website_url, 0.8, "llm")
      : undefined
  )
  const currentPosition = preferField(
    contact.currentPosition,
    llmString(ai?.current_title, 0.82)
  )
  const birthDate = ai?.date_of_birth
    ? field(
        normalizeDateOfBirth(ai.date_of_birth) ?? ai.date_of_birth,
        0.7,
        "llm"
      )
    : undefined
  const location = llmString(ai?.current_city, 0.75)

  const suggestedRoles = deriveSuggestedRoles(
    currentPosition?.value,
    experiences
  )

  const parsed: ParsedResume = {
    personalInformation: {
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      location,
      currentPosition,
      fullName:
        firstName && lastName
          ? field(
              `${firstName.value} ${lastName.value}`,
              Math.min(firstName.confidence, lastName.confidence),
              "heuristic"
            )
          : undefined,
    },
    experiences,
    skills,
    languages,
    education,
    resources: {
      linkedin,
      github,
      website,
    },
    suggestedRoles,
    meta: {
      ocrUsed: options?.ocrUsed ?? false,
      textLength: cvText.length,
      promptVersion,
      model,
    },
  }

  resumeDevLog("CV PARSER", "Parsed resume summary", {
    firstName: firstName?.value,
    lastName: lastName?.value,
    email: email?.value,
    experiences: experiences.length,
    education: education.length,
    skills: skills.length,
    languages: languages.length,
  })

  return parsed
}

export { parseDateParts }
