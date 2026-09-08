-- Convenience script: apply candidate profile columns (014–017) on an existing DB.
-- Safe / idempotent (IF NOT EXISTS). Run in Supabase SQL editor if you see:
--   Could not find the 'contact_email' column of 'profiles' in the schema cache

-- 014
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

-- 015
alter table public.profiles
  add column if not exists phone text,
  add column if not exists date_of_birth date,
  add column if not exists linkedin_url text,
  add column if not exists website_url text,
  add column if not exists current_city text,
  add column if not exists current_title text,
  add column if not exists experience_entries jsonb not null default '[]'::jsonb,
  add column if not exists education_entries jsonb not null default '[]'::jsonb,
  add column if not exists language_entries jsonb not null default '[]'::jsonb,
  add column if not exists extracted_cv_prompt_version text,
  add column if not exists profile_reviewed_at timestamptz,
  add column if not exists cv_file_name text,
  add column if not exists cv_file_path text,
  add column if not exists cv_file_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-files',
  'cv-files',
  false,
  8388608,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own cv files" on storage.objects;
create policy "Users can upload own cv files"
  on storage.objects for insert
  with check (
    bucket_id = 'cv-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own cv files" on storage.objects;
create policy "Users can update own cv files"
  on storage.objects for update
  using (
    bucket_id = 'cv-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cv-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own cv files" on storage.objects;
create policy "Users can read own cv files"
  on storage.objects for select
  using (
    bucket_id = 'cv-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own cv files" on storage.objects;
create policy "Users can delete own cv files"
  on storage.objects for delete
  using (
    bucket_id = 'cv-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 016
alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists github_url text;

comment on column public.profiles.contact_email is 'Contact email extracted from CV or entered by user (not auth email)';
comment on column public.profiles.github_url is 'GitHub profile URL';

-- 017
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp'
]::text[]
where id = 'cv-files';

notify pgrst, 'reload schema';
