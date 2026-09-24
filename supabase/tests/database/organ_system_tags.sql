-- pgTAP tests for organ-system tags: students see tags only on published
-- exams and cannot write them; Identify label tags are staff-only.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select gen_random_uuid() as student \gset
select gen_random_uuid() as exam_pub \gset
select gen_random_uuid() as exam_draft \gset
select gen_random_uuid() as q_pub \gset
select gen_random_uuid() as q_draft \gset
select gen_random_uuid() as card_pub \gset
select gen_random_uuid() as card_draft \gset
select id as cardio from public.organ_systems where slug = 'cardiovascular' \gset

insert into auth.users (id, email) values (:'student', 'tag-student@test.local');
insert into public.exams (id, slug, title, is_published) values
  (:'exam_pub',   'ci-tag-pub',   'Pub',   true),
  (:'exam_draft', 'ci-tag-draft', 'Draft', false);
insert into public.questions (id, exam_id, stem, position) values
  (:'q_pub',   :'exam_pub',   'Q', 0),
  (:'q_draft', :'exam_draft', 'Q', 0);
insert into public.question_organ_systems (question_id, organ_system_id) values
  (:'q_pub', :cardio), (:'q_draft', :cardio);
insert into public.id_cards (id, title, image_path, is_published) values
  (:'card_pub',   'Pub',   'identify/a.png', true),
  (:'card_draft', 'Draft', 'identify/b.png', false);
insert into public.id_card_labels (card_id, label_no, answer) values
  (:'card_pub', 1, 'Frontal bone');
insert into public.id_card_label_organ_systems (label_id, organ_system_id)
  select id, :cardio from public.id_card_labels where card_id = :'card_pub';
select id as label1 from public.id_card_labels where card_id = :'card_pub' \gset

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student')::text, true);

select ok((select count(*) from public.organ_systems) >= 14,
  'students can read the organ system list');
select is((select count(*)::int from public.question_organ_systems where question_id = :'q_pub'), 1,
  'students see tags on published exams');
select is((select count(*)::int from public.question_organ_systems where question_id = :'q_draft'), 0,
  'students do not see tags on draft exams');
select throws_ok(
  format('insert into public.question_organ_systems values (%L, %s)', :'q_pub',
    (select id from public.organ_systems where slug = 'renal')),
  '42501', null, 'students cannot add tags');
select throws_ok(
  $$insert into public.organ_systems (slug, name_th, name_en) values ('x', 'x', 'x')$$,
  '42501', null, 'students cannot add organ systems');

select is((select count(*)::int from public.id_card_label_organ_systems), 0,
  'students cannot read label tags, even on published cards');
select throws_ok(
  format('insert into public.id_card_label_organ_systems values (%L, %s)', :'label1',
    (select id from public.organ_systems where slug = 'renal')),
  '42501', null, 'students cannot tag labels');

select * from finish();
rollback;
