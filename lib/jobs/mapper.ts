import {
  extractSourceJobId,
  formatSourceLabel,
  parseExperienceMinYears,
  parseLocation,
  parseRemoteMode,
  parseSalaryRange,
  normalizeSourceKey,
  type RemoteMode,
} from "@/lib/jobs/normalize";
import type { ImportedJob, Job, JobRecord, JobStatus } from "@/types";
import type { ParsedImportRow } from "@/lib/imports/jobs-file";

type JobRow = JobRecord & {
  tracked_searches?: { name?: string } | null;
};

function parseJsonbStringArray(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return null;
}

function resolveMatchScore(row: JobRow): number | null {
  return row.ai_match_score ?? row.match_score ?? null;
}

function resolveStrengths(row: JobRow): string[] | null {
  return row.ai_strengths ?? row.match_reasons ?? parseJsonbStringArray(row.ai_strengths);
}

function resolveGaps(row: JobRow): string[] | null {
  return row.ai_gaps ?? row.match_gaps ?? parseJsonbStringArray(row.ai_gaps);
}

export function buildJobInsertPayload(input: {
  userId: string;
  trackedSearchId?: string | null;
  job: ImportedJob;
  rawData?: Record<string, unknown> | null;
  scrapedAt?: string;
}): Omit<JobRecord, "id" | "created_at" | "updated_at"> {
  const { job, userId, trackedSearchId, rawData, scrapedAt } = input;
  const extended = job as ParsedImportRow;
  const source = normalizeSourceKey(job.source);
  const { city, country } = parseLocation(job.location ?? null);
  const remote_mode =
    extended.remote_mode ??
    parseRemoteMode({
      remote: job.remote,
      location: job.location ?? null,
      tags: [
        job.contract_type ?? "",
        typeof rawData?.remote_tag === "string" ? rawData.remote_tag : "",
      ],
    });
  const salary = parseSalaryRange(job.salary ?? null);
  const experienceInput =
    typeof rawData?.experience === "string"
      ? rawData.experience
      : typeof rawData?.experience_tag === "string"
        ? rawData.experience_tag
        : null;
  const experienceLevel =
    extended.experience_min_years ?? parseExperienceMinYears(experienceInput);

  return {
    user_id: userId,
    tracked_search_id: trackedSearchId ?? null,
    source,
    source_job_id: extractSourceJobId(job.url, source),
    source_reference: null,
    title: job.title,
    company: job.company || "Unknown",
    company_slug: null,
    company_logo_url: null,
    company_website: null,
    company_industry: null,
    company_size: null,
    contract_type: job.contract_type ?? null,
    city,
    district: null,
    country_code: country === "France" ? "FR" : null,
    country,
    remote_mode: remote_mode as RemoteMode,
    language: null,
    salary_min: extended.salary_min ?? salary.salary_min,
    salary_max: extended.salary_max ?? salary.salary_max,
    salary_currency: extended.salary_currency ?? salary.salary_currency,
    salary_period: salary.salary_period,
    experience_level: experienceLevel,
    experience_min_years: experienceLevel,
    education_level: null,
    category: null,
    subcategory: null,
    sectors: null,
    summary: null,
    published_at: job.posted_at ?? null,
    scraped_at: scrapedAt ?? new Date().toISOString(),
    description: job.description ?? null,
    profile: null,
    recruitment_process: null,
    benefits: null,
    skills: null,
    tools: null,
    apply_url: null,
    ai_summary: null,
    ai_match_score: null,
    ai_strengths: null,
    ai_gaps: null,
    url: job.url,
    status: "new",
    raw_data: rawData ?? (job as unknown as Record<string, unknown>),
    match_score: null,
    match_reasons: null,
    match_gaps: null,
    cover_letter_angle: null,
    cover_letter: null,
    selected: false,
  };
}

export function toJobViewModel(row: JobRow): Job {
  const location =
    [row.city, row.district, row.country_code ?? row.country].filter(Boolean).join(", ") ||
    null;
  const remote = row.remote_mode === "remote" || row.remote_mode === "hybrid";
  const salary =
    row.salary_min && row.salary_max
      ? `${Math.round(row.salary_min / 1000)}k–${Math.round(row.salary_max / 1000)}k ${row.salary_currency ?? "EUR"}`
      : row.salary_min
        ? `from ${Math.round(row.salary_min / 1000)}k ${row.salary_currency ?? "EUR"}`
        : null;

  const matchScore = resolveMatchScore(row);
  const matchReasons = resolveStrengths(row);
  const matchGaps = resolveGaps(row);
  const jobFit =
    row.raw_data &&
    typeof row.raw_data === "object" &&
    !Array.isArray(row.raw_data) &&
    row.raw_data.job_fit &&
    typeof row.raw_data.job_fit === "object"
      ? (row.raw_data.job_fit as Record<string, unknown>)
      : null;

  const asStringArray = (value: unknown): string[] | null =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;

  return {
    id: row.id,
    user_id: row.user_id,
    source: formatSourceLabel(row.source),
    source_key: row.source,
    source_job_id: row.source_job_id,
    source_reference: row.source_reference,
    title: row.title,
    company: row.company,
    company_slug: row.company_slug,
    company_logo_url: row.company_logo_url,
    company_website: row.company_website,
    company_industry: row.company_industry,
    company_size: row.company_size,
    contract_type: row.contract_type,
    city: row.city,
    district: row.district,
    country_code: row.country_code,
    country: row.country,
    location,
    remote_mode: row.remote_mode as RemoteMode,
    language: row.language,
    remote,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    salary_currency: row.salary_currency,
    salary_period: row.salary_period,
    salary,
    experience_level: row.experience_level ?? row.experience_min_years,
    experience_min_years: row.experience_min_years ?? row.experience_level,
    education_level: row.education_level,
    category: row.category,
    subcategory: row.subcategory,
    sectors: row.sectors,
    summary: row.summary,
    published_at: row.published_at,
    scraped_at: row.scraped_at,
    posted_at: row.published_at ?? row.scraped_at ?? row.created_at,
    imported_at: row.scraped_at,
    description: row.description,
    profile: row.profile,
    recruitment_process: row.recruitment_process,
    benefits: row.benefits,
    skills: row.skills,
    tools: row.tools,
    apply_url: row.apply_url,
    ai_summary: row.ai_summary,
    ai_match_score: matchScore,
    ai_strengths: matchReasons,
    ai_gaps: matchGaps,
    url: row.url,
    status: row.status as JobStatus,
    raw_data: row.raw_data,
    match_score: matchScore,
    match_reasons: matchReasons,
    match_gaps: matchGaps,
    cover_letter_angle: row.cover_letter_angle,
    cover_letter: row.cover_letter,
    selected: row.selected ?? row.status === "selected",
    tracked_search_id: row.tracked_search_id,
    tracked_search_name:
      typeof row.tracked_searches === "object" && row.tracked_searches
        ? row.tracked_searches.name ?? null
        : null,
    keywords_from_job: asStringArray(jobFit?.keywords_from_job),
    keywords_matched: asStringArray(jobFit?.keywords_matched),
    keywords_missing: asStringArray(jobFit?.keywords_missing),
    cv_improvements: asStringArray(jobFit?.cv_improvements),
    job_posting_summary:
      typeof jobFit?.job_posting_summary === "string" ? jobFit.job_posting_summary : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapJobRows(rows: JobRow[]): Job[] {
  return rows.map(toJobViewModel);
}
