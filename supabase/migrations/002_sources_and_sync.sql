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
