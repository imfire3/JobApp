-- Backup of previous CV text for reversible optimization
alter table public.cv_contexts
  add column if not exists cv_text_previous text;

-- Ensure existing rows have empty string fallback for previous version
update public.cv_contexts
set cv_text_previous = coalesce(cv_text_previous, '')
where cv_text_previous is null;
