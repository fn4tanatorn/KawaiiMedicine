-- Lounge / Anonymous Encouragement Board ("มุมพักใจ")
-- Semi-private community board for students to share how they are feeling,
-- post thoughts (anonymously or with their name), and give lightweight reactions.

create table public.lounge_posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  content      text not null check (btrim(content) <> '' and length(content) <= 1000),
  mood         text check (mood is null or mood in ('battery_full', 'battery_low', 'coffee', 'need_rest', 'fire')),
  is_anonymous boolean not null default true,
  alias        text not null default 'นักศึกษาแพทย์ท่านหนึ่ง',
  created_at   timestamptz not null default now()
);

create index lounge_posts_created_at_idx on public.lounge_posts (created_at desc);
create index lounge_posts_user_id_idx on public.lounge_posts (user_id);

alter table public.lounge_posts enable row level security;

-- Raw table is private to the author or staff; other students read via lounge_feed
-- to guarantee anonymity and zero ID leakage.
create policy "lounge_posts: select own or staff"
  on public.lounge_posts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "lounge_posts: insert own"
  on public.lounge_posts for insert to authenticated
  with check (user_id = auth.uid());

create policy "lounge_posts: delete own or staff"
  on public.lounge_posts for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------------------
-- Reactions
-- ---------------------------------------------------------------------------
create table public.lounge_reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.lounge_posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null check (emoji in ('🤍', '🫂', '☕', '💪')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index lounge_reactions_post_id_idx on public.lounge_reactions (post_id);

alter table public.lounge_reactions enable row level security;

create policy "lounge_reactions: select own or staff"
  on public.lounge_reactions for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "lounge_reactions: insert own"
  on public.lounge_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "lounge_reactions: delete own"
  on public.lounge_reactions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Table grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.lounge_posts to authenticated;
grant select, insert, update, delete on public.lounge_reactions to authenticated;

-- ---------------------------------------------------------------------------
-- Safe Views (security_invoker = false)
-- ---------------------------------------------------------------------------

-- Feed view: hides user_id if anonymous unless the caller is the author or staff.
create or replace view public.lounge_feed
with (security_invoker = false)
as
  select
    p.id,
    p.content,
    p.mood,
    p.is_anonymous,
    case
      when not p.is_anonymous then coalesce(nullif(prof.full_name, ''), 'นักศึกษาแพทย์')
      else p.alias
    end as author_name,
    case
      when not p.is_anonymous or p.user_id = auth.uid() or public.is_staff() then p.user_id
      else null
    end as user_id,
    (p.user_id = auth.uid()) as is_mine,
    p.created_at
  from public.lounge_posts p
  left join public.profiles prof on prof.id = p.user_id
  order by p.created_at desc;

grant select on public.lounge_feed to authenticated;

-- Aggregated reactions view
create or replace view public.lounge_post_reactions
with (security_invoker = false)
as
  select
    r.post_id,
    r.emoji,
    count(*)::integer as count,
    bool_or(r.user_id = auth.uid()) as has_reacted
  from public.lounge_reactions r
  group by r.post_id, r.emoji;

grant select on public.lounge_post_reactions to authenticated;

-- ---------------------------------------------------------------------------
-- Reaction toggle RPC
-- ---------------------------------------------------------------------------
create or replace function public.toggle_lounge_reaction(p_post_id uuid, p_emoji text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_emoji not in ('🤍', '🫂', '☕', '💪') then
    raise exception 'Invalid emoji';
  end if;

  select exists (
    select 1 from public.lounge_reactions
    where post_id = p_post_id and user_id = v_user_id and emoji = p_emoji
  ) into v_exists;

  if v_exists then
    delete from public.lounge_reactions
    where post_id = p_post_id and user_id = v_user_id and emoji = p_emoji;
    return false;
  else
    insert into public.lounge_reactions (post_id, user_id, emoji)
    values (p_post_id, v_user_id, p_emoji);
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_lounge_reaction(uuid, text) to authenticated;
