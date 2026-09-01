/**
 * Normalizes a raw Welcome to the Jungle Apify dataset item into a Supabase jobs row.
 */

export type WttjRemoteMode = "onsite" | "hybrid" | "remote" | "unknown";

export interface WttjOffice {
  city?: string | null;
  district?: string | null;
  country_code?: string | null;
}

export interface WttjSkillItem {
  name?: {
    fr?: string | null;
    en?: string | null;
  } | null;
}

export interface WttjToolItem {
  name?: string | null;
}

export type WttjApifyItem = Record<string, unknown> & {
  id?: string | number | null;
  reference?: string | null;
  name?: string | null;
  url?: string | null;
  contractType?: string | null;
  remote?: string | null;
  language?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  experienceLevel?: number | null;
  educationLevel?: string | null;
  publishedAt?: string | null;
  category?: string | null;
  subcategory?: string | null;
  sectors?: string[] | null;
  summary?: string | null;
  offices?: WttjOffice[] | null;
  benefits?: string[] | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  organizationLogo?: string | null;
  organizationEmployees?: number | null;
  organizationWebsite?: string | null;
  organizationIndustry?: string | null;
  description?: string | null;
  recruitmentProcess?: string | null;
  applyUrl?: string | null;
  skills?: WttjSkillItem[] | null;
  tools?: WttjToolItem[] | null;
  profile?: string | null;
};

/** Insert payload without user_id (added at import time). */
export interface WttjNormalizedJob {
  source: "welcome_to_the_jungle";
  source_job_id: string | null;
  source_reference: string | null;
  title: string;
  company: string;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
  company_industry: string | null;
  company_size: number | null;
  contract_type: string | null;
  remote_mode: WttjRemoteMode;
  language: string | null;
  city: string | null;
  district: string | null;
  country_code: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  experience_level: number | null;
  education_level: string | null;
  category: string | null;
  subcategory: string | null;
  sectors: string[];
  summary: string | null;
  description: string | null;
  profile: string | null;
  recruitment_process: string | null;
  benefits: string[];
  skills: string[];
  tools: string[];
  apply_url: string | null;
  published_at: string | null;
  url: string;
  status: "new";
  selected: false;
  raw_data: WttjApifyItem;
}

export interface WttjNormalizeResult {
  job: WttjNormalizedJob | null;
  errors: string[];
}

const CONTRACT_TYPE_MAP: Record<string, string> = {
  full_time: "CDI",
  permanent: "CDI",
  cdi: "CDI",
  internship: "Stage",
  stage: "Stage",
  apprenticeship: "Alternance",
  alternance: "Alternance",
  temporary: "CDD",
  cdd: "CDD",
  part_time: "Temps partiel",
  freelance: "Freelance",
  contractor: "Freelance",
};

const REMOTE_MODE_MAP: Record<string, WttjRemoteMode> = {
  no: "onsite",
  false: "onsite",
  onsite: "onsite",
  on_site: "onsite",
  partial: "hybrid",
  hybrid: "hybrid",
  yes: "remote",
  true: "remote",
  full: "remote",
  remote: "remote",
};

const SALARY_PERIOD_MAP: Record<string, string> = {
  year: "year",
  yearly: "year",
  annual: "year",
  annum: "year",
  month: "month",
  monthly: "month",
  hour: "hour",
  hourly: "hour",
  day: "day",
  daily: "day",
};

export function normalizeContractType(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CONTRACT_TYPE_MAP[key] ?? value.trim();
}

export function normalizeRemoteMode(value: string | boolean | null | undefined): WttjRemoteMode {
  if (value === null || value === undefined || value === "") return "unknown";
  const key = String(value).trim().toLowerCase();
  return REMOTE_MODE_MAP[key] ?? "unknown";
}

export function normalizeSalaryPeriod(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return SALARY_PERIOD_MAP[key] ?? value.trim().toLowerCase();
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractSkillNames(skills: WttjSkillItem[] | null | undefined): string[] {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => {
      const name = skill?.name;
      if (!name || typeof name !== "object") return null;
      const fr = typeof name.fr === "string" ? name.fr.trim() : "";
      const en = typeof name.en === "string" ? name.en.trim() : "";
      return fr || en || null;
    })
    .filter((name): name is string => Boolean(name));
}

export function extractToolNames(tools: WttjToolItem[] | null | undefined): string[] {
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => (typeof tool?.name === "string" ? tool.name.trim() : null))
    .filter((name): name is string => Boolean(name));
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Math.round(num) : null;
}

function parsePublishedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function getOffices(item: WttjApifyItem): WttjOffice[] {
  const offices = item.offices;
  if (!Array.isArray(offices)) return [];
  return offices.filter((o) => o && typeof o === "object") as WttjOffice[];
}

export function validateWttjNormalizedJob(job: WttjNormalizedJob): string[] {
  const errors: string[] = [];
  if (!job.title) errors.push("Missing title");
  if (!job.company) errors.push("Missing company");
  if (!job.url) errors.push("Missing url");
  return errors;
}

export function normalizeWttjJob(item: WttjApifyItem): WttjNormalizeResult {
  const title = asString(item.name) ?? "";
  const company = asString(item.organizationName) ?? "";
  const url = asString(item.url) ?? "";

  const offices = getOffices(item);
  const firstOffice = offices[0] ?? null;

  const job: WttjNormalizedJob = {
    source: "welcome_to_the_jungle",
    source_job_id: asString(item.id),
    source_reference: asString(item.reference),
    title,
    company,
    company_slug: asString(item.organizationSlug),
    company_logo_url: asString(item.organizationLogo),
    company_website: asString(item.organizationWebsite),
    company_industry: asString(item.organizationIndustry),
    company_size: asInteger(item.organizationEmployees),
    contract_type: normalizeContractType(asString(item.contractType)),
    remote_mode: normalizeRemoteMode(item.remote as string | null),
    language: asString(item.language),
    city: firstOffice?.city?.trim() || null,
    district: firstOffice?.district?.trim() || null,
    country_code: firstOffice?.country_code?.trim() || null,
    salary_min: asInteger(item.salaryMin),
    salary_max: asInteger(item.salaryMax),
    salary_currency: asString(item.salaryCurrency),
    salary_period: normalizeSalaryPeriod(asString(item.salaryPeriod)),
    experience_level: asInteger(item.experienceLevel),
    education_level: asString(item.educationLevel),
    category: asString(item.category),
    subcategory: asString(item.subcategory),
    sectors: Array.isArray(item.sectors)
      ? item.sectors.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [],
    summary: stripHtml(asString(item.summary) ?? "") || null,
    description: stripHtml(asString(item.description) ?? "") || null,
    profile: stripHtml(asString(item.profile) ?? "") || null,
    recruitment_process: stripHtml(asString(item.recruitmentProcess) ?? "") || null,
    benefits: Array.isArray(item.benefits)
      ? item.benefits.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      : [],
    skills: extractSkillNames(item.skills as WttjSkillItem[] | null),
    tools: extractToolNames(item.tools as WttjToolItem[] | null),
    apply_url: asString(item.applyUrl),
    published_at: parsePublishedAt(asString(item.publishedAt)),
    url,
    status: "new",
    selected: false,
    raw_data: item,
  };

  const errors = validateWttjNormalizedJob(job);
  if (errors.length > 0) {
    return { job: null, errors };
  }

  return { job, errors: [] };
}
