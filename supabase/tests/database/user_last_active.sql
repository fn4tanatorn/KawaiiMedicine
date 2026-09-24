-- pgTAP tests for 20260924190000_user_last_active.sql: get_user_last_active()
-- returns the latest video activity per user and is staff-only.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select gen_random_uuid() as student_a \gset
select gen_random_uuid() as student_b \gset
select gen_random_uuid() as admin_user \gset
select gen_random_uuid() as course1 \gset
select gen_random_uuid() as video1 \gset
select gen_random_uuid() as video2 \gset

insert into auth.users (id, email) values
  (:'student_a', 'ula-a@test.local'),
  (:'student_b', 'ula-b@test.local'),
  (:'admin_user', 'ula-admin@test.local');
update public.profiles set role = 'admin' where id = :'admin_user';

insert into public.courses (id, slug, title, is_published)
values (:'course1', 'ci-ula-course', 'CI ULA Course', true);
insert into public.videos (id, course_id, title, external_url, is_published) values
  (:'video1', :'course1', 'Video 1', 'https://example.com/v1', true),
  (:'video2', :'course1', 'Video 2', 'https://example.com/v2', true);

insert into public.video_progress (user_id, video_id, seconds_watched) values
  (:'student_a', :'video1', 10),
  (:'student_a', :'video2', 10);
-- Pin timestamps after the fact so the trigger can't overwrite them.
alter table public.video_progress disable trigger user;
update public.video_progress set updated_at = '2026-09-01 10:00+07'
  where user_id = :'student_a' and video_id = :'video1';
update public.video_progress set updated_at = '2026-09-10 10:00+07'
  where user_id = :'student_a' and video_id = :'video2';
alter table public.video_progress enable trigger user;

set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);
select throws_ok(
  'select * from public.get_user_last_active()',
  '42501'
);

select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);
select is(
  (select last_active_at from public.get_user_last_active() where user_id = :'student_a'),
  '2026-09-10 10:00+07'::timestamptz,
  'last activity is the latest row'
);
select is(
  (select count(*)::int from public.get_user_last_active() where user_id = :'student_b'),
  0,
  'users with no activity have no row'
);

select * from finish();
rollback;
