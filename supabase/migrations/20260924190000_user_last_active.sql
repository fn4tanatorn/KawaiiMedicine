-- get_user_last_active(): latest learning activity per user, for the staff
-- users page to flag people who haven't been back for a while.
-- Display only: nothing in pace / averages filters on this.
create or replace function public.get_user_last_active()
returns table (user_id uuid, last_active_at timestamptz)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  return query
  select a.user_id, max(a.at)
  from (
    select vp.user_id, vp.updated_at as at from public.video_progress vp
    union all
    select ea.user_id, coalesce(ea.submitted_at, ea.started_at) from public.exam_attempts ea
    union all
    select ia.user_id, ia.answered_at from public.id_answers ia
  ) a
  group by a.user_id;
end;
$$;

revoke execute on function public.get_user_last_active() from public, anon;
grant execute on function public.get_user_last_active() to authenticated;
