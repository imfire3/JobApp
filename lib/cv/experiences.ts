export type CvLocationType = "onsite" | "hybrid" | "remote" | ""
export type CvEmploymentType =
  | "CDI"
  | "CDD"
  | "Freelance"
  | "Stage"
  | "Alternance"
  | ""

export type CvExperience = {
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

export const CV_EXPERIENCES_MARKER = "## Expériences ajoutées"

export const MONTH_OPTIONS = [
  { value: "01", label: "janvier" },
  { value: "02", label: "février" },
  { value: "03", label: "mars" },
  { value: "04", label: "avril" },
  { value: "05", label: "mai" },
  { value: "06", label: "juin" },
  { value: "07", label: "juillet" },
  { value: "08", label: "août" },
  { value: "09", label: "septembre" },
  { value: "10", label: "octobre" },
  { value: "11", label: "novembre" },
  { value: "12", label: "décembre" },
] as const

export const LOCATION_TYPE_OPTIONS: { value: CvLocationType; label: string }[] = [
  { value: "", label: "Sélectionne un lieu" },
  { value: "onsite", label: "Sur site" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote", label: "Télétravail" },
]

export const EMPLOYMENT_TYPE_OPTIONS: { value: CvEmploymentType; label: string }[] = [
  { value: "", label: "Sélectionne un type d’emploi" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Freelance", label: "Freelance" },
  { value: "Stage", label: "Stage" },
  { value: "Alternance", label: "Alternance" },
]

const MAX_HIGHLIGHTS = 2000

export function emptyCvExperience(): Omit<CvExperience, "id"> {
  const now = new Date()
  return {
    title: "",
    organization: "",
    location: "",
    locationType: "",
    employmentType: "",
    isCurrent: false,
    startMonth: String(now.getMonth() + 1).padStart(2, "0"),
    startYear: String(now.getFullYear()),
    endMonth: "",
    endYear: "",
    highlights: "",
    skills: [],
  }
}

function monthLabel(value: string) {
  return MONTH_OPTIONS.find((month) => month.value === value)?.label ?? value
}

function locationTypeLabel(value: CvLocationType) {
  if (!value) return ""
  return LOCATION_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? ""
}

export function formatExperienceBlock(experience: CvExperience): string {
  const start = [monthLabel(experience.startMonth), experience.startYear]
    .filter(Boolean)
    .join(" ")
  const end = experience.isCurrent
    ? "présent"
    : [monthLabel(experience.endMonth), experience.endYear].filter(Boolean).join(" ")
  const period = [start, end].filter(Boolean).join(" – ")

  const meta = [
    experience.employmentType,
    experience.location,
    locationTypeLabel(experience.locationType),
  ]
    .filter(Boolean)
    .join(" · ")

  const lines = [
    `${experience.title} — ${experience.organization}`,
    period + (meta ? ` · ${meta}` : ""),
  ]

  const highlights = experience.highlights.trim()
  if (highlights) {
    lines.push("")
    for (const line of highlights.split(/\n+/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      lines.push(trimmed.startsWith("•") || trimmed.startsWith("-") ? trimmed : `• ${trimmed}`)
    }
  }

  if (experience.skills.length > 0) {
    lines.push("")
    lines.push(`Compétences : ${experience.skills.join(", ")}`)
  }

  return lines.join("\n")
}

export function formatExperiencesSection(experiences: CvExperience[]): string {
  if (experiences.length === 0) return ""
  return [CV_EXPERIENCES_MARKER, "", ...experiences.map(formatExperienceBlock).flatMap((block, index) =>
    index === 0 ? [block] : ["", block]
  )].join("\n")
}

/**
 * Append managed expériences into cv_text.
 * The managed section (from the marker to the end of the text) is replaced so
 * that saving twice never duplicates the section.
 */
export function mergeExperiencesIntoCvText(
  cvText: string,
  experiences: CvExperience[]
): string {
  if (experiences.length === 0) return cvText

  const markerIndex = cvText.indexOf(CV_EXPERIENCES_MARKER)
  const base = markerIndex === -1 ? cvText.trimEnd() : cvText.slice(0, markerIndex).trimEnd()
  const section = formatExperiencesSection(experiences)

  return base ? `${base}\n\n${section}` : section
}

export function clampHighlights(value: string) {
  if (value.length <= MAX_HIGHLIGHTS) return value
  return value.slice(0, MAX_HIGHLIGHTS)
}

export function formatMonthYear(month: string, year: string) {
  const cleanYear = year.trim()
  if (!cleanYear) return ""
  const cleanMonth = month.trim()
  if (!cleanMonth) return cleanYear
  return `${cleanMonth.padStart(2, "0")}/${cleanYear}`
}

export function parseMonthYear(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { month: "", year: "" }

  const dayFirst = trimmed.match(/^(\d{1,2})\s*[/\-.]\s*(\d{4})$/)
  if (dayFirst) {
    const month = Number(dayFirst[1])
    return {
      month: month >= 1 && month <= 12 ? String(month).padStart(2, "0") : "",
      year: dayFirst[2],
    }
  }

  const yearFirst = trimmed.match(/^(\d{4})\s*[/\-.]\s*(\d{1,2})$/)
  if (yearFirst) {
    const month = Number(yearFirst[2])
    return {
      month: month >= 1 && month <= 12 ? String(month).padStart(2, "0") : "",
      year: yearFirst[1],
    }
  }

  return { month: "", year: "" }
}

export function isMonthYearValid(value: string) {
  const parsed = parseMonthYear(value)
  return parsed.month !== "" && parsed.year !== ""
}

function monthValueFromLabel(label: string) {
  return MONTH_OPTIONS.find((month) => month.label === label.toLowerCase())?.value ?? ""
}

function parsePeriodPart(part: string) {
  const tokens = part.trim().split(/\s+/).filter(Boolean)
  const year = tokens.find((token) => /^\d{4}$/.test(token)) ?? ""
  const monthLabel = tokens.find((token) => monthValueFromLabel(token) !== "")
  return { month: monthLabel ? monthValueFromLabel(monthLabel) : "", year }
}

function parsePeriod(period: string) {
  const [startPart = "", endPart = ""] = period.split("–")
  const start = parsePeriodPart(startPart)
  const isCurrent = endPart.trim().toLowerCase() === "présent"
  const end = isCurrent ? { month: "", year: "" } : parsePeriodPart(endPart)
  return { startMonth: start.month, startYear: start.year, endMonth: end.month, endYear: end.year, isCurrent }
}

function parseExperienceBlock(block: string, index: number): CvExperience | null {
  const paragraphs = block.split(/\n\s*\n/)
  const headerLines = (paragraphs[0] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const titleLine = headerLines[0] ?? ""
  if (!titleLine) return null

  const separatorIndex = titleLine.indexOf("—")
  const title = separatorIndex === -1 ? titleLine : titleLine.slice(0, separatorIndex).trim()
  const organization = separatorIndex === -1 ? "" : titleLine.slice(separatorIndex + 1).trim()

  const metaParts = (headerLines[1] ?? "").split("·").map((part) => part.trim()).filter(Boolean)
  const period = metaParts.shift() ?? ""
  const periodData = parsePeriod(period)

  let location = ""
  let locationType: CvLocationType = ""
  let employmentType: CvEmploymentType = ""
  for (const part of metaParts) {
    const employment = EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value !== "" && option.label === part)
    if (employment) {
      employmentType = employment.value
      continue
    }
    const locationOption = LOCATION_TYPE_OPTIONS.find((option) => option.value !== "" && option.label === part)
    if (locationOption) {
      locationType = locationOption.value
      continue
    }
    location = part
  }

  let highlights = ""
  let skills: string[] = []
  for (const paragraph of paragraphs.slice(1)) {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) continue
    if (lines[0].startsWith("Compétences")) {
      skills = lines[0]
        .replace(/^Compétences\s*:\s*/, "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
      continue
    }
    highlights = lines.join("\n")
  }

  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${index}`

  return {
    id: `exp-${randomId}`,
    title,
    organization,
    location,
    locationType,
    employmentType,
    isCurrent: periodData.isCurrent,
    startMonth: periodData.startMonth,
    startYear: periodData.startYear,
    endMonth: periodData.endMonth,
    endYear: periodData.endYear,
    highlights,
    skills,
  }
}

/**
 * An experience block starts with a "Title — Organization" line.
 * Bullets and "Compétences" lines never start a new block.
 */
const EXPERIENCE_HEADER = /^(?![-•*])\s*(.+?)\s+—\s+(.+)$/

function splitExperienceBlocks(section: string): string[] {
  const blocks: string[] = []
  let current: string[] = []

  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim()
    if (EXPERIENCE_HEADER.test(line)) {
      if (current.some((entry) => entry.trim())) blocks.push(current.join("\n"))
      current = [rawLine]
      continue
    }
    current.push(rawLine)
  }

  if (current.some((entry) => entry.trim())) blocks.push(current.join("\n"))
  return blocks
}

/** Read back the managed experiences (with their dates) from a CV text. */
export function parseExperiencesSection(cvText: string): CvExperience[] {
  const markerIndex = cvText.indexOf(CV_EXPERIENCES_MARKER)
  if (markerIndex === -1) return []
  const section = cvText.slice(markerIndex + CV_EXPERIENCES_MARKER.length)
  return splitExperienceBlocks(section)
    .map((block, index) => parseExperienceBlock(block, index))
    .filter((experience): experience is CvExperience => experience !== null)
}

export { MAX_HIGHLIGHTS }
