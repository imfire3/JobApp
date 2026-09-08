-- Shared ATS keyword taxonomy (reference data, not user-owned)

create table if not exists public.ats_keywords (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null unique,
  category text not null,
  subcategory text,
  skill_type text,
  priority text,
  aliases_fr text[] not null default '{}',
  aliases_en text[] not null default '{}',
  ats_weight numeric not null default 0.5
    check (ats_weight >= 0 and ats_weight <= 1),
  specificity_weight numeric not null default 0.5
    check (specificity_weight >= 0 and specificity_weight <= 1),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists ats_keywords_category_idx
  on public.ats_keywords (category);

create index if not exists ats_keywords_priority_idx
  on public.ats_keywords (priority);

create table if not exists public.ats_roles (
  id uuid primary key default gen_random_uuid(),
  role_name text not null unique,
  role_family text,
  seniority text[] not null default '{}'
);

create table if not exists public.ats_role_keywords (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.ats_roles (id) on delete cascade,
  keyword_id uuid not null references public.ats_keywords (id) on delete cascade,
  importance numeric not null default 0.5
    check (importance >= 0 and importance <= 1),
  required_level text,
  unique (role_id, keyword_id)
);

create index if not exists ats_role_keywords_role_idx
  on public.ats_role_keywords (role_id);

create index if not exists ats_role_keywords_keyword_idx
  on public.ats_role_keywords (keyword_id);

comment on table public.ats_keywords is
  'Canonical ATS skill/term taxonomy with FR/EN aliases';
comment on table public.ats_roles is
  'Target role families for weighted keyword importance';
comment on table public.ats_role_keywords is
  'Per-role importance of a canonical ATS keyword (0–1)';

alter table public.ats_keywords enable row level security;
alter table public.ats_roles enable row level security;
alter table public.ats_role_keywords enable row level security;

-- Reference catalog: authenticated users can read; writes via service role / SQL only
drop policy if exists "Authenticated users can read ats_keywords" on public.ats_keywords;
create policy "Authenticated users can read ats_keywords"
  on public.ats_keywords for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read ats_roles" on public.ats_roles;
create policy "Authenticated users can read ats_roles"
  on public.ats_roles for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read ats_role_keywords" on public.ats_role_keywords;
create policy "Authenticated users can read ats_role_keywords"
  on public.ats_role_keywords for select
  to authenticated
  using (true);
