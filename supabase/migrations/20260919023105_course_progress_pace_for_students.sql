-- Students asked to see the same "average finished (clips)" pace admin
-- already tracks on /admin/learning-time, so they can tell how close the
-- class is to the 60% mark the instructor waits for before publishing the
-- next video (an informal agreement, not stored anywhere).
--
-- get_video_progress_summary() can't be reused as-is: it's staff-only and,
-- being security invoker, a student calling it would only aggregate over
-- rows RLS lets them see (their own). This is the same aggregation scoped
-- to one course, security definer so it can average over every student,
-- and returning nothing but that aggregate — no per-student rows.
create function public.get_course_progress_pace(p_course_id uuid)
returns table (
  published_videos integer,
  avg_completed    numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Defense in depth: security definer bypasses RLS, so don't let a caller
  -- probe an unpublished course by id even though callers are only meant
  -- to pass a course they can already see.
  if not exists (
    select 1 from public.courses where id = p_course_id and is_published
  ) then
    return;
  end if;

  return query
  with pub as (
    select v.id
    from public.videos v
    where v.course_id = p_course_id and v.is_published
  ),
  per_student as (
    select
      pr.id,
      count(p.video_id) filter (where p.completed) as completed
    from public.profiles pr
    left join public.video_progress p
      on p.user_id = pr.id and p.video_id in (select id from pub)
    where pr.role = 'student'
    group by pr.id
  )
  select
    (select count(*) from pub)::integer,
    round(avg(ps.completed), 1)
  from per_student ps;
end;
$$;

grant execute on function public.get_course_progress_pace(uuid) to authenticated;
