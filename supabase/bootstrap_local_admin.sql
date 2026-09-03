-- Bootstrap for JobApp local-auth (admin@gmail.com / admin)
-- Run AFTER all migrations 001→012 on a fresh Supabase project.
-- Required because the app stores jobs with user_id =
-- 00000000-0000-4000-a000-000000000001 (local admin), which must exist in auth.users.

create extension if not exists pgcrypto;

-- Create auth user compatible with local admin id (idempotent)
do $$
begin
  if not exists (
    select 1 from auth.users where id = '00000000-0000-4000-a000-000000000001'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-4000-a000-000000000001',
      'authenticated',
      'authenticated',
      'admin@gmail.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;
end $$;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  jsonb_build_object('sub', '00000000-0000-4000-a000-000000000001', 'email', 'admin@gmail.com'),
  'email',
  '00000000-0000-4000-a000-000000000001',
  now(),
  now(),
  now()
where not exists (
  select 1 from auth.identities
  where user_id = '00000000-0000-4000-a000-000000000001'
);

insert into public.profiles (id, target_roles, target_locations)
values (
  '00000000-0000-4000-a000-000000000001',
  array['Product Owner', 'Product Manager'],
  array['Paris', 'remote', 'hybrid']
)
on conflict (id) do nothing;

insert into public.cv_contexts (id)
values ('00000000-0000-4000-a000-000000000001')
on conflict (id) do nothing;
