-- Add missing cover letter fields to jobs table

alter table public.jobs
  add column if not exists cover_letter_subject text,
  add column if not exists cover_letter_angle_briefing text,
  add column if not exists cover_letter_coach_notes jsonb default '[]'::jsonb;

comment on column public.jobs.cover_letter_subject is 'Suggested email subject line for the cover letter';
comment on column public.jobs.cover_letter_angle_briefing is 'Coach fit/angle briefing shown above the letter';
comment on column public.jobs.cover_letter_coach_notes is 'JSON array of short coach notes (gaps, what not to invent)';