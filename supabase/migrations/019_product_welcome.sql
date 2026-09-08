-- Product welcome (3-page intro) completion — distinct from setup onboarding
alter table public.user_settings
  add column if not exists product_welcome_completed boolean not null default false,
  add column if not exists product_welcome_completed_at timestamptz;

comment on column public.user_settings.product_welcome_completed is
  'True after the first-visit product welcome (3-step intro) is finished or skipped.';

comment on column public.user_settings.product_welcome_completed_at is
  'Timestamp when the product welcome was marked complete.';
