-- Cover letter coach pack (angle + notes + subject)

alter table public.cover_letters
  add column if not exists angle_briefing text,
  add column if not exists subject text,
  add column if not exists coach_notes jsonb default '[]'::jsonb;

comment on column public.cover_letters.angle_briefing is 'Coach fit/angle briefing shown above the letter';
comment on column public.cover_letters.subject is 'Suggested email subject line';
comment on column public.cover_letters.coach_notes is 'JSON array of short coach notes (gaps, what not to invent)';
