import {
  normalizeEmail,
  normalizeGithub,
  normalizeLinkedIn,
  normalizePhone,
  type CvExtractedProfile,
} from "@/lib/ai/schemas/cv-extract"

const HEADER_LINE_LIMIT = 40

export type ContactFromCv = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  github_url: string | null
  current_title: string | null
}

function headerLines(cvText: string): string[] {
  return cvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, HEADER_LINE_LIMIT)
}

function looksLikeName(line: string): boolean {
  if (/@|https?:\/\//i.test(line)) return false
  if (/^(email|e-mail|telephone|téléphone|tel|tél|linkedin|github|http)/i.test(line)) {
    return false
  }
  if (
    /product|manager|owner|engineer|designer|developer|consultant|growth|senior|junior|lead|intern|stagiaire|freelance|cdi|cdd/i.test(
      line
    )
  ) {
    return false
  }
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 4) return false
  return words.every((word) => /^[\p{L}][\p{L}'’-]*$/u.test(word))
}

function looksLikeTitle(line: string): boolean {
  if (/@|https?:\/\//i.test(line)) return false
  if (/^(email|e-mail|telephone|téléphone|tel|tél|linkedin|github)/i.test(line)) {
    return false
  }
  return /product|manager|owner|engineer|designer|developer|consultant|growth|ai|automation/i.test(
    line
  )
}

/**
 * Deterministic contact extraction from the CV header.
 * Only returns values matched by explicit patterns — never invents.
 */
export function extractContactFromCvText(cvText: string): ContactFromCv {
  const lines = headerLines(cvText)
  const blob = lines.join("\n")

  let email: string | null = null
  const emailMatch = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (emailMatch) {
    email = normalizeEmail(emailMatch[0])
  }

  let phone: string | null = null
  const labeledPhone = blob.match(
    /(?:telephone|téléphone|tel|tél)\s*[:.]?\s*(\+?[\d][\d\s().-]{7,}\d)/i
  )
  if (labeledPhone) {
    phone = normalizePhone(labeledPhone[1])
  } else {
    const intlPhone = blob.match(/(\+33[\d\s().-]{8,}\d)/)
    if (intlPhone) phone = normalizePhone(intlPhone[1])
  }

  let linkedin_url: string | null = null
  const linkedinLabeled = blob.match(
    /linkedin\s*[:.]?\s*(@?[A-Za-z0-9_-]+|https?:\/\/\S+|www\.\S+)/i
  )
  if (linkedinLabeled) {
    linkedin_url = normalizeLinkedIn(linkedinLabeled[1])
  } else {
    const linkedinUrl = blob.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/i)
    if (linkedinUrl) linkedin_url = normalizeLinkedIn(linkedinUrl[0])
  }

  let github_url: string | null = null
  const githubLabeled = blob.match(
    /github\s*[:.]?\s*(@?[A-Za-z0-9_-]+|https?:\/\/\S+|www\.\S+)/i
  )
  if (githubLabeled) {
    github_url = normalizeGithub(githubLabeled[1])
  } else {
    const githubUrl = blob.match(/github\.com\/[A-Za-z0-9_-]+/i)
    if (githubUrl) github_url = normalizeGithub(githubUrl[0])
  }

  let first_name: string | null = null
  let last_name: string | null = null
  let current_title: string | null = null

  for (const line of lines) {
    if (!first_name && looksLikeName(line)) {
      const parts = line.split(/\s+/).filter(Boolean)
      first_name = parts[0] ?? null
      last_name = parts.slice(1).join(" ") || null
      continue
    }
    if (first_name && !current_title && looksLikeTitle(line)) {
      current_title = line
      break
    }
  }

  return {
    first_name,
    last_name,
    email,
    phone,
    linkedin_url,
    github_url,
    current_title,
  }
}

/** Prefer AI values; fill holes from deterministic header parse. */
export function mergeContactIntoExtract(
  ai: CvExtractedProfile,
  contact: ContactFromCv
): CvExtractedProfile {
  return {
    ...ai,
    first_name: ai.first_name ?? contact.first_name,
    last_name: ai.last_name ?? contact.last_name,
    email: ai.email ?? contact.email,
    phone: ai.phone ?? contact.phone,
    linkedin_url: ai.linkedin_url ?? contact.linkedin_url,
    github_url: ai.github_url ?? contact.github_url,
    current_title: ai.current_title ?? contact.current_title,
  }
}
