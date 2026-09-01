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
