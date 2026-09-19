-- pgTAP tests for 20260919023105_course_progress_pace_for_students.sql:
-- get_course_progress_pace() is the student-facing version of
-- get_video_progress_summary() — callable by anyone, security definer so
-- it still averages over every student regardless of the caller's own
-- RLS visibility, and returns nothing per-student.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select gen_random_uuid() as student_a \gset
select gen_random_uuid() as student_b \gset
select gen_random_uuid() as student_c \gset
select gen_random_uuid() as course_pub \gset
select gen_random_uuid() as course_draft \gset
select gen_random_uuid() as video1 \gset
select gen_random_uuid() as video2 \gset
select gen_random_uuid() as video_draft \gset
select gen_random_uuid() as video_other_course \gset

insert into auth.users (id, email) values
  (:'student_a', 'cpp-a@test.local'),
  (:'student_b', 'cpp-b@test.local'),
  (:'student_c', 'cpp-c@test.local');

insert into public.courses (id, slug, title, is_published) values
  (:'course_pub', 'ci-cpp-course', 'CI CPP Course', true),
  (:'course_draft', 'ci-cpp-draft-course', 'CI CPP Draft Course', false);

insert into public.videos (id, course_id, title, external_url, is_published) values
  (:'video1', :'course_pub', 'Video 1', 'https://example.com/v1', true),
  (:'video2', :'course_pub', 'Video 2', 'https://example.com/v2', true),
  (:'video_draft', :'course_pub', 'Video 3 (draft)', 'https://example.com/v3', false),
  (:'video_other_course', :'course_draft', 'Draft course video', 'https://example.com/v4', true);

-- a finished both, b finished one, c finished none (only the draft video).
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
-- profiles rows; this function must still average over all three.
select is(
  (select row(published_videos, avg_completed)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, 1.0)::text,
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
  (select row(published_videos, avg_completed)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, 1.0)::text,
  'the aggregate does not change depending on which student asks');

-- ---------------------------------------------------------------------------
reset role;

select is(
  (select row(published_videos, avg_completed)::text
   from public.get_course_progress_pace(:'course_pub')),
  row(2, 1.0)::text,
  'staff get the same aggregate too (no staff-only gate on this one)');

select * from finish();
rollback;
