import type { SearchCriteria } from "@/types";

export const SOURCE_CATALOG = [
  { name: "Welcome to the Jungle", slug: "welcome-to-the-jungle", status: "connected" },
  { name: "LinkedIn Jobs", slug: "linkedin-jobs", status: "not_configured" },
  { name: "Indeed", slug: "indeed", status: "not_configured" },
  { name: "APEC", slug: "apec", status: "not_configured" },
  { name: "Hellowork", slug: "hellowork", status: "not_configured" },
  { name: "France Travail", slug: "france-travail", status: "not_configured" },
  { name: "LesJeudis", slug: "lesjeudis", status: "not_configured" },
  { name: "Talent.io", slug: "talent-io", status: "not_configured" },
] as const;

export const DEFAULT_SOURCE_SEARCHES = [
  {
    sourceSlug: "welcome-to-the-jungle",
    name: "Product Owner Paris",
    criteria: {
      job_titles: ["Product Owner"],
      location: "Paris",
      remote_preference: "hybrid",
      contract_types: ["CDI"],
      experience_levels: ["mid", "senior"],
    },
  },
  {
    sourceSlug: "welcome-to-the-jungle",
    name: "Product Manager Paris",
    criteria: {
      job_titles: ["Product Manager"],
      location: "Paris",
      remote_preference: "hybrid",
      contract_types: ["CDI"],
      experience_levels: ["mid", "senior"],
    },
  },
  {
    sourceSlug: "welcome-to-the-jungle",
    name: "AI Product Manager",
    criteria: {
      job_titles: ["AI Product Manager", "Product Manager IA"],
      location: "Paris",
      keywords: ["AI", "LLM", "GenAI"],
    },
  },
  {
    sourceSlug: "welcome-to-the-jungle",
    name: "Product Builder",
    criteria: {
      job_titles: ["Product Builder"],
      location: "Paris",
      remote_preference: "remote_only",
    },
  },
] as const;

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
  job_titles: [],
  similar_jobs: true,
  experience_levels: [],
  location: "Paris",
  remote_preference: "any",
  contract_types: [],
  minimum_salary: null,
  salary_currency: "EUR",
  only_jobs_with_salary: false,
  company_preferences: "",
  industries: [],
  excluded_industries: [],
  keywords: [],
  excluded_keywords: [],
  source_specific: {},
};
