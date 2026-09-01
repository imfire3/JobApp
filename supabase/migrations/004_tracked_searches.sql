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
