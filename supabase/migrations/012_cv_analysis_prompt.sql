-- Editable AI prompts per user (CV analysis + job match)

alter table public.user_settings
  add column if not exists cv_analysis_system_prompt text,
  add column if not exists job_match_system_prompt text;

comment on column public.user_settings.cv_analysis_system_prompt is
  'Optional custom system prompt for CV ATS analysis. Null = built-in default.';

comment on column public.user_settings.job_match_system_prompt is
  'Optional custom system prompt for job posting match analysis. Null = built-in default.';
