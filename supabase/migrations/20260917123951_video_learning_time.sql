-- How many days students take to finish a video, for the admin stats page.
--
-- Two measures, both in Asia/Bangkok calendar days, same as streaks:
--   span days   = completed date - first-watched date + 1 (same day = 1)
--   active days = distinct days the student watched this video, up to and
--                 including the day they completed it
--
-- video_progress gains started_at / completed_at. Both are owned by a
-- trigger: students can upsert their own progress row, so the trigger
-- ignores whatever they send for these columns. Rows that existed before
-- this migration keep NULLs (their real start/finish is unknown) and are
-- left out of the stats rather than guessed from updated_at, which keeps
-- moving on rewatches.
--
-- public.video_watch_days records one row per (user, video, day), written
-- only by a security definer trigger on video_progress -- same pattern as
-- public.user_activity.

alter table public.video_progress
  add column started_at   timestamptz,
  add column completed_at timestamptz;
-- Default added separately so existing rows stay NULL instead of "now".
alter table public.video_progress alter column started_at set default now();

create or replace function public.set_video_progress_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.started_at   := now();
    new.completed_at := case when new.completed then now() end;
  else
    new.started_at   := old.started_at;
    new.completed_at := coalesce(
      old.completed_at,
      case when new.completed and not old.completed then now() end
    );
  end if;
  return new;
end;
$$;

create trigger video_progress_set_timestamps
  before insert or update on public.video_progress
  for each row execute function public.set_video_progress_timestamps();

create table public.video_watch_days (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  video_id   uuid not null references public.videos (id) on delete cascade,
  watch_date date not null,
  primary key (user_id, video_id, watch_date)
);

create index video_watch_days_video_id_idx on public.video_watch_days (video_id);

alter table public.video_watch_days enable row level security;
grant select on public.video_watch_days to authenticated;

create policy "video_watch_days: read own or staff"
  on public.video_watch_days for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
-- No insert/update/delete policies: only the trigger below writes.

create or replace function public.record_video_watch_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.video_watch_days (user_id, video_id, watch_date)
  values (new.user_id, new.video_id, (now() at time zone 'Asia/Bangkok')::date)
  on conflict do nothing;
  return new;
end;
$$;

create trigger video_progress_record_watch_day
  after insert or update on public.video_progress
  for each row execute function public.record_video_watch_day();

-- Per-video stats for staff. Only students count (staff testing videos
-- would skew the numbers) and only completions with a known start.
create or replace function public.get_video_learning_time_stats(p_course_id uuid default null)
returns table (
  video_id           uuid,
  completed_count    integer,
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
