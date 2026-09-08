-- WTTJ-style filters for tracked searches (alertes)
alter table public.tracked_searches
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists expertises text[] not null default '{}'::text[],
  add column if not exists salary_period text not null default 'year',
  add column if not exists maximum_salary integer,
  add column if not exists only_with_salary boolean not null default false,
  add column if not exists exclusive_only boolean not null default false,
  add column if not exists top_recruiter_only boolean not null default false,
  add column if not exists start_date_preference text,
  add column if not exists company_names text[] not null default '{}'::text[],
  add column if not exists publish_window text;

comment on column public.tracked_searches.salary_period is 'year | day (TJM)';
comment on column public.tracked_searches.publish_window is 'days: 1 | 7 | 14 | 30';

notify pgrst, 'reload schema';
