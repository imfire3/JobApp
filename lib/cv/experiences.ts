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
  { value: "", label: "Veuillez sélectionner" },
  { value: "onsite", label: "Sur site" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote", label: "Télétravail" },
]

export const EMPLOYMENT_TYPE_OPTIONS: { value: CvEmploymentType; label: string }[] = [
  { value: "", label: "Veuillez sélectionner" },
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

/** Append managed expériences into cv_text (no-op if none pending). */
export function mergeExperiencesIntoCvText(
  cvText: string,
  experiences: CvExperience[]
): string {
  if (experiences.length === 0) return cvText

  const blocks = experiences.map(formatExperienceBlock).join("\n\n")
  const markerIndex = cvText.indexOf(CV_EXPERIENCES_MARKER)

  if (markerIndex === -1) {
    const section = formatExperiencesSection(experiences)
    const base = cvText.trimEnd()
    return base ? `${base}\n\n${section}` : section
  }

  return `${cvText.trimEnd()}\n\n${blocks}`
}

export function clampHighlights(value: string) {
  if (value.length <= MAX_HIGHLIGHTS) return value
  return value.slice(0, MAX_HIGHLIGHTS)
}

export { MAX_HIGHLIGHTS }
