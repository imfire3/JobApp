-- Editable onboarding completion flag per user
alter table public.user_settings
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.user_settings.onboarding_completed is
  'True after the post-signup onboarding wizard is finished.';

comment on column public.user_settings.onboarding_completed_at is
  'Timestamp when onboarding was marked complete.';
