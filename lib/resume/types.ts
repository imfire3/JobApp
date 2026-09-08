export type FieldWithConfidence<T> = {
  value: T
  confidence: number
  source: "resume" | "regex" | "llm" | "heuristic"
  rawText?: string
}

export type ParsedResume = {
  personalInformation: {
    firstName?: FieldWithConfidence<string>
    lastName?: FieldWithConfidence<string>
    fullName?: FieldWithConfidence<string>
    email?: FieldWithConfidence<string>
    phone?: FieldWithConfidence<string>
    birthDate?: FieldWithConfidence<string>
    location?: FieldWithConfidence<string>
    currentPosition?: FieldWithConfidence<string>
  }
  targetJob?: {
    title?: FieldWithConfidence<string>
    roles?: FieldWithConfidence<string[]>
    industries?: FieldWithConfidence<string[]>
    keywords?: FieldWithConfidence<string[]>
  }
  experiences: Array<{
    jobTitle?: FieldWithConfidence<string>
    company?: FieldWithConfidence<string>
    industry?: FieldWithConfidence<string>
    location?: FieldWithConfidence<string>
    startDate?: FieldWithConfidence<string>
    endDate?: FieldWithConfidence<string>
    current?: FieldWithConfidence<boolean>
    description?: FieldWithConfidence<string>
    achievements?: FieldWithConfidence<string[]>
    skills?: FieldWithConfidence<string[]>
  }>
  skills: Array<{
    name: string
    category?: string
    confidence: number
  }>
  languages: Array<{
    name: string
    level?: string
    confidence: number
  }>
  education: Array<{
    degree?: FieldWithConfidence<string>
    school?: FieldWithConfidence<string>
    field?: FieldWithConfidence<string>
    startDate?: FieldWithConfidence<string>
    endDate?: FieldWithConfidence<string>
    description?: FieldWithConfidence<string>
  }>
  resources: {
    linkedin?: FieldWithConfidence<string>
    github?: FieldWithConfidence<string>
    website?: FieldWithConfidence<string>
  }
  projects?: Array<{
    name?: FieldWithConfidence<string>
    role?: FieldWithConfidence<string>
    year?: FieldWithConfidence<string>
    description?: FieldWithConfidence<string>
    technologies?: FieldWithConfidence<string[]>
  }>
  suggestedRoles: string[]
  meta: {
    ocrUsed: boolean
    textLength: number
    promptVersion?: string
    model?: string
  }
}

export const CONFIDENCE_AUTO = 0.85
export const CONFIDENCE_SUGGEST = 0.6

export const MIN_NATIVE_TEXT_LENGTH = 80
export const MIN_CV_PARSE_LENGTH = 200

export function field<T>(
  value: T,
  confidence: number,
  source: FieldWithConfidence<T>["source"],
  rawText?: string
): FieldWithConfidence<T> {
  return { value, confidence, source, rawText }
}

export function pickFieldValue<T>(
  fieldValue: FieldWithConfidence<T> | undefined,
  minConfidence = CONFIDENCE_SUGGEST
): T | undefined {
  if (!fieldValue) return undefined
  if (fieldValue.confidence < minConfidence) return undefined
  return fieldValue.value
}
