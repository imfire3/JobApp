-- Short candidate bio / about text on private profile

alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is
  'Short candidate bio / about blurb shown on the private profile page';
