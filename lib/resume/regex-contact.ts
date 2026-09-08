import {
  normalizeEmail,
  normalizeGithub,
  normalizeLinkedIn,
  normalizePhone,
} from "@/lib/ai/schemas/cv-extract"
import { field } from "@/lib/resume/types"
import type { FieldWithConfidence } from "@/lib/resume/types"

const HEADER_LINE_LIMIT = 45

export type RegexContactResult = {
  firstName?: FieldWithConfidence<string>
  lastName?: FieldWithConfidence<string>
  email?: FieldWithConfidence<string>
  phone?: FieldWithConfidence<string>
  linkedin?: FieldWithConfidence<string>
  github?: FieldWithConfidence<string>
  website?: FieldWithConfidence<string>
  currentPosition?: FieldWithConfidence<string>
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
    /product|manager|owner|engineer|designer|developer|consultant|growth|senior|junior|lead|intern|stagiaire|freelance|cdi|cdd|bachelor|master|experience|compétence/i.test(
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
  return /[/—–-]/.test(line) ||
    /product|manager|owner|engineer|designer|developer|consultant|growth|ai|automation|builder/i.test(
      line
    )
}

/**
 * Deterministic contact extraction from CV header / body.
 * Never invents — only explicit patterns.
 */
export function extractRegexContact(cvText: string): RegexContactResult {
  const lines = headerLines(cvText)
  const blob = lines.join("\n")
  const full = cvText
  const result: RegexContactResult = {}

  const emailMatch = full.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (emailMatch) {
    const email = normalizeEmail(emailMatch[0])
    if (email) result.email = field(email, 0.99, "regex", emailMatch[0])
  }

  const labeledPhone = full.match(
    /(?:telephone|téléphone|tel|tél|phone|mobile|portable)\s*[:.]?\s*(\+?[\d][\d\s().-]{7,}\d)/i
  )
  const phoneRaw =
    labeledPhone?.[1] ??
    full.match(/(\+33[\d\s().-]{8,}\d)/)?.[1] ??
    full.match(/(?:^|[^\d])(0[67](?:[\s.-]?\d{2}){4})(?:[^\d]|$)/)?.[1]
  if (phoneRaw) {
    const phone = normalizePhone(phoneRaw)
    if (phone) result.phone = field(phone, 0.97, "regex", phoneRaw)
  }

  // Prefer full URLs before labeled "Linkedin: handle" to avoid matching "linkedin.com"
  const linkedinUrl = full.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i
  )?.[0]
  const linkedinLabeled = full.match(
    /linkedin\s*[:]\s*(@?[A-Za-z0-9_-]+|https?:\/\/\S+|www\.\S+)/i
  )
  const linkedinRaw = linkedinUrl ?? linkedinLabeled?.[1]
  if (linkedinRaw) {
    const linkedin = normalizeLinkedIn(linkedinRaw)
    if (linkedin) result.linkedin = field(linkedin, 0.96, "regex", linkedinRaw)
  }

  const githubUrl = full.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i
  )?.[0]
  const githubLabeled = full.match(
    /github\s*[:]\s*(@?[A-Za-z0-9_-]+|https?:\/\/\S+|www\.\S+)/i
  )
  const githubRaw = githubUrl ?? githubLabeled?.[1]
  if (githubRaw) {
    const github = normalizeGithub(githubRaw)
    if (github) result.github = field(github, 0.96, "regex", githubRaw)
  }

  const websiteMatch = full.match(
    /(?:website|site(?:\s+internet)?|portfolio)\s*[:.]?\s*(https?:\/\/\S+|www\.\S+)/i
  )
  if (websiteMatch?.[1] && !/linkedin\.com|github\.com/i.test(websiteMatch[1])) {
    const url = websiteMatch[1].startsWith("http")
      ? websiteMatch[1]
      : `https://${websiteMatch[1]}`
    result.website = field(url, 0.9, "regex", websiteMatch[1])
  }

  for (const line of lines) {
    if (!result.firstName && looksLikeName(line)) {
      const parts = line.split(/\s+/).filter(Boolean)
      result.firstName = field(parts[0]!, 0.9, "heuristic", line)
      result.lastName = field(parts.slice(1).join(" "), 0.9, "heuristic", line)
      continue
    }
    if (result.firstName && !result.currentPosition && looksLikeTitle(line)) {
      result.currentPosition = field(line, 0.88, "heuristic", line)
      break
    }
  }

  // Fallback: if no name from header but blob starts with two tokens
  if (!result.firstName && blob) {
    const firstLine = lines[0]
    if (firstLine && looksLikeName(firstLine)) {
      const parts = firstLine.split(/\s+/).filter(Boolean)
      result.firstName = field(parts[0]!, 0.85, "heuristic", firstLine)
      result.lastName = field(parts.slice(1).join(" "), 0.85, "heuristic", firstLine)
    }
  }

  return result
}
