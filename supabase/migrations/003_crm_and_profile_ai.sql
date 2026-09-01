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
