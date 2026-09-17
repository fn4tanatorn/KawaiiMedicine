-- pgTAP tests for course files (20260917123312_course_files.sql): students
-- only see published files in published courses (table, link table, and
-- storage bucket agree), can't write, and a file can't be linked to a video
-- from another course.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select gen_random_uuid() as student_a \gset
select gen_random_uuid() as admin_user \gset
select gen_random_uuid() as course_pub \gset
select gen_random_uuid() as course_draft \gset
select gen_random_uuid() as video_pub \gset
select gen_random_uuid() as video_other \gset
select gen_random_uuid() as file_pub \gset
select gen_random_uuid() as file_unpub \gset
select gen_random_uuid() as file_in_draft \gset

insert into auth.users (id, email) values
  (:'student_a', 'cf-student-a@test.local'),
  (:'admin_user', 'cf-admin@test.local');
update public.profiles set role = 'admin' where id = :'admin_user';

insert into public.courses (id, slug, title, is_published) values
  (:'course_pub',   'ci-cf-pub',   'CI CF Published', true),
  (:'course_draft', 'ci-cf-draft', 'CI CF Draft',     false);

insert into public.videos (id, course_id, external_url, title, is_published) values
  (:'video_pub',   :'course_pub',   'https://example.com/a', 'Part 1', true),
  (:'video_other', :'course_draft', 'https://example.com/b', 'Other course video', true);

insert into public.course_files (id, course_id, title, storage_path, is_published) values
  (:'file_pub',      :'course_pub',   'Slides',       'cf/pub.pdf',      true),
  (:'file_unpub',    :'course_pub',   'Draft slides', 'cf/unpub.pdf',    false),
  (:'file_in_draft', :'course_draft', 'Hidden',       'cf/in-draft.pdf', true);

insert into public.video_files (video_id, file_id, course_id) values
  (:'video_pub', :'file_pub',   :'course_pub'),
  (:'video_pub', :'file_unpub', :'course_pub');

insert into storage.objects (bucket_id, name) values
  ('course-files', 'cf/pub.pdf'),
  ('course-files', 'cf/unpub.pdf'),
  ('course-files', 'cf/in-draft.pdf');

-- A file can't be linked to a video in a different course.
select throws_ok(
  format('insert into public.video_files (video_id, file_id, course_id) values (%L::uuid, %L::uuid, %L::uuid)',
    :'video_other', :'file_pub', :'course_pub'),
  '23503',
  'insert or update on table "video_files" violates foreign key constraint "video_files_video_id_course_id_fkey"',
  'cannot link a file to a video from another course'
);

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

select results_eq(
  format('select id from public.course_files where course_id in (%L::uuid, %L::uuid)', :'course_pub', :'course_draft'),
  format('values (%L::uuid)', :'file_pub'),
  'student sees only the published file in the published course'
);

select results_eq(
  format('select file_id from public.video_files where video_id = %L::uuid', :'video_pub'),
  format('values (%L::uuid)', :'file_pub'),
  'student sees only links to published files'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'course-files' and name = 'cf/pub.pdf'),
  1::bigint, 'student can see a published file object');
select is(
  (select count(*) from storage.objects where bucket_id = 'course-files' and name = 'cf/unpub.pdf'),
  0::bigint, 'student cannot see an unpublished file object');
select is(
  (select count(*) from storage.objects where bucket_id = 'course-files' and name = 'cf/in-draft.pdf'),
  0::bigint, 'student cannot see a file object in an unpublished course');

select throws_ok(
  format('insert into public.course_files (course_id, title, storage_path) values (%L::uuid, %L, %L)',
    :'course_pub', 'Sneaky', 'cf/sneaky.pdf'),
  '42501',
  'new row violates row-level security policy for table "course_files"',
  'student cannot create a course file'
);

-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);

select is(
  (select count(*) from public.course_files where course_id in (:'course_pub', :'course_draft')),
  3::bigint, 'staff sees every course file');
select is(
  (select count(*) from storage.objects where bucket_id = 'course-files' and name = 'cf/unpub.pdf'),
  1::bigint, 'staff can see an unpublished file object');
select lives_ok(
  format('delete from public.course_files where id = %L::uuid', :'file_unpub'),
  'staff can delete a course file');

select * from finish();
rollback;
