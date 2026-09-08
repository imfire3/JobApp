import { normalizeLabel } from "@/lib/resume/matchers"

export type ResumeSectionId =
  | "header"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "other"

export type ResumeSection = {
  id: ResumeSectionId
  title: string
  content: string
  startLine: number
  endLine: number
}

const SECTION_PATTERNS: Array<{ id: ResumeSectionId; patterns: RegExp[] }> = [
  {
    id: "experience",
    patterns: [
      /^(experiences?|expérience|expériences|work experience|professional experience|parcours professionnel)\b/i,
    ],
  },
  {
    id: "education",
    patterns: [
      /^(education|éducation|formation|formations|études|etudes|academic)\b/i,
    ],
  },
  {
    id: "skills",
    patterns: [
      /^(skills|compétences|competences|hard skills|soft skills|outils|tools|tech)\b/i,
    ],
  },
  {
    id: "languages",
    patterns: [/^(languages?|langues?|idiomas?)\b/i],
  },
  {
    id: "projects",
    patterns: [/^(projects?|projets?|réalisations|realisations)\b/i],
  },
]

function detectSectionTitle(line: string): ResumeSectionId | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 60) return null
  // Likely a heading if short and mostly letters
  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]/g, "").length
  if (letters < 3) return null

  for (const entry of SECTION_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(trimmed) || pattern.test(normalizeLabel(trimmed))) {
        return entry.id
      }
    }
  }
  return null
}

/**
 * Split CV text into coarse sections by common FR/EN headings.
 * Lines before the first heading are `header`.
 */
export function detectResumeSections(cvText: string): ResumeSection[] {
  const lines = cvText.split(/\r?\n/)
  const markers: Array<{ id: ResumeSectionId; title: string; line: number }> = []

  for (let i = 0; i < lines.length; i++) {
    const id = detectSectionTitle(lines[i] ?? "")
    if (id) {
      markers.push({ id, title: (lines[i] ?? "").trim(), line: i })
    }
  }

  if (markers.length === 0) {
    return [
      {
        id: "header",
        title: "Header",
        content: cvText.trim(),
        startLine: 0,
        endLine: Math.max(0, lines.length - 1),
      },
    ]
  }

  const sections: ResumeSection[] = []

  // Header = everything before first section marker
  if (markers[0]!.line > 0) {
    const headerContent = lines.slice(0, markers[0]!.line).join("\n").trim()
    if (headerContent) {
      sections.push({
        id: "header",
        title: "Header",
        content: headerContent,
        startLine: 0,
        endLine: markers[0]!.line - 1,
      })
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]!
    const end = i + 1 < markers.length ? markers[i + 1]!.line - 1 : lines.length - 1
    const content = lines
      .slice(marker.line + 1, end + 1)
      .join("\n")
      .trim()
    sections.push({
      id: marker.id,
      title: marker.title,
      content,
      startLine: marker.line,
      endLine: end,
    })
  }

  return sections
}

export function getSectionContent(
  sections: ResumeSection[],
  id: ResumeSectionId
): string {
  return sections
    .filter((s) => s.id === id)
    .map((s) => s.content)
    .join("\n\n")
    .trim()
}
