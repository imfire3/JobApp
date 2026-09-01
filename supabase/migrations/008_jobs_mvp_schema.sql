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
