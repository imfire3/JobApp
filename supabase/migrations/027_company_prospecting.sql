-- Company prospection CRM: spontaneous application pipeline

do $$
begin
  create type public.company_pipeline_status as enum (
  'to_contact',
  'contact_found',
  'message_prepared',
  'application_sent',
  'follow_up_pending',
  'response_received',
  'interview',
  'refused',
  'opportunity'
);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.company_discovery_type as enum (
  'offer_detected',
  'spontaneous'
);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.company_role_type as enum (
  'recruiter',
  'head_of_product',
  'cpo',
  'product_director',
  'founder',
  'other'
);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.outreach_kind as enum (
  'email',
  'linkedin'
);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.outreach_status as enum (
  'draft',
  'ready',
  'sent'
);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.company_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null default '',
  criteria jsonb not null default '{}'::jsonb,
  status text not null default 'done',
  results_found integer not null default 0,
  companies_added integer not null default 0,
  raw jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  search_id uuid references public.company_searches (id) on delete set null,
  name text not null,
  slug text not null default '',
  domain text not null default '',
  website text,
  logo_url text,
  sectors text[] not null default '{}',
  industry text,
  size_min integer,
  size_max integer,
  headquarters text,
  locations text[] not null default '{}',
  remote_ok boolean not null default false,
  description text,
  discovery_type public.company_discovery_type not null default 'spontaneous',
  ai_enriched jsonb not null default '{}'::jsonb,
  match_score integer,
  opportunity_score integer,
  opportunity_breakdown jsonb not null default '{}'::jsonb,
  status public.company_pipeline_status not null default 'to_contact',
  next_action_at timestamptz,
  outcome_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain)
);

create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null default '',
  role_title text not null default '',
  role_type public.company_role_type not null default 'other',
  linkedin_url text,
  email text,
  email_confidence integer,
  relevance_score integer,
  active boolean not null default true,
  current_company boolean not null default true,
  source text not null default 'search',
  notes text,
  relevance_factors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  contact_id uuid references public.company_contacts (id) on delete set null,
  kind public.outreach_kind not null default 'email',
  subject text not null default '',
  body text not null default '',
  status public.outreach_status not null default 'draft',
  sent_at timestamptz,
  response_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_user_id_idx on public.companies (user_id);
create index if not exists companies_status_idx on public.companies (status);
create index if not exists company_contacts_company_id_idx on public.company_contacts (company_id);
create index if not exists company_contacts_user_id_idx on public.company_contacts (user_id);
create index if not exists outreach_messages_company_id_idx on public.outreach_messages (company_id);
create index if not exists outreach_messages_user_id_idx on public.outreach_messages (user_id);
create index if not exists company_searches_user_id_idx on public.company_searches (user_id);

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists company_contacts_updated_at on public.company_contacts;
create trigger company_contacts_updated_at
  before update on public.company_contacts
  for each row execute function public.set_updated_at();

drop trigger if exists outreach_messages_updated_at on public.outreach_messages;
create trigger outreach_messages_updated_at
  before update on public.outreach_messages
  for each row execute function public.set_updated_at();

drop trigger if exists company_searches_updated_at on public.company_searches;
create trigger company_searches_updated_at
  before update on public.company_searches
  for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.company_contacts enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.company_searches enable row level security;

drop policy if exists "Users can manage own companies" on public.companies;
create policy "Users can manage own companies"
  on public.companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own company contacts" on public.company_contacts;
create policy "Users can manage own company contacts"
  on public.company_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own outreach messages" on public.outreach_messages;
create policy "Users can manage own outreach messages"
  on public.outreach_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own company searches" on public.company_searches;
create policy "Users can manage own company searches"
  on public.company_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
