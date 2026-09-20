-- The class-average pace counted every profile with role 'student', so a
-- student who signed up and never opened a single clip was averaged in as a
-- zero. With enough of those the average stops describing the people who are
-- actually taking the course, and it drags down the 60% mark the instructor
-- waits for before publishing the next video.
--
-- Count only students who have started this course (at least one
-- video_progress row on one of its published videos), and return how many
-- those are so the UI can say what the average is over.

drop function if exists public.get_course_progress_pace(uuid);

create function public.get_course_progress_pace(p_course_id uuid)
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
  -- One row per student who has touched this course at all, whether or not
  -- they finished anything. Started-but-stuck still counts; never-opened
  -- does not.
  per_student as (
    select
      p.user_id,
      count(*) filter (where p.completed) as completed
    from public.video_progress p
    join public.profiles pr on pr.id = p.user_id and pr.role = 'student'
    where p.video_id in (select id from pub)
    group by p.user_id
  )
  select
    (select count(*) from pub)::integer,
    round(avg(ps.completed), 1),
    count(*)::integer
  from per_student ps;
end;
$$;

grant execute on function public.get_course_progress_pace(uuid) to authenticated;
