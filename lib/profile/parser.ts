import type { ParsedCvProfile } from "@/types";

const FALLBACK_LOCATIONS = ["Paris", "Remote", "Hybrid"];
const ROLE_KEYWORDS = [
  "Product Owner",
  "Product Manager",
  "Proxy Product Owner",
  "Product Builder",
  "AI Product Manager",
];

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function pickLinesByKeywords(text: string, keywords: string[]): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return unique(
    lines.filter((line) =>
      keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))
    )
  ).slice(0, 12);
}

function extractYearsExperience(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*\+?\s*(ans|years?)/i);
  if (!match) return null;
  return Number(match[1]);
}

function extractDesiredSalary(text: string): number | null {
  const match = text.match(/(\d{2,3})\s?k\s?(€|eur)?/i);
  if (!match) return null;
  return Number(match[1]) * 1000;
}

export function parseCvTextLocally(cvText: string): ParsedCvProfile {
  const experiences = pickLinesByKeywords(cvText, [
    "product",
    "owner",
    "manager",
    "roadmap",
    "delivery",
    "stakeholder",
  ]);
  const skills = pickLinesByKeywords(cvText, [
    "agile",
    "scrum",
    "discovery",
    "prioritization",
    "analytics",
    "kpi",
    "a/b",
  ]);
  const languages = pickLinesByKeywords(cvText, [
    "french",
    "english",
    "français",
    "anglais",
    "spanish",
    "german",
  ]);
  const education = pickLinesByKeywords(cvText, [
    "master",
    "mba",
    "bachelor",
    "universit",
    "école",
  ]);
  const tools = pickLinesByKeywords(cvText, [
    "jira",
    "notion",
    "figma",
    "sql",
    "python",
    "tableau",
    "mixpanel",
    "amplitude",
  ]);
  const preferredIndustries = pickLinesByKeywords(cvText, [
    "saas",
    "fintech",
    "health",
    "marketplace",
    "ai",
  ]);
  const softSkills = pickLinesByKeywords(cvText, [
    "communication",
    "leadership",
    "collaboration",
    "empathy",
    "problem solving",
  ]);
  const roleMatches = ROLE_KEYWORDS.filter((role) =>
    cvText.toLowerCase().includes(role.toLowerCase())
  );
  const desiredLocations = unique(
    FALLBACK_LOCATIONS.filter((location) =>
      cvText.toLowerCase().includes(location.toLowerCase())
    )
  );

  return {
    experiences,
    skills,
    languages,
    education,
    tools,
    years_experience: extractYearsExperience(cvText),
    desired_salary: extractDesiredSalary(cvText),
    desired_locations: desiredLocations.length > 0 ? desiredLocations : FALLBACK_LOCATIONS,
    target_roles: roleMatches.length > 0 ? roleMatches : ROLE_KEYWORDS.slice(0, 2),
    preferred_industries: preferredIndustries,
    soft_skills: softSkills,
    keywords: unique([...skills, ...tools]).slice(0, 20),
  };
}
