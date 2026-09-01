-- Cover letters MVP: metadata columns + unique letter per user/job

alter table public.cover_letters
  add column if not exists language text,
  add column if not exists model text,
  add column if not exists prompt_version text;

delete from public.cover_letters where job_id is null;

alter table public.cover_letters
  alter column job_id set not null;

drop index if exists cover_letters_job_id_unique;
alter table public.cover_letters drop constraint if exists cover_letters_job_id_key;

create unique index if not exists cover_letters_user_job_unique
  on public.cover_letters (user_id, job_id);

comment on column public.cover_letters.language is 'Detected output language (fr, en, ...)';
comment on column public.cover_letters.model is 'OpenAI model used for generation';
comment on column public.cover_letters.prompt_version is 'Prompt template version from lib/ai/prompts/cover-letter.ts';
