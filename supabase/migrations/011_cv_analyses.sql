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
