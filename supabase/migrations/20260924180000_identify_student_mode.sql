-- Identify "student mode" for staff: p_as_student makes staff get exactly
-- what a student gets — only published cards and labels, and the student
-- daily limit — so admins can check what they have opened. It is ignored for
-- students (they are never treated as staff anyway).
--
-- Signatures change, so the old functions are dropped first (an added
-- defaulted parameter would otherwise create an ambiguous overload).

drop function public.next_id_question(uuid);
drop function public.id_item_groups();
drop function public.id_quota();
-- answer_id_label() still calls id_daily_limit() with no argument; the new
-- default keeps that call valid.
drop function public.id_daily_limit();

create or replace function public.id_daily_limit(p_as_student boolean default false)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_staff() and not p_as_student then null
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

create or replace function public.id_quota(p_as_student boolean default false)
returns table (daily_limit integer, used integer)
language sql
stable
security definer
set search_path = public
as $$
  select public.id_daily_limit(p_as_student),
         (select count(*)::integer from public.id_answers a
          where a.user_id = auth.uid()
            and a.answered_on = (now() at time zone 'Asia/Bangkok')::date);
$$;

create or replace function public.id_item_groups(p_as_student boolean default false)
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
  where (c.is_published and l.is_published) or (public.is_staff() and not p_as_student)
  group by l.card_id, l.label_no;
$$;

create or replace function public.next_id_question(
  p_card_id uuid default null,
  p_as_student boolean default false)
returns table (card_id uuid, label_no integer)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_limit   integer := public.id_daily_limit(p_as_student);
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
  join public.id_card_labels l on l.card_id = p.card_id and l.label_no = p.label_no
  where p.user_id = auth.uid()
    and ((c.is_published and l.is_published)
         or (public.is_staff() and not p_as_student));
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
                 from public.id_item_groups(p_as_student) g group by g.grp loop
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
    from public.id_item_groups(p_as_student) g
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

revoke execute on function public.id_daily_limit(boolean) from public, anon;
revoke execute on function public.id_quota(boolean) from public, anon;
revoke execute on function public.id_item_groups(boolean) from public, anon, authenticated;
revoke execute on function public.next_id_question(uuid, boolean) from public, anon;
grant execute on function public.id_daily_limit(boolean) to authenticated;
grant execute on function public.id_quota(boolean) to authenticated;
grant execute on function public.next_id_question(uuid, boolean) to authenticated;
