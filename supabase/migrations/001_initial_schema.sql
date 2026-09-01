-- Job Tracker schema for Supabase
-- Run this in the Supabase SQL editor or via CLI: supabase db push

-- Job status pipeline
create type public.job_status as enum (
  'new',
  'selected',
  'cover_generated',
  'applied',
  'interview',
  'rejected',
  'archived'
);

-- User profile with CV and search preferences
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  cv_text text,
  target_roles text[] not null default '{}',
  target_locations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Imported job listings
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  company text not null,
  source text not null,
  location text,
  remote boolean not null default false,
  salary text,
  posted_at timestamptz,
  url text not null,
  description text,
  status public.job_status not null default 'new',
  match_score integer check (match_score >= 0 and match_score <= 100),
  match_reasons jsonb,
  match_gaps jsonb,
  cover_letter_angle text,
  cover_letter text,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url)
);

create index jobs_user_id_idx on public.jobs (user_id);
create index jobs_status_idx on public.jobs (status);
create index jobs_posted_at_idx on public.jobs (posted_at desc);
create index jobs_match_score_idx on public.jobs (match_score desc nulls last);

-- Auto-create profile on signup
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can view own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own jobs"
  on public.jobs for update
  using (auth.uid() = user_id);

create policy "Users can delete own jobs"
  on public.jobs for delete
  using (auth.uid() = user_id);
