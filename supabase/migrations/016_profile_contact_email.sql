-- Contact email + GitHub on candidate profile (distinct from auth email)

alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists github_url text;

comment on column public.profiles.contact_email is 'Contact email extracted from CV or entered by user (not auth email)';
comment on column public.profiles.github_url is 'GitHub profile URL';
