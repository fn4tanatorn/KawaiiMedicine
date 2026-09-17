-- Are students keeping up with the videos staff publish? Adds what the
-- /admin/learning-time overview needs on top of 20260917123951:
--
--   videos.published_at        when a video was first published, owned by a
--                               trigger. Already-published videos are
--                               backfilled with created_at (approximate).
--   get_video_learning_time_stats()
--                               gains finished_count: every student who
--                               completed the video, including completions
--                               from before started_at/completed_at existed.
--                               timed_count is the sample the day stats use.
--   get_video_progress_summary()
--                               published videos vs how many of them the
--                               average student has completed.

alter table public.videos add column published_at timestamptz;

-- Keep updated_at honest: the backfill isn't an edit to the video.
alter table public.videos disable trigger videos_set_updated_at;
update public.videos set published_at = created_at where is_published;
alter table public.videos enable trigger videos_set_updated_at;

-- First publish wins: unpublishing and republishing keeps the original date,
-- since that's when students could first see it.
create or replace function public.set_video_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.published_at := case when new.is_published then now() end;
  else
    new.published_at := coalesce(
      old.published_at,
      case when new.is_published then now() end
    );
  end if;
  return new;
end;
$$;

create trigger videos_set_published_at
  before insert or update on public.videos
  for each row execute function public.set_video_published_at();

-- Return columns change, so drop and recreate.
drop function public.get_video_learning_time_stats(uuid);

create function public.get_video_learning_time_stats(p_course_id uuid default null)
returns table (
  video_id           uuid,
  finished_count     integer,
  timed_count        integer,
  in_progress_count  integer,
  avg_span_days      numeric,
  median_span_days   numeric,
  avg_active_days    numeric,
  median_active_days numeric
)
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
  with progress as (
    select p.user_id, p.video_id, p.completed, p.started_at, p.completed_at
    from public.video_progress p
    join public.videos v on v.id = p.video_id
    join public.profiles pr on pr.id = p.user_id
    where pr.role = 'student'
      and (p_course_id is null or v.course_id = p_course_id)
  ),
  finished as (
    select
      pg.video_id,
      (pg.completed_at at time zone 'Asia/Bangkok')::date
        - (pg.started_at at time zone 'Asia/Bangkok')::date + 1 as span_days,
      (select count(*) from public.video_watch_days d
       where d.user_id = pg.user_id and d.video_id = pg.video_id
         and d.watch_date <= (pg.completed_at at time zone 'Asia/Bangkok')::date
      ) as active_days
    from progress pg
    where pg.started_at is not null and pg.completed_at is not null
  )
  select
    v.id,
    (select count(*) from progress pg where pg.video_id = v.id and pg.completed)::integer,
    (select count(*) from finished f where f.video_id = v.id)::integer,
    (select count(*) from progress pg where pg.video_id = v.id and not pg.completed)::integer,
    (select round(avg(f.span_days), 1) from finished f where f.video_id = v.id),
    (select round(percentile_cont(0.5) within group (order by f.span_days)::numeric, 1)
       from finished f where f.video_id = v.id),
    (select round(avg(f.active_days), 1) from finished f where f.video_id = v.id),
    (select round(percentile_cont(0.5) within group (order by f.active_days)::numeric, 1)
       from finished f where f.video_id = v.id)
  from public.videos v
  where p_course_id is null or v.course_id = p_course_id;
end;
$$;

grant execute on function public.get_video_learning_time_stats(uuid) to authenticated;

-- One row. "Published" means what students can see: a published video in a
-- published course. Every student counts, including ones who never opened a
-- video (not_started_students says how many of those there are).
create or replace function public.get_video_progress_summary(p_course_id uuid default null)
returns table (
  published_videos    integer,
  students            integer,
  avg_completed       numeric,
  median_completed    numeric,
  not_started_students integer
)
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
  with pub as (
    select v.id
    from public.videos v
    join public.courses c on c.id = v.course_id
    where v.is_published and c.is_published
      and (p_course_id is null or v.course_id = p_course_id)
  ),
  per_student as (
    select
      pr.id,
      count(p.video_id) filter (where p.completed) as completed,
      count(p.video_id) as opened
    from public.profiles pr
    left join public.video_progress p
      on p.user_id = pr.id and p.video_id in (select id from pub)
    where pr.role = 'student'
    group by pr.id
  )
  select
    (select count(*) from pub)::integer,
    count(*)::integer,
    round(avg(ps.completed), 1),
    round((percentile_cont(0.5) within group (order by ps.completed))::numeric, 1),
    (count(*) filter (where ps.opened = 0))::integer
  from per_student ps;
end;
$$;

grant execute on function public.get_video_progress_summary(uuid) to authenticated;
