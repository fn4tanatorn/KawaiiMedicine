-- Step 2: Update public.is_staff() to recognize 'co_admin'.
-- Allows Co-admins to access staff features across the platform.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('instructor', 'co_admin', 'admin'), false);
$$;
