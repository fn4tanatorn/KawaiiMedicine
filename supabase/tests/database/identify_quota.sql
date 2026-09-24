-- pgTAP tests for Identify typing (20260924120000_identify_for_students.sql):
-- students see only published cards, never read answers, and are capped at
-- 5 answered labels per day (10 once every published video is completed).
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select gen_random_uuid() as student \gset
select gen_random_uuid() as admin_user \gset
select gen_random_uuid() as course_id \gset
select gen_random_uuid() as video_id \gset
select gen_random_uuid() as card_pub \gset
select gen_random_uuid() as card_draft \gset

insert into auth.users (id, email) values
  (:'student', 'id-student@test.local'),
  (:'admin_user', 'id-admin@test.local');
update public.profiles set role = 'admin' where id = :'admin_user';

insert into public.courses (id, slug, title, is_published)
values (:'course_id', 'ci-id-course', 'CI ID course', true);
insert into public.videos (id, course_id, external_url, title, is_published)
values (:'video_id', :'course_id', 'https://example.com/v', 'V1', true);

insert into public.id_cards (id, title, image_path, is_published) values
  (:'card_pub', 'Skull', 'identify/skull.jpg', true),
  (:'card_draft', 'Draft', 'identify/draft.jpg', false);
insert into public.id_card_labels (card_id, label_no, answer, synonyms)
select :'card_pub'::uuid, n, 'Structure number ' || n, '{}'
from generate_series(1, 12) n;
insert into public.id_card_labels (card_id, label_no, answer)
values (:'card_draft', 1, 'Hidden');
update public.id_card_labels set answer = 'Frontal bone', synonyms = '{frontal}'
where card_id = :'card_pub' and label_no = 1;

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student')::text, true);

select results_eq(
  format('select id from public.id_cards where id in (%L::uuid, %L::uuid)', :'card_pub', :'card_draft'),
  format('values (%L::uuid)', :'card_pub'),
  'student sees only published cards');

select is((select count(*) from public.id_card_labels), 0::bigint,
  'student cannot read answer keys');

select is((select count(*) from public.id_card_label_nos(:'card_pub')), 12::bigint,
  'student gets label numbers of a published card');
select is((select count(*) from public.id_card_label_nos(:'card_draft')), 0::bigint,
  'student gets no label numbers of a draft card');

select throws_ok(
  format('select * from public.answer_id_label(%L::uuid, 1, %L)', :'card_draft', 'Hidden'),
  'P0002', 'label not found', 'student cannot answer a draft card');

select is((select daily_limit from public.id_quota()), 5, 'default limit is 5');

select is((select is_correct from public.answer_id_label(:'card_pub', 1, 'frontl bone')), true,
  'fuzzy match counts as correct');
select is((select is_correct from public.answer_id_label(:'card_pub', 1, 'FRONTAL')), true,
  'synonym counts as correct');
select is((select is_correct from public.answer_id_label(:'card_pub', 2, 'maxilla')), false,
  'wrong answer is incorrect');
select count(*) as _answered from public.answer_id_label(:'card_pub', 3, 'x') \gset
select is((select used from public.answer_id_label(:'card_pub', 4, 'x')), 5,
  'fifth answer uses the whole quota');

select throws_ok(
  format('select * from public.answer_id_label(%L::uuid, 5, %L)', :'card_pub', 'x'),
  'P0001', 'daily limit reached', 'sixth answer is refused');

select throws_ok(
  format('insert into public.id_answers (user_id, card_id, label_no, given, is_correct) values (%L::uuid, %L::uuid, 1, %L, true)',
    :'student', :'card_pub', 'x'),
  '42501', null, 'student cannot write answers directly');

-- Completing every published video raises the limit to 10.
reset role;
insert into public.video_progress (user_id, video_id, completed)
values (:'student', :'video_id', true);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student')::text, true);

select is((select daily_limit from public.id_quota()), 10,
  'limit is 10 after watching every published video');

-- Staff are unlimited.
select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);
select is((select daily_limit from public.id_quota()), null::integer, 'staff have no limit');

select * from finish();
rollback;
