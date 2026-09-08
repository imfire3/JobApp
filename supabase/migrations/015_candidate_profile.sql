-- Structured candidate profile after CV import (onboarding + Mon CV)

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

comment on column public.profiles.phone is 'Phone number extracted or entered by user';
comment on column public.profiles.date_of_birth is 'Date of birth (YYYY-MM-DD) when present on CV';
comment on column public.profiles.linkedin_url is 'LinkedIn profile URL';
comment on column public.profiles.website_url is 'Personal website URL';
comment on column public.profiles.current_city is 'Current city of residence';
comment on column public.profiles.current_title is 'Current job title / headline';
comment on column public.profiles.experience_entries is 'Structured work experiences as JSON array';
comment on column public.profiles.education_entries is 'Structured education entries as JSON array';
comment on column public.profiles.language_entries is 'Structured languages [{language, level}] as JSON array';
comment on column public.profiles.extracted_cv_prompt_version is 'Prompt version used for last structured CV extraction';
comment on column public.profiles.profile_reviewed_at is 'When user confirmed profile during onboarding';
comment on column public.profiles.cv_file_name is 'Original uploaded CV file name';
comment on column public.profiles.cv_file_path is 'Storage path in cv-files bucket';
comment on column public.profiles.cv_file_updated_at is 'When the CV file was last uploaded';

-- Private bucket for original CV PDFs ({user_id}/original.pdf)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-files',
  'cv-files',
  false,
  8388608,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: path must start with auth.uid()
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
