-- Open "Identify typing" to students, with a daily quota.
--
-- 1 answered label = 1 question. Quota per Asia/Bangkok day:
--   5  by default
--   10 once the student has completed every published video
--      (published video in a published course)
--   unlimited for staff
-- Students see only published cards. Answers (id_card_labels.answer /
-- synonyms) are never readable by students: they get label numbers through
-- id_card_label_nos() and grade through answer_id_label(), both security
-- definer. answer_id_label() is the only writer of id_answers, so the quota
-- can't be bypassed from the client.

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

-- Label numbers of a card the caller may see (no answers).
create or replace function public.id_card_label_nos(p_card_id uuid)
returns setof integer
language sql
stable
security definer
set search_path = public
as $$
  select l.label_no
  from public.id_card_labels l
  join public.id_cards c on c.id = l.card_id
  where l.card_id = p_card_id
    and (c.is_published or public.is_staff())
  order by l.label_no;
$$;

-- Grade one label, count it against today's quota, return that label's key.
create or replace function public.answer_id_label(
  p_card_id uuid, p_label_no integer, p_answer text)
returns table (label_no integer, answer text, given text, is_correct boolean,
               daily_limit integer, used integer)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_label   public.id_card_labels;
  v_limit   integer := public.id_daily_limit();
  v_today   date := (now() at time zone 'Asia/Bangkok')::date;
  v_used    integer;
  v_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select l.* into v_label
  from public.id_card_labels l
  join public.id_cards c on c.id = l.card_id
  where l.card_id = p_card_id and l.label_no = p_label_no
    and (c.is_published or public.is_staff());
  if v_label.id is null then
    raise exception 'label not found' using errcode = 'P0002';
  end if;

  -- Serialise per user so two tabs can't both take the last slot.
  perform pg_advisory_xact_lock(hashtext('id_answers:' || auth.uid()::text));
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
  values (auth.uid(), p_card_id, p_label_no, coalesce(p_answer, ''), v_correct, v_today);

  return query select v_label.label_no, v_label.answer, coalesce(p_answer, ''),
                      v_correct, v_limit, v_used + 1;
end;
$$;

revoke execute on function public.id_daily_limit() from public, anon;
revoke execute on function public.id_quota() from public, anon;
revoke execute on function public.id_card_label_nos(uuid) from public, anon;
revoke execute on function public.answer_id_label(uuid, integer, text) from public, anon;
grant execute on function public.id_daily_limit() to authenticated;
grant execute on function public.id_quota() to authenticated;
grant execute on function public.id_card_label_nos(uuid) to authenticated;
grant execute on function public.answer_id_label(uuid, integer, text) to authenticated;
