-- Demo access requests from the landing page (service-role inserts only)

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);

create index if not exists demo_requests_email_idx
  on public.demo_requests (email);

comment on table public.demo_requests is
  'Landing-page demo access requests. Inserts go through the server with the service role.';

alter table public.demo_requests enable row level security;

-- No policies for authenticated/anon: only the service role can read/write.
