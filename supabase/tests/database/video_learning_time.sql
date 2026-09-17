-- pgTAP tests for 20260917123951_video_learning_time.sql: the trigger owns
-- video_progress.started_at / completed_at (students can't forge them),
-- watch days are recorded, and get_video_learning_time_stats() computes
-- span / active days for students only and is staff-only.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select gen_random_uuid() as student_a \gset
select gen_random_uuid() as student_b \gset
select gen_random_uuid() as student_c \gset
select gen_random_uuid() as student_d \gset
select gen_random_uuid() as student_legacy \gset
select gen_random_uuid() as admin_user \gset
select gen_random_uuid() as course1 \gset
select gen_random_uuid() as video1 \gset
select gen_random_uuid() as video2 \gset

insert into auth.users (id, email) values
  (:'student_a', 'vlt-a@test.local'),
  (:'student_b', 'vlt-b@test.local'),
  (:'student_c', 'vlt-c@test.local'),
  (:'student_d', 'vlt-d@test.local'),
  (:'student_legacy', 'vlt-legacy@test.local'),
  (:'admin_user', 'vlt-admin@test.local');
update public.profiles set role = 'admin' where id = :'admin_user';

insert into public.courses (id, slug, title, is_published)
values (:'course1', 'ci-vlt-course', 'CI VLT Course', true);

insert into public.videos (id, course_id, title, external_url, is_published) values
  (:'video1', :'course1', 'Video 1', 'https://example.com/v1', true),
  (:'video2', :'course1', 'Video 2', 'https://example.com/v2', true);

-- Historical fixtures for video2 with fixed timestamps: bypass the
-- timestamp/watch-day triggers and write rows directly.
alter table public.video_progress disable trigger video_progress_set_timestamps;
alter table public.video_progress disable trigger video_progress_record_watch_day;

insert into public.video_progress (user_id, video_id, seconds_watched, completed, started_at, completed_at) values
  -- same day start + finish: span 1, active 1
  (:'student_b', :'video2', 600, true,  '2026-09-01 09:00+07', '2026-09-01 21:00+07'),
  -- Mon -> Fri: span 5, active 2 (a rewatch after finishing doesn't count)
  (:'student_c', :'video2', 600, true,  '2026-09-07 23:30+07', '2026-09-11 10:00+07'),
  -- still watching
  (:'student_d', :'video2', 100, false, '2026-09-10 10:00+07', null),
  -- pre-migration completion with unknown start: excluded
  (:'student_legacy', :'video2', 600, true, null, null),
  -- staff watching doesn't count
  (:'admin_user', :'video2', 600, true, '2026-09-01 09:00+07', '2026-09-30 09:00+07');

insert into public.video_watch_days (user_id, video_id, watch_date) values
  (:'student_b', :'video2', '2026-09-01'),
  (:'student_c', :'video2', '2026-09-07'),
  (:'student_c', :'video2', '2026-09-11'),
  (:'student_c', :'video2', '2026-09-15');

alter table public.video_progress enable trigger video_progress_set_timestamps;
alter table public.video_progress enable trigger video_progress_record_watch_day;

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

insert into public.video_progress (user_id, video_id, seconds_watched, completed, started_at, completed_at)
values (:'student_a', :'video1', 30, false, '2000-01-01', '2000-01-02');

select is(
  (select started_at from public.video_progress where user_id = :'student_a' and video_id = :'video1'),
  now(), 'insert: started_at is set by the trigger, not the client');
select is(
  (select completed_at from public.video_progress where user_id = :'student_a' and video_id = :'video1'),
  null, 'insert: completed_at stays null while not completed');

update public.video_progress set completed_at = '2000-01-02', started_at = '2000-01-01'
where user_id = :'student_a' and video_id = :'video1';
select is(
  (select completed_at from public.video_progress where user_id = :'student_a' and video_id = :'video1'),
  null, 'update: forged completed_at is ignored');

update public.video_progress set completed = true
where user_id = :'student_a' and video_id = :'video1';
select is(
  (select completed_at from public.video_progress where user_id = :'student_a' and video_id = :'video1'),
  now(), 'completing sets completed_at');
select is(
  (select started_at from public.video_progress where user_id = :'student_a' and video_id = :'video1'),
  now(), 'update: forged started_at is ignored');

select is(
  (select count(*) from public.video_watch_days
   where user_id = :'student_a' and video_id = :'video1'
     and watch_date = (now() at time zone 'Asia/Bangkok')::date),
  1::bigint, 'watching records one watch day (deduplicated)');

select throws_ok(
  format('insert into public.video_watch_days (user_id, video_id, watch_date) values (%L::uuid, %L::uuid, %L)',
    :'student_a', :'video1', '2026-01-01'),
  '42501',
  'permission denied for table video_watch_days',
  'students cannot write watch days directly'
);

select throws_ok(
  'select * from public.get_video_learning_time_stats()',
  '42501', 'staff only', 'students cannot read learning time stats');

-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);

select is(
  (select row(completed_count, in_progress_count)::text
   from public.get_video_learning_time_stats(:'course1') where video_id = :'video2'),
  row(2, 1)::text, 'counts only students, and only completions with a known start');
select is(
  (select row(avg_span_days, median_span_days)::text
   from public.get_video_learning_time_stats(:'course1') where video_id = :'video2'),
  row(3.0, 3.0)::text, 'span days: same day counts as 1, Mon-Fri as 5');
select is(
  (select row(avg_active_days, median_active_days)::text
   from public.get_video_learning_time_stats(:'course1') where video_id = :'video2'),
  row(1.5, 1.5)::text, 'active days: watch days after completion are ignored');
select is(
  (select count(*) from public.get_video_learning_time_stats(:'course1')),
  2::bigint, 'returns a row for every video in the course');

select * from finish();
rollback;
