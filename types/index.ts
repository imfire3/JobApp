export const JOB_STATUSES = [
  "new",
  "selected",
  "cover_generated",
  "applied",
  "interview",
  "rejected",
  "archived",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_SOURCES = [
  "Welcome to the Jungle",
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Other",
] as const;

export type JobSourceName = (typeof JOB_SOURCES)[number] | string;

export const TARGET_ROLES = [
  "Product Owner",
  "Product Manager",
  "Proxy Product Owner",
  "Product Builder",
] as const;

export const TARGET_LOCATIONS = ["Paris", "remote", "hybrid"] as const;

export const JOB_SOURCE_KEYS = [
  "welcome_to_the_jungle",
  "linkedin_jobs",
  "indeed",
] as const;

export type JobSourceKey = (typeof JOB_SOURCE_KEYS)[number];

export const REMOTE_MODES = ["onsite", "hybrid", "remote", "unknown"] as const;
export type RemoteMode = (typeof REMOTE_MODES)[number];

export interface ImportedJob {
  title: string;
  company: string;
  source: string;
  source_search_id?: string | null;
  location?: string | null;
  remote: boolean;
  contract_type?: string | null;
  salary?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  posted_at: string;
  url: string;
  description: string | null;
}

/** Row shape stored in Supabase `jobs` table. */
export interface JobRecord {
  id: string;
  user_id: string;
  tracked_search_id: string | null;
  source: string;
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
  city: string | null;
  district: string | null;
  country_code: string | null;
  country: string;
  remote_mode: RemoteMode | null;
  language: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: string;
  experience_level: number | null;
  experience_min_years: number | null;
  education_level: string | null;
  category: string | null;
  subcategory: string | null;
  sectors: string[] | null;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
  description: string | null;
  profile: string | null;
  recruitment_process: string | null;
  benefits: string[] | null;
  skills: string[] | null;
  tools: string[] | null;
  apply_url: string | null;
  ai_summary: string | null;
  ai_match_score: number | null;
  ai_strengths: string[] | null;
  ai_gaps: string[] | null;
  url: string;
  status: JobStatus;
  raw_data: Record<string, unknown> | null;
  match_score: number | null;
  match_reasons: string[] | null;
  match_gaps: string[] | null;
  cover_letter_angle: string | null;
  cover_letter: string | null;
  selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobAnalysis {
  match_score: number;
  match_reasons: string[];
  match_gaps: string[];
  cover_letter_angle: string;
}

/** UI-facing job view model (mapped from JobRecord). */
export interface Job extends ImportedJob {
  id: string;
  user_id: string;
  source_key: string;
  source_job_id: string | null;
  source_reference: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
  company_industry: string | null;
  company_size: number | null;
  city: string | null;
  district: string | null;
  country_code: string | null;
  country: string;
  remote_mode: RemoteMode | null;
  language: string | null;
  salary_period: string;
  experience_level: number | null;
  experience_min_years: number | null;
  education_level: string | null;
  category: string | null;
  subcategory: string | null;
  sectors: string[] | null;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
  profile: string | null;
  recruitment_process: string | null;
  benefits: string[] | null;
  skills: string[] | null;
  tools: string[] | null;
  apply_url: string | null;
  ai_summary: string | null;
  ai_match_score: number | null;
  ai_strengths: string[] | null;
  ai_gaps: string[] | null;
  raw_data: Record<string, unknown> | null;
  status: JobStatus;
  match_score: number | null;
  match_reasons: string[] | null;
  match_gaps: string[] | null;
  cover_letter_angle: string | null;
  cover_letter: string | null;
  selected: boolean;
  imported_at: string;
  tracked_search_id?: string | null;
  tracked_search_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverLetter {
  id: string;
  user_id: string;
  job_id: string;
  content: string;
  language: string | null;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  cv_text: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardKpis {
  jobsFoundToday: number;
  newJobs: number;
  selectedJobs: number;
  coverLettersGenerated: number;
  applicationsSent: number;
  averageMatchScore: number | null;
  lastSyncTime: string | null;
  nextSyncTime: string | null;
  sourceHealth: {
    connected: number;
    notConfigured: number;
    error: number;
  };
}

export interface JobFilters {
  source?: string;
  location?: string;
  remote?: boolean;
  hybrid?: boolean;
  minSalary?: number;
  contractType?: string;
  status?: JobStatus;
  minMatchScore?: number;
  postedWithinHours?: number;
  postedWithinDays?: number;
  search?: string;
}

export const SOURCE_STATUSES = ["connected", "not_configured", "error"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const REMOTE_PREFERENCES = ["any", "remote_only", "hybrid", "onsite"] as const;
export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

export const EXPERIENCE_LEVELS = [
  "internship",
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const SYNC_STATUSES = ["pending", "running", "success", "partial", "failed"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const IMPORTABLE_JOB_FIELDS = [
  "company",
  "title",
  "salary",
  "location",
  "remote",
  "source",
  "description",
  "contract_type",
  "posted_at",
] as const;

export type ImportableJobField = (typeof IMPORTABLE_JOB_FIELDS)[number];

export interface SearchCriteria {
  job_titles: string[];
  similar_jobs: boolean;
  experience_levels: ExperienceLevel[];
  location: string;
  remote_preference: RemotePreference;
  contract_types: string[];
  minimum_salary: number | null;
  salary_currency: string;
  only_jobs_with_salary: boolean;
  company_preferences: string;
  industries: string[];
  excluded_industries: string[];
  keywords: string[];
  excluded_keywords: string[];
  source_specific?: Record<string, unknown>;
}

export interface JobSource {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: SourceStatus;
  enabled: boolean;
  sync_schedule: string;
  sync_time: string;
  last_sync_at: string | null;
  next_sync_at: string | null;
  jobs_imported_today: number;
  created_at: string;
  updated_at: string;
}

export interface SourceSearch {
  id: string;
  user_id: string;
  source_id: string;
  name: string;
  enabled: boolean;
  criteria: SearchCriteria;
  last_run_at: string | null;
  last_result_count: number;
  created_at: string;
  updated_at: string;
}

export interface SyncRun {
  id: string;
  user_id: string;
  source_id: string;
  source_search_id: string | null;
  status: SyncStatus;
  started_at: string;
  finished_at: string | null;
  jobs_found: number;
  jobs_imported: number;
  jobs_skipped_duplicates: number;
  error_message: string | null;
}

export const APPLICATION_STATUSES = [
  "to_apply",
  "applied",
  "hr_interview",
  "technical_interview",
  "case_study",
  "offer",
  "rejected",
  "accepted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ParsedCvProfile {
  experiences: string[];
  skills: string[];
  languages: string[];
  education: string[];
  tools: string[];
  years_experience: number | null;
  desired_salary: number | null;
  desired_locations: string[];
  target_roles: string[];
  preferred_industries: string[];
  soft_skills: string[];
  keywords: string[];
}

export type CvAnalysisSeverity = "low" | "medium" | "high";

export interface CvDetectedLanguage {
  language: string;
  level?: string | null;
}

export interface CvAnalysisRecommendation {
  id: string;
  category: string;
  severity: CvAnalysisSeverity;
  title: string;
  explanation: string;
  evidence_from_cv: string;
  suggested_improvement: string;
}

export interface CvAtsAnalysis {
  overall_score: number;
  parsing_score: number;
  structure_score: number;
  impact_score: number;
  keyword_score: number;
  detected_roles: string[];
  detected_skills: string[];
  detected_tools: string[];
  detected_languages: CvDetectedLanguage[];
  detected_industries: string[];
  estimated_experience_years: number | null;
  strengths: string[];
  weaknesses: string[];
  missing_product_keywords: string[];
  recommendations: CvAnalysisRecommendation[];
  recruiter_summary: string;
}

export interface CvAnalysisResponse {
  analysis: CvAtsAnalysis;
  model: string;
  prompt_version: string;
  cv_content_hash: string;
  is_stale: boolean;
  analyzed_at: string;
  cv_updated_at: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string | null;
  company: string;
  position: string;
  date_applied: string | null;
  status: ApplicationStatus;
  interview_date: string | null;
  notes: string | null;
  generated_cover_letter: string | null;
  generated_resume: string | null;
  history: Array<{ at: string; status: ApplicationStatus; note?: string }>;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  theme: "light" | "dark" | "system";
  notifications_enabled: boolean;
  timezone: string;
  default_language: string;
  ai_provider: "openai" | "anthropic" | "gemini";
  openai_key: string | null;
  anthropic_key: string | null;
  gemini_key: string | null;
  resume_defaults: Record<string, unknown>;
  cover_letter_defaults: Record<string, unknown>;
  automation_defaults: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface TrackedSearch {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  job_titles: string[];
  keywords: string[];
  excluded_keywords: string[];
  locations: string[];
  maximum_distance: number | null;
  remote_preference: string;
  hybrid: boolean;
  on_site: boolean;
  experience: string[];
  contract_types: string[];
  minimum_salary: number | null;
  currency: string;
  industries: string[];
  excluded_industries: string[];
  company_size: string | null;
  company_culture: string | null;
  ai_preferences: Record<string, unknown>;
  minimum_match_score: number | null;
  last_run: string | null;
  next_run: string | null;
  jobs_found_today: number;
  jobs_imported: number;
  duplicates_removed: number;
  average_ai_score: number | null;
  created_at: string;
  updated_at: string;
}
