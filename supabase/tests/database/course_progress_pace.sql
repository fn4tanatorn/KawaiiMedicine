-- pgTAP tests for get_course_progress_pace(), as amended by
-- 20260920043458_pace_active_students_only.sql:
-- get_course_progress_pace() is the student-facing version of
-- get_video_progress_summary() — callable by anyone, security definer so
-- it still averages over every student regardless of the caller's own
-- RLS visibility, and returns nothing per-student.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select gen_random_uuid() as student_a \gset
select gen_random_uuid() as student_b \gset
select gen_random_uuid() as student_c \gset
select gen_random_uuid() as student_d \gset
select gen_random_uuid() as course_pub \gset
select gen_random_uuid() as course_draft \gset
select gen_random_uuid() as video1 \gset
select gen_random_uuid() as video2 \gset
select gen_random_uuid() as video_draft \gset
select gen_random_uuid() as video_other_course \gset

insert into auth.users (id, email) values
  (:'student_a', 'cpp-a@test.local'),
  (:'student_b', 'cpp-b@test.local'),
  (:'student_c', 'cpp-c@test.local'),
  (:'student_d', 'cpp-d@test.local');

insert into public.courses (id, slug, title, is_published) values
  (:'course_pub', 'ci-cpp-course', 'CI CPP Course', true),
  (:'course_draft', 'ci-cpp-draft-course', 'CI CPP Draft Course', false);

insert into public.videos (id, course_id, title, external_url, is_published) values
  (:'video1', :'course_pub', 'Video 1', 'https://example.com/v1', true),
  (:'video2', :'course_pub', 'Video 2', 'https://example.com/v2', true),
  (:'video_draft', :'course_pub', 'Video 3 (draft)', 'https://example.com/v3', false),
  (:'video_other_course', :'course_draft', 'Draft course video', 'https://example.com/v4', true);

-- a finished both, b finished one. c only touched the unpublished video and
-- d never opened anything: neither has started this course, so neither is
-- averaged in.
insert into public.video_progress (user_id, video_id, completed) values
  (:'student_a', :'video1', true),
  (:'student_a', :'video2', true),
  (:'student_b', :'video1', true),
  (:'student_b', :'video2', false),
  (:'student_c', :'video_draft', true);

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student_b')::text, true);

-- A student's own RLS only lets them see their own video_progress /
-- profiles rows; this function must still average over every student who
-- started the course, not just the caller.
select is(
  (select row(published_videos, avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, 1.5, 2)::text,
  'a student sees the whole class average, not just their own rows');

select is(
  (select count(*) from public.get_course_progress_pace(:'course_pub')
   where avg_completed is null),
  0::bigint, 'no null row leaks through for a real course');

select is(
  (select count(*) from public.get_course_progress_pace(:'course_draft')),
  0::bigint, 'an unpublished course returns nothing, even though it has a published video');

select is(
  (select count(*) from public.get_course_progress_pace(gen_random_uuid())),
  0::bigint, 'a nonexistent course id returns nothing');

-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

select is(
  (select row(published_videos, avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, 1.5, 2)::text,
  'the aggregate does not change depending on which student asks');

-- ---------------------------------------------------------------------------
reset role;

select is(
  (select row(published_videos, avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, 1.5, 2)::text,
  'staff get the same aggregate too (no staff-only gate on this one)');

-- The whole point of the amendment: a student who never started must not be
-- averaged in as a zero. Giving d a (not completed) row on a published video
-- makes them active and must move the average down.
insert into public.video_progress (user_id, video_id, completed)
values (:'student_d', :'video1', false);

select is(
  (select row(avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(1.0, 3)::text,
  'a student who starts but finishes nothing does count, as a zero');

delete from public.video_progress where user_id = :'student_d';

-- An inactive student who hasn't finished (e.g. last touch > 14 days ago)
-- must be excluded from the denominator so they don't drag down the 60% pace.
insert into public.video_progress (user_id, video_id, completed, updated_at)
values (:'student_d', :'video1', false, now() - interval '20 days');

select is(
  (select row(avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(1.5, 2)::text,
  'a student who has not finished and has been inactive for > 14 days is excluded');

delete from public.video_progress where user_id = :'student_d';

-- But a student who finished ALL published videos must NEVER be excluded,
-- even if their last touch was over 14 days ago.
delete from public.video_progress where user_id = :'student_a';
insert into public.video_progress (user_id, video_id, completed, updated_at) values
  (:'student_a', :'video1', true, now() - interval '30 days'),
  (:'student_a', :'video2', true, now() - interval '30 days');

select is(
  (select row(avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(1.5, 2)::text,
  'a student who finished all videos remains counted even when inactive > 14 days');

-- And when nobody has started at all, the function returns a null average
-- with zero active students rather than a misleading 0%.
delete from public.video_progress
where video_id in (:'video1', :'video2');

select is(
  (select row(published_videos, avg_completed, active_students)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, null, 0)::text,
  'a course nobody has started reports no average at all');

select * from finish();
rollback;
