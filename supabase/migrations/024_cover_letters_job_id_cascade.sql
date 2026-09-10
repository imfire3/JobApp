-- cover_letters.job_id is NOT NULL (009) but the original FK was ON DELETE SET NULL (003).
-- Deleting a job then tried to null job_id and violated the not-null constraint.
-- Align FK with cascade delete (same intent as migration 005 create-table path).

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'cover_letters'
    and con.contype = 'f'
    and pg_get_constraintdef(con.oid) ilike '%job_id%references%jobs%';

  if constraint_name is not null then
    execute format('alter table public.cover_letters drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.cover_letters
  alter column job_id set not null;

alter table public.cover_letters
  add constraint cover_letters_job_id_fkey
  foreign key (job_id) references public.jobs (id) on delete cascade;
