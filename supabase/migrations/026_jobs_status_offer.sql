-- Allow pipeline status: offer (proposition d'embauche)
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in (
    'new',
    'selected',
    'cover_generated',
    'applied',
    'interview',
    'offer',
    'rejected',
    'archived'
  ));
