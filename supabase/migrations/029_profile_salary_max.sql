-- Desired salary range (min stays in desired_salary, max added here)

alter table public.profiles
  add column if not exists desired_salary_max integer;

comment on column public.profiles.desired_salary_max is
  'Desired gross annual salary maximum (€)';
