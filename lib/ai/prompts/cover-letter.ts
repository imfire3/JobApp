export const COVER_LETTER_PROMPT_VERSION = "v2";

export const COVER_LETTER_SYSTEM_PROMPT = `You are a professional job application coach specializing in Product Owner and Product Manager roles in France.

Write one highly personalized cover letter using ONLY:
- the candidate's real CV
- the job mission, description, and requirements provided

Goals:
- open with a specific hook tied to the company and role (not a generic template)
- mirror 2–3 concrete requirements from the job mission with matching CV evidence
- explain what the candidate will bring in the first 90 days
- sound human, direct, and specific — like a strong candidate wrote it themselves
- avoid clichés ("passionné", "dynamique", "motivé par votre entreprise" without proof)
- do not invent experience, skills, degrees, tools, or metrics
- use the same language as the job posting (French or English)
- output only the cover letter body — no subject line, no markdown, no notes
- length: 280–420 words`;

export interface CoverLetterPromptInput {
  cvText: string;
  title: string;
  company: string;
  city: string | null;
  contractType: string | null;
  remoteMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceMinYears: number | null;
  summary: string | null;
  profile: string | null;
  skills: string[];
  description: string | null;
  aiSummary: string | null;
  url: string;
}

function formatExperienceRequirement(years: number | null): string {
  if (years === null || years === undefined) return "Not specified";
  return `At least ${years} year${years > 1 ? "s" : ""}`;
}

function formatSalaryRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Not specified";
  if (min !== null && max !== null) {
    return `${Math.round(min / 1000)}k–${Math.round(max / 1000)}k EUR/year`;
  }
  if (min !== null) return `From ${Math.round(min / 1000)}k EUR/year`;
  return `Up to ${Math.round(max! / 1000)}k EUR/year`;
}

function formatLocation(city: string | null, remoteMode: string | null): string {
  const parts = [city, remoteMode ? `(${remoteMode})` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Not specified";
}

export function buildCoverLetterUserPrompt(input: CoverLetterPromptInput): string {
  const missionBlock = [
    input.summary ? `Mission summary:\n${input.summary}` : null,
    input.profile ? `Expected profile:\n${input.profile}` : null,
    input.skills.length > 0 ? `Key skills sought:\n${input.skills.join(", ")}` : null,
    input.description ? `Full job description:\n${input.description}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `Candidate CV:
${input.cvText}

Target role:
${input.title}

Company:
${input.company}

Location:
${formatLocation(input.city, input.remoteMode)}

Contract:
${input.contractType ?? "Not specified"}

Remote mode:
${input.remoteMode ?? "Not specified"}

Salary range:
${formatSalaryRange(input.salaryMin, input.salaryMax)}

Experience requirement:
${formatExperienceRequirement(input.experienceMinYears)}

Job URL:
${input.url}

Job mission & requirements:
${missionBlock || "Not provided"}

Existing AI job summary:
${input.aiSummary ?? "Not available"}

Write a highly personalized cover letter that connects specific CV achievements to the job mission above.`;
}
