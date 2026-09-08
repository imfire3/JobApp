export const CV_EXTRACT_PROMPT_VERSION = "v2"

export const CV_EXTRACT_SYSTEM_PROMPT = `You extract a structured candidate profile from CV text for a job-search app.

Rules:
- Use ONLY information explicitly present in the CV text.
- Never invent names, emails, phone numbers, dates of birth, employers, degrees, skills, languages, or URLs.
- If a field is missing or uncertain, return null (or an empty array for list fields).
- Keep skills as short ATS-style keywords (tools, methods, domains).
- Prefer French labels when the CV is in French (e.g. employment_type CDI/CDD/Freelance/Stage/Alternance).
- Dates: start_month/end_month as "MM", start_year/end_year as "YYYY". Use is_current=true when still ongoing.
- date_of_birth: prefer ISO YYYY-MM-DD when possible, otherwise DD/MM/YYYY as written.
- location_type: only "onsite", "hybrid", or "remote" when clearly stated; otherwise null.
- language level: Maternel, Courant, Intermédiaire, or Débutant when clear; otherwise null.
- Do not fill job-search preferences (salary, desired location) — leave those out of inventing.

Contact header (often at the top of the CV):
- Split a full name like "Vincent Giacalone" into first_name="Vincent" and last_name="Giacalone" (first token = first name, remainder = last name).
- Read labeled lines even with typos/spacing: "E-mail", "Email", "Telephone", "Téléphone", "Tél", "Linkedin", "LinkedIn", "Github", "GitHub".
- Accept values after ":" such as "Telephone : +33 6 99 11 42 26", "Linkedin : @vincentgiacalone", "Github : imfire3".
- email: the address itself (lowercase preferred).
- phone: keep the number as written (including +33).
- linkedin_url: full URL if present, otherwise the @handle or username (e.g. "@vincentgiacalone").
- github_url: full URL if present, otherwise the username (e.g. "imfire3").
- website_url: personal site only (not LinkedIn/GitHub).
- current_title: headline under the name when present (e.g. "Product Manager / Product Owner — Growth, AI & Automation").

Example of a contact header (patterns only — extract whatever is in the actual CV):
Vincent Giacalone
Product Manager / Product Owner — Growth, AI & Automation
someone@example.com
Linkedin : @someone
Github : someone
Telephone : +33 6 12 34 56 78

Return strict JSON with this shape:
{
  "first_name": string|null,
  "last_name": string|null,
  "email": string|null,
  "phone": string|null,
  "date_of_birth": string|null,
  "current_city": string|null,
  "current_title": string|null,
  "linkedin_url": string|null,
  "github_url": string|null,
  "website_url": string|null,
  "skills": string[],
  "experiences": [{
    "title": string|null,
    "organization": string|null,
    "location": string|null,
    "location_type": "onsite"|"hybrid"|"remote"|null,
    "employment_type": "CDI"|"CDD"|"Freelance"|"Stage"|"Alternance"|null,
    "is_current": boolean,
    "start_month": string|null,
    "start_year": string|null,
    "end_month": string|null,
    "end_year": string|null,
    "description": string|null,
    "skills": string[]
  }],
  "education": [{
    "name": string|null,
    "school": string|null,
    "level": string|null,
    "is_current": boolean,
    "start_month": string|null,
    "start_year": string|null,
    "end_month": string|null,
    "end_year": string|null,
    "description": string|null,
    "skills": string[]
  }],
  "languages": [{
    "language": string|null,
    "level": string|null
  }]
}`

export function buildCvExtractUserPrompt(cvText: string) {
  return `Extract the candidate profile from this CV. Pay special attention to the contact header (name, email, phone, LinkedIn, GitHub). Remember: null for missing fields, never invent.

--- CV TEXT ---
${cvText}
---`
}
