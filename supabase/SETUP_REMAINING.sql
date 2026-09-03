-- JobApp remaining setup (001 already applied: jobs + profiles exist)
-- Paste ALL of this into Supabase SQL Editor and Run once.


-- ============================================================
-- >>> 002_sources_and_sync.sql
-- ============================================================
-- Sources, saved searches, sync logs, and job enrichment

create type public.source_status as enum ('connected', 'not_configured', 'error');
create type public.sync_status as enum ('pending', 'running', 'success', 'partial', 'failed');

create table public.job_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  status public.source_status not null default 'not_configured',
  enabled boolean not null default true,
  sync_schedule text not null default 'daily',
  sync_time time not null default '08:00',
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  jobs_imported_today integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.source_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.job_sources (id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  criteria jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  last_result_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.job_sources (id) on delete cascade,
  source_search_id uuid references public.source_searches (id) on delete set null,
  status public.sync_status not null default 'pending',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  jobs_found integer not null default 0,
  jobs_imported integer not null default 0,
  jobs_skipped_duplicates integer not null default 0,
  error_message text
);

alter table public.jobs
  add column if not exists source_search_id uuid references public.source_searches (id) on delete set null,
  add column if not exists contract_type text,
  add column if not exists salary_min integer,
  add column if not exists salary_max integer,
  add column if not exists salary_currency text,
  add column if not exists imported_at timestamptz not null default now();

create index if not exists job_sources_user_id_idx on public.job_sources (user_id);
create index if not exists source_searches_user_id_idx on public.source_searches (user_id);
create index if not exists source_searches_source_id_idx on public.source_searches (source_id);
create index if not exists sync_runs_user_id_idx on public.sync_runs (user_id);
create index if not exists sync_runs_source_id_idx on public.sync_runs (source_id);
create index if not exists jobs_source_search_id_idx on public.jobs (source_search_id);
create index if not exists jobs_imported_at_idx on public.jobs (imported_at desc);

create trigger job_sources_updated_at
  before update on public.job_sources
  for each row execute function public.set_updated_at();

create trigger source_searches_updated_at
  before update on public.source_searches
  for each row execute function public.set_updated_at();

alter table public.job_sources enable row level security;
alter table public.source_searches enable row level security;
alter table public.sync_runs enable row level security;

create policy "Users can view own job sources"
  on public.job_sources for select
  using (auth.uid() = user_id);
create policy "Users can insert own job sources"
  on public.job_sources for insert
  with check (auth.uid() = user_id);
create policy "Users can update own job sources"
  on public.job_sources for update
  using (auth.uid() = user_id);
create policy "Users can delete own job sources"
  on public.job_sources for delete
  using (auth.uid() = user_id);

create policy "Users can view own source searches"
  on public.source_searches for select
  using (auth.uid() = user_id);
create policy "Users can insert own source searches"
  on public.source_searches for insert
  with check (auth.uid() = user_id);
create policy "Users can update own source searches"
  on public.source_searches for update
  using (auth.uid() = user_id);
create policy "Users can delete own source searches"
  on public.source_searches for delete
  using (auth.uid() = user_id);

create policy "Users can view own sync runs"
  on public.sync_runs for select
  using (auth.uid() = user_id);
create policy "Users can insert own sync runs"
  on public.sync_runs for insert
  with check (auth.uid() = user_id);
create policy "Users can update own sync runs"
  on public.sync_runs for update
  using (auth.uid() = user_id);

-- Seed sources + searches when user signs up
create or replace function public.seed_default_sources(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  src_wttj uuid;
  src_linkedin uuid;
  src_indeed uuid;
  src_apec uuid;
begin
  insert into public.job_sources (user_id, name, slug, status, enabled, sync_schedule, sync_time, next_sync_at)
  values
    (target_user_id, 'Welcome to the Jungle', 'welcome-to-the-jungle', 'connected', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'LinkedIn Jobs', 'linkedin-jobs', 'not_configured', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'Indeed', 'indeed', 'not_configured', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'APEC', 'apec', 'not_configured', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'Hellowork', 'hellowork', 'not_configured', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'France Travail', 'france-travail', 'not_configured', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'LesJeudis', 'lesjeudis', 'not_configured', true, 'daily', '08:00', now() + interval '1 day'),
    (target_user_id, 'Talent.io', 'talent-io', 'not_configured', true, 'daily', '08:00', now() + interval '1 day')
  on conflict (user_id, slug) do nothing;

  select id into src_wttj from public.job_sources where user_id = target_user_id and slug = 'welcome-to-the-jungle';
  select id into src_linkedin from public.job_sources where user_id = target_user_id and slug = 'linkedin-jobs';
  select id into src_indeed from public.job_sources where user_id = target_user_id and slug = 'indeed';
  select id into src_apec from public.job_sources where user_id = target_user_id and slug = 'apec';

  if src_wttj is not null then
    insert into public.source_searches (user_id, source_id, name, enabled, criteria) values
      (target_user_id, src_wttj, 'Product Owner Paris', true, jsonb_build_object('job_titles', jsonb_build_array('Product Owner'), 'location', 'Paris', 'remote_preference', 'hybrid', 'experience_levels', jsonb_build_array('mid', 'senior'), 'contract_types', jsonb_build_array('CDI'))),
      (target_user_id, src_wttj, 'Product Manager Paris', true, jsonb_build_object('job_titles', jsonb_build_array('Product Manager'), 'location', 'Paris', 'remote_preference', 'hybrid', 'experience_levels', jsonb_build_array('mid', 'senior'), 'contract_types', jsonb_build_array('CDI'))),
      (target_user_id, src_wttj, 'AI Product Manager', true, jsonb_build_object('job_titles', jsonb_build_array('AI Product Manager', 'Product Manager IA'), 'location', 'Paris', 'keywords', jsonb_build_array('AI', 'LLM', 'GenAI'))),
      (target_user_id, src_wttj, 'Product Builder', true, jsonb_build_object('job_titles', jsonb_build_array('Product Builder'), 'location', 'Paris', 'remote_preference', 'remote_only'))
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, target_roles, target_locations)
  values (
    new.id,
    array['Product Owner', 'Product Manager'],
    array['Paris', 'remote', 'hybrid']
  )
  on conflict (id) do nothing;

  perform public.seed_default_sources(new.id);
  return new;
end;
$$;


-- ============================================================
-- >>> 003_crm_and_profile_ai.sql
-- ============================================================
-- CRM + Profile AI redesign

create type public.application_status as enum (
  'to_apply',
  'applied',
  'hr_interview',
  'technical_interview',
  'case_study',
  'offer',
  'rejected',
  'accepted'
);

alter table public.profiles
  add column if not exists skills text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists education text[] not null default '{}',
  add column if not exists tools text[] not null default '{}',
  add column if not exists years_experience numeric,
  add column if not exists desired_salary integer,
  add column if not exists preferred_industries text[] not null default '{}',
  add column if not exists excluded_industries text[] not null default '{}',
  add column if not exists soft_skills text[] not null default '{}',
  add column if not exists preferred_company_size text,
  add column if not exists remote_preference text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists ai_preferences jsonb not null default '{}'::jsonb,
  add column if not exists extracted_cv jsonb not null default '{}'::jsonb;

create table if not exists public.user_settings (
  id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system',
  notifications_enabled boolean not null default true,
  timezone text not null default 'Europe/Paris',
  default_language text not null default 'fr',
  ai_provider text not null default 'openai',
  openai_key text,
  anthropic_key text,
  gemini_key text,
  resume_defaults jsonb not null default '{}'::jsonb,
  cover_letter_defaults jsonb not null default '{}'::jsonb,
  automation_defaults jsonb not null default '{"daily_sync_time":"08:00"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  company text not null,
  position text not null,
  date_applied date,
  status public.application_status not null default 'to_apply',
  interview_date timestamptz,
  notes text,
  generated_cover_letter text,
  generated_resume text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  content text not null,
  tone text,
  generated_by text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid references public.job_sources (id) on delete cascade,
  source_search_id uuid references public.source_searches (id) on delete set null,
  status public.sync_status not null default 'pending',
  phase text,
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  jobs_found integer not null default 0,
  jobs_imported integer not null default 0,
  jobs_skipped_duplicates integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists cover_letters_user_id_idx on public.cover_letters (user_id);
create index if not exists sync_logs_user_id_idx on public.sync_logs (user_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create trigger cover_letters_updated_at
  before update on public.cover_letters
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
alter table public.applications enable row level security;
alter table public.cover_letters enable row level security;
alter table public.sync_logs enable row level security;
alter table public.notifications enable row level security;

create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can manage own applications"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own cover letters"
  on public.cover_letters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own sync logs"
  on public.sync_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed settings on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, target_roles, target_locations)
  values (
    new.id,
    array['Product Owner', 'Product Manager'],
    array['Paris', 'remote', 'hybrid']
  )
  on conflict (id) do nothing;

  insert into public.user_settings (id)
  values (new.id)
  on conflict (id) do nothing;

  perform public.seed_default_sources(new.id);
  return new;
end;
$$;


-- ============================================================
-- >>> 004_tracked_searches.sql
-- ============================================================
create table if not exists public.tracked_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  job_titles text[] not null default '{}',
  keywords text[] not null default '{}',
  excluded_keywords text[] not null default '{}',
  locations text[] not null default '{}',
  maximum_distance integer,
  remote_preference text not null default 'any',
  hybrid boolean not null default false,
  on_site boolean not null default false,
  experience text[] not null default '{}',
  contract_types text[] not null default '{}',
  minimum_salary integer,
  currency text not null default 'EUR',
  industries text[] not null default '{}',
  excluded_industries text[] not null default '{}',
  company_size text,
  company_culture text,
  ai_preferences jsonb not null default '{}'::jsonb,
  minimum_match_score integer,
  last_run timestamptz,
  next_run timestamptz,
  jobs_found_today integer not null default 0,
  jobs_imported integer not null default 0,
  duplicates_removed integer not null default 0,
  average_ai_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs
  add column if not exists tracked_search_id uuid references public.tracked_searches (id) on delete set null;

create index if not exists tracked_searches_user_id_idx on public.tracked_searches (user_id);
create index if not exists jobs_tracked_search_id_idx on public.jobs (tracked_search_id);

create trigger tracked_searches_updated_at
  before update on public.tracked_searches
  for each row execute function public.set_updated_at();

alter table public.tracked_searches enable row level security;

create policy "Users can manage own tracked searches"
  on public.tracked_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed tracked searches for existing users
insert into public.tracked_searches (
  user_id,
  name,
  enabled,
  job_titles,
  locations,
  minimum_salary,
  remote_preference,
  hybrid,
  next_run
)
select
  u.id,
  seed.name,
  true,
  seed.job_titles,
  seed.locations,
  seed.minimum_salary,
  seed.remote_preference,
  seed.hybrid,
  now() + interval '1 day'
from auth.users u
cross join (
  values
    ('Product Owner', array['Product Owner']::text[], array['Paris']::text[], 55000, 'hybrid', true),
    ('Product Manager', array['Product Manager']::text[], array['Paris']::text[], 55000, 'hybrid', true),
    ('AI Product Manager', array['AI Product Manager']::text[], array['France']::text[], 60000, 'remote_only', false),
    ('Product Builder', array['Product Builder']::text[], array['Europe']::text[], 55000, 'remote_only', false),
    ('Product Designer', array['Product Designer']::text[], array['Paris']::text[], 50000, 'hybrid', true)
) as seed(name, job_titles, locations, minimum_salary, remote_preference, hybrid)
on conflict do nothing;

-- Update signup bootstrap with tracked searches defaults
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, target_roles, target_locations)
  values (
    new.id,
    array['Product Owner', 'Product Manager'],
    array['Paris', 'remote', 'hybrid']
  )
  on conflict (id) do nothing;

  insert into public.user_settings (id)
  values (new.id)
  on conflict (id) do nothing;

  perform public.seed_default_sources(new.id);

  insert into public.tracked_searches (user_id, name, enabled, job_titles, locations, minimum_salary, remote_preference, hybrid, next_run)
  values
    (new.id, 'Product Owner', true, array['Product Owner'], array['Paris'], 55000, 'hybrid', true, now() + interval '1 day'),
    (new.id, 'Product Manager', true, array['Product Manager'], array['Paris'], 55000, 'hybrid', true, now() + interval '1 day'),
    (new.id, 'AI Product Manager', true, array['AI Product Manager'], array['France'], 60000, 'remote_only', false, now() + interval '1 day'),
    (new.id, 'Product Builder', true, array['Product Builder'], array['Europe'], 55000, 'remote_only', false, now() + interval '1 day'),
    (new.id, 'Product Designer', true, array['Product Designer'], array['Paris'], 50000, 'hybrid', true, now() + interval '1 day')
  on conflict do nothing;

  return new;
end;
$$;


-- ============================================================
-- >>> 005_cv_contexts.sql
-- ============================================================
create table if not exists public.cv_contexts (
  id uuid primary key references auth.users (id) on delete cascade,
  cv_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists cv_contexts_updated_at on public.cv_contexts;
create trigger cv_contexts_updated_at
  before update on public.cv_contexts
  for each row execute function public.set_updated_at();

alter table public.cv_contexts enable row level security;

drop policy if exists "Users can manage own cv context" on public.cv_contexts;
create policy "Users can manage own cv context"
  on public.cv_contexts for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Ensure cover_letters has one row per job (003 may have created the table already).
create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cover_letters_job_id_unique on public.cover_letters (job_id);
create index if not exists cover_letters_user_id_idx on public.cover_letters (user_id);

drop trigger if exists cover_letters_updated_at on public.cover_letters;
create trigger cover_letters_updated_at
  before update on public.cover_letters
  for each row execute function public.set_updated_at();

alter table public.cover_letters enable row level security;

drop policy if exists "Users can manage own cover letters" on public.cover_letters;
create policy "Users can manage own cover letters"
  on public.cover_letters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- >>> 006_mvp_minimal.sql
-- ============================================================
-- No-op for linked projects: schema is applied by migrations 001-005.
-- Kept so manual SQL editor runs and db push stay in sync.

select 1;


-- ============================================================
-- >>> 007_connector_run_logs.sql
-- ============================================================
-- Connector run logs for external scraper sync (Apify / mock)

create table if not exists public.connector_run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tracked_search_id uuid not null references public.tracked_searches (id) on delete cascade,
  source text not null,
  status text not null check (status in ('running', 'success', 'failed')),
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  ignored_old_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists connector_run_logs_user_id_idx
  on public.connector_run_logs (user_id);

create index if not exists connector_run_logs_tracked_search_id_idx
  on public.connector_run_logs (tracked_search_id);

create index if not exists connector_run_logs_started_at_idx
  on public.connector_run_logs (started_at desc);

alter table public.connector_run_logs enable row level security;

drop policy if exists "Users can view own connector run logs" on public.connector_run_logs;
create policy "Users can view own connector run logs"
  on public.connector_run_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own connector run logs" on public.connector_run_logs;
create policy "Users can insert own connector run logs"
  on public.connector_run_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own connector run logs" on public.connector_run_logs;
create policy "Users can update own connector run logs"
  on public.connector_run_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- >>> 008_jobs_mvp_schema.sql
-- ============================================================
-- MVP jobs schema (Welcome to the Jungle first, multi-source ready)

-- Drop old per-user URL uniqueness in favor of global URL dedup.
alter table public.jobs drop constraint if exists jobs_user_id_url_key;

-- New / migrated columns
alter table public.jobs
  add column if not exists source_job_id text,
  add column if not exists city text,
  add column if not exists country text default 'France',
  add column if not exists remote_mode text,
  add column if not exists salary_period text default 'year',
  add column if not exists experience_min_years integer,
  add column if not exists published_at timestamptz,
  add column if not exists scraped_at timestamptz default now(),
  add column if not exists ai_summary text,
  add column if not exists raw_data jsonb;

-- Backfill from legacy columns when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'posted_at'
  ) then
    execute $sql$
      update public.jobs
      set published_at = coalesce(published_at, posted_at)
      where published_at is null and posted_at is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'imported_at'
  ) then
    execute $sql$
      update public.jobs
      set scraped_at = coalesce(scraped_at, imported_at, created_at)
      where scraped_at is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'location'
  ) then
    execute $sql$
      update public.jobs
      set city = coalesce(city, nullif(split_part(location, ',', 1), ''))
      where city is null and location is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'remote'
  ) then
    execute $sql$
      update public.jobs
      set remote_mode = case
        when remote_mode is not null then remote_mode
        when remote is true then 'remote'
        else 'onsite'
      end
      where remote_mode is null
    $sql$;
  end if;
end $$;

-- Normalize legacy source labels to source keys
update public.jobs
set source = case lower(source)
  when 'welcome to the jungle' then 'welcome_to_the_jungle'
  when 'linkedin' then 'linkedin_jobs'
  when 'linkedin jobs' then 'linkedin_jobs'
  when 'indeed' then 'indeed'
  else coalesce(nullif(source, ''), 'welcome_to_the_jungle')
end
where source is null
   or lower(source) in ('welcome to the jungle', 'linkedin', 'linkedin jobs', 'indeed', 'csv import');

-- Convert enum status to text when needed
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_attribute a on a.atttypid = t.oid
    join pg_class c on c.oid = a.attrelid
    where c.relname = 'jobs'
      and a.attname = 'status'
      and t.typname = 'job_status'
  ) then
    alter table public.jobs alter column status drop default;
    alter table public.jobs
      alter column status type text using status::text;
  end if;
end $$;

alter table public.jobs
  alter column source set default 'welcome_to_the_jungle',
  alter column country set default 'France',
  alter column salary_currency set default 'EUR',
  alter column salary_period set default 'year',
  alter column status set default 'new';

-- Remove duplicate URLs before adding global unique constraint
delete from public.jobs a
using public.jobs b
where a.url = b.url
  and a.created_at < b.created_at;

-- Drop legacy columns no longer used by MVP schema
alter table public.jobs
  drop column if exists location,
  drop column if exists remote,
  drop column if exists salary,
  drop column if exists posted_at,
  drop column if exists imported_at,
  drop column if exists source_search_id;

-- Constraints
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('new', 'selected', 'cover_generated', 'applied', 'interview', 'rejected', 'archived'));

alter table public.jobs drop constraint if exists jobs_remote_mode_check;
alter table public.jobs add constraint jobs_remote_mode_check
  check (remote_mode is null or remote_mode in ('onsite', 'hybrid', 'remote', 'unknown'));

alter table public.jobs drop constraint if exists jobs_url_key;
alter table public.jobs add constraint jobs_url_key unique (url);

-- Indexes
drop index if exists jobs_posted_at_idx;
create index if not exists jobs_published_at_idx on public.jobs (published_at desc nulls last);
create index if not exists jobs_scraped_at_idx on public.jobs (scraped_at desc);
create index if not exists jobs_source_idx on public.jobs (source);
create index if not exists jobs_city_idx on public.jobs (city);
create index if not exists jobs_remote_mode_idx on public.jobs (remote_mode);

comment on table public.jobs is 'Normalized job listings from external sources (WTTJ, LinkedIn, Indeed)';
comment on column public.jobs.source is 'Source key: welcome_to_the_jungle | linkedin_jobs | indeed';
comment on column public.jobs.raw_data is 'Original scraper payload';
comment on column public.jobs.published_at is 'When the employer/source published the offer';
comment on column public.jobs.scraped_at is 'When our collector ingested the offer';


-- ============================================================
-- >>> 009_cover_letters_mvp.sql
-- ============================================================
-- Cover letters MVP: metadata columns + unique letter per user/job

alter table public.cover_letters
  add column if not exists language text,
  add column if not exists model text,
  add column if not exists prompt_version text;

delete from public.cover_letters where job_id is null;

alter table public.cover_letters
  alter column job_id set not null;

drop index if exists cover_letters_job_id_unique;
alter table public.cover_letters drop constraint if exists cover_letters_job_id_key;

create unique index if not exists cover_letters_user_job_unique
  on public.cover_letters (user_id, job_id);

comment on column public.cover_letters.language is 'Detected output language (fr, en, ...)';
comment on column public.cover_letters.model is 'OpenAI model used for generation';
comment on column public.cover_letters.prompt_version is 'Prompt template version from lib/ai/prompts/cover-letter.ts';


-- ============================================================
-- >>> 010_jobs_wttj_schema.sql
-- ============================================================
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


-- ============================================================
-- >>> 011_cv_analyses.sql
-- ============================================================
-- ATS-oriented CV analysis results (one latest row per user)

create table if not exists public.cv_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis jsonb not null,
  model text not null,
  prompt_version text not null,
  cv_content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cv_analyses_user_id_idx on public.cv_analyses (user_id);

drop trigger if exists cv_analyses_updated_at on public.cv_analyses;
create trigger cv_analyses_updated_at
  before update on public.cv_analyses
  for each row execute function public.set_updated_at();

alter table public.cv_analyses enable row level security;

drop policy if exists "Users can manage own cv analyses" on public.cv_analyses;
create policy "Users can manage own cv analyses"
  on public.cv_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.cv_analyses is 'Latest ATS-oriented heuristic CV analysis per user';
comment on column public.cv_analyses.analysis is 'Structured analysis JSON (scores, recommendations, detected fields)';
comment on column public.cv_analyses.cv_content_hash is 'SHA-256 of saved cv_text at analysis time';


-- ============================================================
-- >>> 012_cv_analysis_prompt.sql
-- ============================================================
-- Editable AI prompts per user (CV analysis + job match)

alter table public.user_settings
  add column if not exists cv_analysis_system_prompt text,
  add column if not exists job_match_system_prompt text;

comment on column public.user_settings.cv_analysis_system_prompt is
  'Optional custom system prompt for CV ATS analysis. Null = built-in default.';

comment on column public.user_settings.job_match_system_prompt is
  'Optional custom system prompt for job posting match analysis. Null = built-in default.';


-- ============================================================
-- >>> 013_onboarding.sql
-- ============================================================
-- Editable onboarding completion flag per user
alter table public.user_settings
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.user_settings.onboarding_completed is
  'True after the post-signup onboarding wizard is finished.';

comment on column public.user_settings.onboarding_completed_at is
  'Timestamp when onboarding was marked complete.';


-- ============================================================
-- >>> bootstrap_local_admin.sql
-- ============================================================
-- Bootstrap for JobApp local-auth (admin@gmail.com / admin)
-- Run AFTER all migrations 001→012 on a fresh Supabase project.
-- Required because the app stores jobs with user_id =
-- 00000000-0000-4000-a000-000000000001 (local admin), which must exist in auth.users.

create extension if not exists pgcrypto;

-- Create auth user compatible with local admin id (idempotent)
do $$
begin
  if not exists (
    select 1 from auth.users where id = '00000000-0000-4000-a000-000000000001'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-4000-a000-000000000001',
      'authenticated',
      'authenticated',
      'admin@gmail.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;
end $$;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  jsonb_build_object('sub', '00000000-0000-4000-a000-000000000001', 'email', 'admin@gmail.com'),
  'email',
  '00000000-0000-4000-a000-000000000001',
  now(),
  now(),
  now()
where not exists (
  select 1 from auth.identities
  where user_id = '00000000-0000-4000-a000-000000000001'
);

insert into public.profiles (id, target_roles, target_locations)
values (
  '00000000-0000-4000-a000-000000000001',
  array['Product Owner', 'Product Manager'],
  array['Paris', 'remote', 'hybrid']
)
on conflict (id) do nothing;

insert into public.cv_contexts (id)
values ('00000000-0000-4000-a000-000000000001')
on conflict (id) do nothing;

