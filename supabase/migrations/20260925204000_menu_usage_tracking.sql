-- Menu usage tracking to evaluate feature engagement and plan menu lifecycle.

create table public.menu_click_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  menu_key text not null,
  path text not null,
  source text not null default 'nav',
  created_at timestamptz not null default now()
);

-- Fast lookup indexes
create index menu_click_events_user_id_idx on public.menu_click_events (user_id);
create index menu_click_events_menu_key_idx on public.menu_click_events (menu_key);
create index menu_click_events_created_at_idx on public.menu_click_events (created_at desc);
create index menu_click_events_key_created_idx on public.menu_click_events (menu_key, created_at desc);

-- RLS
alter table public.menu_click_events enable row level security;
grant select, insert on public.menu_click_events to authenticated;

-- Students and staff can insert their own click events
create policy "menu_click_events: insert own"
  on public.menu_click_events for insert to authenticated
  with check (user_id = auth.uid());

-- Only staff can read analytics events
create policy "menu_click_events: staff read all"
  on public.menu_click_events for select to authenticated
  using (public.is_staff());

-- Aggregate analytics helper for staff
create or replace function public.get_menu_usage_stats(p_days integer default 30)
returns table (
  menu_key text,
  total_clicks bigint,
  student_clicks bigint,
  unique_students bigint,
  last_clicked_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  return query
  select
    e.menu_key,
    count(*)::bigint as total_clicks,
    count(*) filter (where p.role = 'student')::bigint as student_clicks,
    count(distinct e.user_id) filter (where p.role = 'student')::bigint as unique_students,
    max(e.created_at) as last_clicked_at
  from public.menu_click_events e
  join public.profiles p on p.id = e.user_id
  where (p_days is null or e.created_at >= (now() - (p_days || ' days')::interval))
  group by e.menu_key
  order by student_clicks desc;
end;
$$;

grant execute on function public.get_menu_usage_stats(integer) to authenticated;

-- Daily trends helper for staff
create or replace function public.get_menu_daily_trends(p_days integer default 14)
returns table (
  click_date date,
  menu_key text,
  student_clicks bigint,
  unique_students bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  return query
  select
    (e.created_at at time zone 'Asia/Bangkok')::date as click_date,
    e.menu_key,
    count(*) filter (where p.role = 'student')::bigint as student_clicks,
    count(distinct e.user_id) filter (where p.role = 'student')::bigint as unique_students
  from public.menu_click_events e
  join public.profiles p on p.id = e.user_id
  where (p_days is null or e.created_at >= (now() - (p_days || ' days')::interval))
  group by 1, 2
  order by click_date desc, student_clicks desc;
end;
$$;

grant execute on function public.get_menu_daily_trends(integer) to authenticated;
