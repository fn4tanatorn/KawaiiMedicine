-- Migration: 20260926160500_class_enrollment_gate.sql
-- Adds `enrolled` status to `profiles` to ensure new sign-ups must provide the
-- Class Invitation Code (from LINE OpenChat) before gaining student privileges.

alter table public.profiles
  add column if not exists enrolled boolean not null default false;

-- Backfill all existing users so no currently enrolled students are locked out.
update public.profiles set enrolled = true;

-- Keep handle_new_user in sync: new users start as enrolled = false.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, enrolled)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;
  return new;
end;
$$;
