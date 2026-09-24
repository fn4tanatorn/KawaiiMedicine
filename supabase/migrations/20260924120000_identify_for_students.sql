-- Open "Identify typing" to students, with a daily quota.
--
-- 1 answered label = 1 question. Quota per Asia/Bangkok day:
--   5  by default
--   10 once the student has completed every published video
--      (published video in a published course)
--   unlimited for staff
-- Students see only published cards. Answers (id_card_labels.answer /
-- synonyms) are never readable by students.
--
-- Students never choose a question: next_id_question() picks one and stores
-- it in id_pending; answer_id_label() grades only that pending question,
-- logs it to id_answers (its only writer) and enforces the quota.
--
-- Pick weights per (card, label) item, from the student's own history:
--   60% wrong and never right yet
--   20% was wrong, later right (review)
--   20% never answered
-- Empty groups are dropped and the rest re-weighted (e.g. only new items →
-- 100% new). If all three are empty, pick among items only ever answered
-- right.

-- Admin-only → staff manage, students read published cards.
drop policy "id_cards: admin only" on public.id_cards;
drop policy "id_card_labels: admin only" on public.id_card_labels;

create policy "id_cards: read published or staff"
  on public.id_cards for select to authenticated
  using (is_published or public.is_staff());
create policy "id_cards: staff write"
  on public.id_cards for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- No student policy here on purpose (same rule as choices.is_correct).
create policy "id_card_labels: staff only"
  on public.id_card_labels for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Admin-beta grader leaked every key of a card; replaced by answer_id_label().
drop function public.check_id_card(uuid, jsonb);

create table public.id_answers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  card_id     uuid not null references public.id_cards (id) on delete cascade,
  label_no    integer not null,
  given       text not null,
  is_correct  boolean not null,
  answered_on date not null default ((now() at time zone 'Asia/Bangkok')::date),
  answered_at timestamptz not null default now()
);
create index id_answers_user_day_idx on public.id_answers (user_id, answered_on);

alter table public.id_answers enable row level security;
create policy "id_answers: read own or staff"
  on public.id_answers for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
-- No insert/update/delete policies: only answer_id_label() writes.
revoke all on public.id_answers from anon, authenticated;
grant select on public.id_answers to authenticated;

-- Daily limit for the current user (null = unlimited).
create or replace function public.id_daily_limit()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_staff() then null
    when exists (
           select 1 from public.videos v
           join public.courses c on c.id = v.course_id
           where v.is_published and c.is_published)
     and not exists (
           select 1 from public.videos v
           join public.courses c on c.id = v.course_id
           where v.is_published and c.is_published
             and not exists (
               select 1 from public.video_progress p
               where p.video_id = v.id and p.user_id = auth.uid() and p.completed))
      then 10
    else 5
  end;
$$;

create or replace function public.id_quota()
returns table (daily_limit integer, used integer)
language sql
stable
security definer
set search_path = public
as $$
  select public.id_daily_limit(),
         (select count(*)::integer from public.id_answers a
          where a.user_id = auth.uid()
            and a.answered_on = (now() at time zone 'Asia/Bangkok')::date);
$$;

-- The one question a user is currently being asked.
create table public.id_pending (
  user_id   uuid primary key references public.profiles (id) on delete cascade,
  card_id   uuid not null,
  label_no  integer not null,
  served_at timestamptz not null default now(),
  foreign key (card_id, label_no)
    references public.id_card_labels (card_id, label_no) on delete cascade
);
alter table public.id_pending enable row level security;
-- No policies or grants: only the security definer functions below touch it.
revoke all on public.id_pending from anon, authenticated;

-- Every item the caller may be asked, with its review group
-- (1 wrong-never-right, 2 wrong-then-right, 3 new, 4 only ever right).
create or replace function public.id_item_groups()
returns table (card_id uuid, label_no integer, grp integer)
language sql
stable
security definer
set search_path = public
as $$
  select l.card_id, l.label_no,
         case
           when count(a.id) = 0 then 3
           when bool_or(not a.is_correct) and not bool_or(a.is_correct) then 1
           when bool_or(not a.is_correct) then 2
           else 4
         end
  from public.id_card_labels l
  join public.id_cards c on c.id = l.card_id
  left join public.id_answers a
    on a.user_id = auth.uid() and a.card_id = l.card_id and a.label_no = l.label_no
  where c.is_published or public.is_staff()
  group by l.card_id, l.label_no;
$$;

-- Current question for the caller; picks and stores a new one if none is
-- pending. p_card_id (staff only) forces a random label of that card.
create or replace function public.next_id_question(p_card_id uuid default null)
returns table (card_id uuid, label_no integer)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_limit   integer := public.id_daily_limit();
  v_used    integer;
  v_pending public.id_pending;
  v_n       integer[] := array[0, 0, 0, 0];
  v_w       numeric[];
  v_r       numeric;
  v_grp     integer;
  v_row        record;
  v_last_card  uuid;
  v_last_label integer;
  v_pick_card  uuid;
  v_pick_label integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_card_id is not null and not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  select count(*) into v_used from public.id_answers a
  where a.user_id = auth.uid()
    and a.answered_on = (now() at time zone 'Asia/Bangkok')::date;
  if v_limit is not null and v_used >= v_limit then
    raise exception 'daily limit reached' using errcode = 'P0001';
  end if;

  -- Reloading the page must not re-roll the question.
  select p.* into v_pending from public.id_pending p
  join public.id_cards c on c.id = p.card_id
  where p.user_id = auth.uid() and (c.is_published or public.is_staff());
  if v_pending.user_id is not null and p_card_id is null then
    return query select v_pending.card_id, v_pending.label_no;
    return;
  end if;

  if p_card_id is not null then
    select l.card_id, l.label_no into v_pick_card, v_pick_label
    from public.id_card_labels l where l.card_id = p_card_id
    order by random() limit 1;
  else
    for v_row in select g.grp, count(*)::integer as n
                 from public.id_item_groups() g group by g.grp loop
      v_n[v_row.grp] := v_row.n;
    end loop;

    v_w := array[
      case when v_n[1] > 0 then 0.6 else 0 end,
      case when v_n[2] > 0 then 0.2 else 0 end,
      case when v_n[3] > 0 then 0.2 else 0 end];
    if v_w[1] + v_w[2] + v_w[3] > 0 then
      v_r := random() * (v_w[1] + v_w[2] + v_w[3]);
      v_grp := case when v_r < v_w[1] then 1
                    when v_r < v_w[1] + v_w[2] then 2
                    else 3 end;
      -- Guard against float edge landing on an empty group.
      if v_n[v_grp] = 0 then
        v_grp := case when v_n[3] > 0 then 3 when v_n[2] > 0 then 2 else 1 end;
      end if;
    elsif v_n[4] > 0 then
      v_grp := 4;
    else
      return;  -- no cards at all
    end if;

    -- Avoid repeating the item just answered when the group has others.
    select a.card_id, a.label_no into v_last_card, v_last_label
    from public.id_answers a
    where a.user_id = auth.uid() order by a.answered_at desc limit 1;

    select g.card_id, g.label_no into v_pick_card, v_pick_label
    from public.id_item_groups() g
    where g.grp = v_grp
    order by (g.card_id is not distinct from v_last_card
              and g.label_no is not distinct from v_last_label),
             random()
    limit 1;
  end if;

  if v_pick_card is null then
    return;
  end if;

  insert into public.id_pending (user_id, card_id, label_no)
  values (auth.uid(), v_pick_card, v_pick_label)
  on conflict (user_id) do update
    set card_id = excluded.card_id, label_no = excluded.label_no, served_at = now();

  return query select v_pick_card, v_pick_label;
end;
$$;

-- Grade the caller's pending question, count it against today's quota and
-- return that label's key.
create or replace function public.answer_id_label(p_answer text)
returns table (card_id uuid, label_no integer, answer text, given text,
               is_correct boolean, daily_limit integer, used integer)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_pending public.id_pending;
  v_label   public.id_card_labels;
  v_limit   integer := public.id_daily_limit();
  v_today   date := (now() at time zone 'Asia/Bangkok')::date;
  v_used    integer;
  v_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- Row lock serialises two tabs answering at once.
  select p.* into v_pending from public.id_pending p
  where p.user_id = auth.uid() for update;
  if v_pending.user_id is null then
    raise exception 'no pending question' using errcode = 'P0002';
  end if;

  select l.* into v_label from public.id_card_labels l
  where l.card_id = v_pending.card_id and l.label_no = v_pending.label_no;

  select count(*) into v_used from public.id_answers a
  where a.user_id = auth.uid() and a.answered_on = v_today;
  if v_limit is not null and v_used >= v_limit then
    raise exception 'daily limit reached' using errcode = 'P0001';
  end if;

  v_correct := public.normalize_answer(p_answer) <> ''
    and exists (
      select 1 from unnest(array[v_label.answer] || v_label.synonyms) k(key)
      where public.normalize_answer(k.key) = public.normalize_answer(p_answer)
         or public.answer_distance(k.key, p_answer)
            <= public.fuzzy_tolerance(public.normalize_answer(k.key)));

  insert into public.id_answers (user_id, card_id, label_no, given, is_correct, answered_on)
  values (auth.uid(), v_label.card_id, v_label.label_no, coalesce(p_answer, ''),
          v_correct, v_today);
  delete from public.id_pending p where p.user_id = auth.uid();

  return query select v_label.card_id, v_label.label_no, v_label.answer,
                      coalesce(p_answer, ''), v_correct, v_limit, v_used + 1;
end;
$$;

revoke execute on function public.id_daily_limit() from public, anon;
revoke execute on function public.id_quota() from public, anon;
revoke execute on function public.id_item_groups() from public, anon, authenticated;
revoke execute on function public.next_id_question(uuid) from public, anon;
revoke execute on function public.answer_id_label(text) from public, anon;
grant execute on function public.id_daily_limit() to authenticated;
grant execute on function public.id_quota() to authenticated;
grant execute on function public.next_id_question(uuid) to authenticated;
grant execute on function public.answer_id_label(text) to authenticated;
