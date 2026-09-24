-- pgTAP tests for Identify typing (20260924120000_identify_for_students.sql):
-- students see only published cards, never read answers, can only answer the
-- question the server picked, get the weighted review order, and are capped
-- at 5 answers per day (10 once every published video is completed).
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select gen_random_uuid() as student \gset
select gen_random_uuid() as student2 \gset
select gen_random_uuid() as admin_user \gset
select gen_random_uuid() as course_id \gset
select gen_random_uuid() as video_id \gset
select gen_random_uuid() as card_pub \gset
select gen_random_uuid() as card_draft \gset

insert into auth.users (id, email) values
  (:'student', 'id-student@test.local'),
  (:'student2', 'id-student2@test.local'),
  (:'admin_user', 'id-admin@test.local');
update public.profiles set role = 'admin' where id = :'admin_user';

insert into public.courses (id, slug, title, is_published)
values (:'course_id', 'ci-id-course', 'CI ID course', true);
insert into public.videos (id, course_id, external_url, title, is_published)
values (:'video_id', :'course_id', 'https://example.com/v', 'V1', true);

insert into public.id_cards (id, title, image_path, is_published) values
  (:'card_pub', 'Skull', 'identify/skull.jpg', true),
  (:'card_draft', 'Draft', 'identify/draft.jpg', false);
-- Every published label has the same answer so grading is predictable
-- whichever label gets picked.
insert into public.id_card_labels (card_id, label_no, answer, synonyms)
select :'card_pub'::uuid, n, 'Frontal bone', '{frontal}'
from generate_series(1, 3) n;
insert into public.id_card_labels (card_id, label_no, answer)
values (:'card_draft', 1, 'Hidden');

-- student2 history: label 1 wrong only (group 1), label 2 right only (group 4),
-- label 3 wrong then right (group 2).
insert into public.id_answers (user_id, card_id, label_no, given, is_correct, answered_at) values
  (:'student2', :'card_pub', 1, 'x', false, now() - interval '3 days'),
  (:'student2', :'card_pub', 2, 'Frontal bone', true, now() - interval '3 days'),
  (:'student2', :'card_pub', 3, 'x', false, now() - interval '3 days'),
  (:'student2', :'card_pub', 3, 'Frontal bone', true, now() - interval '2 days');
update public.id_answers set answered_on = (answered_at at time zone 'Asia/Bangkok')::date
where user_id = :'student2';

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student')::text, true);

select results_eq(
  format('select id from public.id_cards where id in (%L::uuid, %L::uuid)', :'card_pub', :'card_draft'),
  format('values (%L::uuid)', :'card_pub'),
  'student sees only published cards');

select is((select count(*) from public.id_card_labels), 0::bigint,
  'student cannot read answer keys');

select throws_ok(
  format('select * from public.next_id_question(%L::uuid)', :'card_draft'),
  '42501', 'staff only', 'student cannot choose a card');

select throws_ok('select * from public.answer_id_label(''x'')',
  'P0002', 'no pending question', 'cannot answer before a question is served');

select is((select daily_limit from public.id_quota()), 5, 'default limit is 5');

-- New student: only new items exist, all from the published card.
select q.card_id as q1_card, q.label_no as q1_label
from public.next_id_question() q \gset
select is(:'q1_card'::uuid, :'card_pub'::uuid, 'served a published card');
select is((select label_no from public.next_id_question()), :'q1_label'::integer,
  'asking again returns the same pending question');

select is((select is_correct from public.answer_id_label('frontl bone')), true,
  'fuzzy match counts as correct');
select count(*) as _q from public.next_id_question() \gset
select is((select is_correct from public.answer_id_label('FRONTAL')), true,
  'synonym counts as correct');
select count(*) as _q from public.next_id_question() \gset
select is((select is_correct from public.answer_id_label('maxilla')), false,
  'wrong answer is incorrect');
select count(*) as _q from public.next_id_question() \gset
select count(*) as _a from public.answer_id_label('x') \gset
select count(*) as _q from public.next_id_question() \gset
select is((select used from public.answer_id_label('x')), 5,
  'fifth answer uses the whole quota');

select throws_ok('select * from public.next_id_question()',
  'P0001', 'daily limit reached', 'no sixth question');

select throws_ok(
  format('insert into public.id_answers (user_id, card_id, label_no, given, is_correct) values (%L::uuid, %L::uuid, 1, %L, true)',
    :'student', :'card_pub', 'x'),
  '42501', null, 'student cannot write answers directly');

select throws_ok('select count(*) from public.id_pending',
  '42501', null, 'student cannot read pending questions');

-- Weighted pick: groups 1 (wrong, never right) and 2 (review) exist, no new
-- items. Only label 1 is group 1, label 3 group 2, label 2 is right-only and
-- must never be served while groups 1-2 have items.
select set_config('request.jwt.claims', json_build_object('sub', :'student2')::text, true);
select is(
  (select label_no from public.next_id_question()) in (1, 3), true,
  'serves from wrong / review groups, not right-only');

-- Answer label 1 right (→ group 2) and label 3 right again (stays group 2):
-- now only groups 2 and 4 remain, so the pick must be 1 or 3 again.
select count(*) as _a from public.answer_id_label('Frontal bone') \gset
select is(
  (select label_no from public.next_id_question()) in (1, 3), true,
  'review group is served when no wrong or new items remain');

-- Completing every published video raises the limit to 10.
reset role;
insert into public.video_progress (user_id, video_id, completed)
values (:'student', :'video_id', true);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student')::text, true);

select is((select daily_limit from public.id_quota()), 10,
  'limit is 10 after watching every published video');

-- Staff: unlimited, and may force a card (e.g. a draft) for testing.
select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);
select is((select daily_limit from public.id_quota()), null::integer, 'staff have no limit');
select is((select card_id from public.next_id_question(:'card_draft')), :'card_draft'::uuid,
  'staff can force a specific card');

select * from finish();
rollback;
