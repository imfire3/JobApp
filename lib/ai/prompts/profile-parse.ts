import { CANDIDATE_POLICY, promptData } from "./candidate-policy"

export const PROFILE_PARSE_PROMPT_VERSION = "v2"
export const PROFILE_PARSE_SYSTEM_PROMPT = `${CANDIDATE_POLICY}
Extract a structured job-search profile from CV text only. Return strict JSON with all fields:
{"experiences":[],"skills":[],"languages":[],"education":[],"tools":[],"years_experience":null,"desired_salary":null,"desired_locations":[],"target_roles":[],"preferred_industries":[],"soft_skills":[],"keywords":[]}
List fields contain concise deduplicated strings. Never invent or rewrite achievements. Preserve numbers, dates and collective attribution.
Extract target_roles only from explicit professional headings or declared targets; do not invent 20 suitable titles or infer seniority. These roles are not a qualification assessment.
Preferences (salary, desired locations, industries) require an explicit candidate preference; an employer address, past salary or past sector is not a preference.
Do not infer a language level from the language of the document. years_experience: only an explicit duration or unambiguous non-overlapping dates; otherwise null. Never count concurrent periods twice.
Missing facts: null for numbers and [] for lists. No generic ATS keywords or invented hiring requirements.`

export function buildProfileParseUserPrompt(cvText: string): string {
  return `<cv_text>\n${promptData(cvText)}\n</cv_text>`
}
