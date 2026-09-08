-- Unique application per user+job so marking a job "applied" can upsert CRM safely.
create unique index if not exists applications_user_job_unique
  on public.applications (user_id, job_id)
  where job_id is not null;
