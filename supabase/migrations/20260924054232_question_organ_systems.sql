-- Organ-system tags on questions (many-to-many), groundwork for per-system
-- score breakdowns. organ_systems is a fixed lookup list readable by everyone
-- signed in; question_organ_systems follows the same visibility as questions
-- (staff see all, students only for published exams).

create table public.organ_systems (
  id       smallint generated always as identity primary key,
  slug     text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_th  text not null,
  name_en  text not null,
  position integer not null default 0
);

insert into public.organ_systems (slug, name_en, name_th, position) values
  ('cardiovascular',  'Cardiovascular',        'ระบบหัวใจและหลอดเลือด', 1),
  ('respiratory',     'Respiratory',           'ระบบหายใจ',             2),
  ('gastrointestinal','Gastrointestinal',      'ระบบทางเดินอาหาร',      3),
  ('renal',           'Renal & Urinary',       'ระบบไตและทางเดินปัสสาวะ', 4),
  ('nervous',         'Nervous',               'ระบบประสาท',            5),
  ('musculoskeletal', 'Musculoskeletal',       'ระบบกล้ามเนื้อและกระดูก', 6),
  ('endocrine',       'Endocrine',             'ระบบต่อมไร้ท่อ',          7),
  ('reproductive',    'Reproductive',          'ระบบสืบพันธุ์',           8),
  ('hematology',      'Hematology & Lymphatic','ระบบเลือดและน้ำเหลือง',   9),
  ('immune',          'Immune',                'ระบบภูมิคุ้มกัน',         10),
  ('integumentary',   'Integumentary (Skin)',  'ระบบผิวหนัง',            11),
  ('special-senses',  'Special senses',        'ระบบประสาทสัมผัสพิเศษ',   12),
  ('general',         'General / Multisystem', 'ทั่วไป / หลายระบบ',      13);

alter table public.organ_systems enable row level security;
create policy "organ_systems: readable"
  on public.organ_systems for select to authenticated using (true);
create policy "organ_systems: staff manages"
  on public.organ_systems for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create table public.question_organ_systems (
  question_id     uuid not null references public.questions (id) on delete cascade,
  organ_system_id smallint not null references public.organ_systems (id) on delete cascade,
  primary key (question_id, organ_system_id)
);
create index question_organ_systems_system_idx
  on public.question_organ_systems (organ_system_id);

alter table public.question_organ_systems enable row level security;
create policy "question_organ_systems: published readable"
  on public.question_organ_systems for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = question_id and e.is_published
    )
  );
create policy "question_organ_systems: staff manages"
  on public.question_organ_systems for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Explicit grants: fresh databases no longer auto-expose new tables.
grant select, insert, update, delete on public.organ_systems          to authenticated;
grant select, insert, update, delete on public.question_organ_systems to authenticated;
