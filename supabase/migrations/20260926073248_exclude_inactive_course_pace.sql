-- Exclude stalled/inactive students from the course progress pace denominator.
--
-- Previously (20260920043458), any student who ever touched a video in this course
-- was counted indefinitely. If a student started 1 video weeks ago and stalled or
-- stopped, their stalled progress dragged down the 60% class average target.
--
-- To prevent this pace bottleneck while preserving fairness:
-- 1. Students who completed ALL published videos in this course are ALWAYS counted
--    (they should never be penalized/dropped for waiting on new videos).
-- 2. Students who have not completed all videos are counted ONLY IF they interacted
--    with this course within the last 14 days (last_touched_at >= now() - interval '14 days').
-- 3. Students who have not finished and have been inactive for > 14 days in this
--    course are excluded from both the numerator and denominator.

create or replace function public.get_course_progress_pace(p_course_id uuid)
returns table (
  published_videos integer,
  avg_completed    numeric,
  active_students  integer
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
  pub_count as (
    select count(*)::integer as total from pub
  ),
  per_student as (
    select
      p.user_id,
      count(*) filter (where p.completed) as completed,
      max(p.updated_at) as last_touched_at
    from public.video_progress p
    join public.profiles pr on pr.id = p.user_id and pr.role = 'student'
    where p.video_id in (select id from pub)
    group by p.user_id
  ),
  eligible as (
    select ps.completed
    from per_student ps, pub_count pc
    where pc.total > 0
      and (
        ps.completed = pc.total
        or ps.last_touched_at >= (now() - interval '14 days')
      )
  )
  select
    (select total from pub_count),
    round(avg(e.completed), 1),
    count(e.completed)::integer
  from eligible e;
end;
$$;

grant execute on function public.get_course_progress_pace(uuid) to authenticated;
