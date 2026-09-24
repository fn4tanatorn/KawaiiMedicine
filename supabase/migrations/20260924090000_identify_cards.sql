-- "Identify typing" prototype (admin-only beta).
--
-- id_cards: one labelled figure (Netter-style anatomy / histology flashcard).
--   The label numbers are printed on the image itself.
-- id_card_labels: one row per numbered structure on the card, with the answer
--   and optional accepted alternatives. A card is one "question" with many
--   blanks.
-- check_id_card(): grades typed answers server-side with the same fuzzy rules
--   as exams (normalize_answer + levenshtein tolerance).
--
-- Beta: every policy is admin-only. Widening to students later means adding
-- is_published SELECT policies on id_cards only — never on id_card_labels.

create table public.id_cards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (btrim(title) <> ''),
  subject      text not null default 'anatomy' check (subject in ('anatomy', 'histology')),
  image_path   text not null,
  is_published boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.id_card_labels (
  id        uuid primary key default gen_random_uuid(),
  card_id   uuid not null references public.id_cards (id) on delete cascade,
  label_no  integer not null check (label_no > 0),
  answer    text not null check (btrim(answer) <> ''),
  synonyms  text[] not null default '{}',
  unique (card_id, label_no)
);

alter table public.id_cards enable row level security;
alter table public.id_card_labels enable row level security;

create policy "id_cards: admin only"
  on public.id_cards for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "id_card_labels: admin only"
  on public.id_card_labels for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

grant select, insert, update, delete on public.id_cards, public.id_card_labels to authenticated;

-- p_answers: {"1": "frontal bone", "2": "..."}; returns per-label result + key.
create or replace function public.check_id_card(p_card_id uuid, p_answers jsonb)
returns table (label_no integer, answer text, given text, is_correct boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select l.label_no,
         l.answer,
         coalesce(p_answers ->> l.label_no::text, '') as given,
         public.normalize_answer(p_answers ->> l.label_no::text) <> ''
         and exists (
           select 1
           from unnest(array[l.answer] || l.synonyms) k(key)
           where public.normalize_answer(k.key) = public.normalize_answer(p_answers ->> l.label_no::text)
              or public.answer_distance(k.key, p_answers ->> l.label_no::text)
                 <= public.fuzzy_tolerance(public.normalize_answer(k.key))
         ) as is_correct
  from public.id_card_labels l
  where l.card_id = p_card_id
  order by l.label_no;
$$;

grant execute on function public.check_id_card(uuid, jsonb) to authenticated;
