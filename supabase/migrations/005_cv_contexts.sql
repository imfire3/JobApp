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
