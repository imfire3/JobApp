-- Profile identity fields for signup
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

comment on column public.profiles.first_name is 'Given name collected at signup';
comment on column public.profiles.last_name is 'Family name collected at signup';
