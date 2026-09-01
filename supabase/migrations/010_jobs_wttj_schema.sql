-- Welcome to the Jungle / Apify JSON import schema alignment

-- Per-user URL deduplication (replaces global unique on url from 008)
alter table public.jobs drop constraint if exists jobs_url_key;
alter table public.jobs drop constraint if exists jobs_user_id_url_key;
alter table public.jobs add constraint jobs_user_id_url_key unique (user_id, url);

-- Source & reference
alter table public.jobs
  add column if not exists source_reference text;

-- Company enrichment
alter table public.jobs
  add column if not exists company_slug text,
  add column if not exists company_logo_url text,
  add column if not exists company_website text,
  add column if not exists company_industry text,
  add column if not exists company_size integer;

-- Location & language
alter table public.jobs
  add column if not exists language text,
  add column if not exists district text,
  add column if not exists country_code text;

-- Experience & education
alter table public.jobs
  add column if not exists experience_level integer,
  add column if not exists education_level text;

-- Taxonomy
alter table public.jobs
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists sectors text[];

-- Content
alter table public.jobs
  add column if not exists summary text,
  add column if not exists profile text,
  add column if not exists recruitment_process text,
  add column if not exists benefits text[],
  add column if not exists skills text[],
  add column if not exists tools text[],
  add column if not exists apply_url text;

-- AI fields (new canonical names)
alter table public.jobs
  add column if not exists ai_match_score integer,
  add column if not exists ai_strengths jsonb,
  add column if not exists ai_gaps jsonb;

-- Backfill AI fields from legacy columns when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'match_score'
  ) then
    execute $sql$
      update public.jobs
      set ai_match_score = coalesce(ai_match_score, match_score)
      where ai_match_score is null and match_score is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'match_reasons'
  ) then
    execute $sql$
      update public.jobs
      set ai_strengths = coalesce(ai_strengths, to_jsonb(match_reasons))
      where ai_strengths is null and match_reasons is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'match_gaps'
  ) then
    execute $sql$
      update public.jobs
      set ai_gaps = coalesce(ai_gaps, to_jsonb(match_gaps))
      where ai_gaps is null and match_gaps is not null
    $sql$;
  end if;
end $$;

-- Backfill country_code from country when missing
update public.jobs
set country_code = case
  when country ilike 'france' then 'FR'
  when country is not null and length(country) = 2 then upper(country)
  else country_code
end
where country_code is null and country is not null;

-- Backfill experience_level from experience_min_years when missing
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'experience_min_years'
  ) then
    execute $sql$
      update public.jobs
      set experience_level = coalesce(experience_level, experience_min_years)
      where experience_level is null and experience_min_years is not null
    $sql$;
  end if;
end $$;

-- Ensure constraints are in place
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('new', 'selected', 'cover_generated', 'applied', 'interview', 'rejected', 'archived'));

alter table public.jobs drop constraint if exists jobs_remote_mode_check;
alter table public.jobs add constraint jobs_remote_mode_check
  check (remote_mode is null or remote_mode in ('onsite', 'hybrid', 'remote', 'unknown'));

-- Indexes
create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_company_idx on public.jobs (company);
create index if not exists jobs_category_idx on public.jobs (category);
create index if not exists jobs_ai_match_score_idx on public.jobs (ai_match_score desc nulls last);

-- updated_at trigger
drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

comment on column public.jobs.source_reference is 'External reference code from the source (e.g. WTTJ reference)';
comment on column public.jobs.ai_match_score is 'AI match score 0-100';
comment on column public.jobs.ai_strengths is 'AI-identified strengths (jsonb array)';
comment on column public.jobs.ai_gaps is 'AI-identified gaps (jsonb array)';
comment on column public.jobs.raw_data is 'Full original scraper/import payload';
