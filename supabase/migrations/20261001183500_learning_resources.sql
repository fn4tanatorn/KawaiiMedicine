-- Migration: 20261001183500_learning_resources.sql
-- Centralized learning resources & external reference links for student dashboard

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  category text not null default 'general',
  icon text not null default 'link',
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookup indexes
create index learning_resources_pos_idx on public.learning_resources (position, created_at);
create index learning_resources_pub_idx on public.learning_resources (is_published);

-- RLS
alter table public.learning_resources enable row level security;
grant select on public.learning_resources to authenticated;
grant insert, update, delete on public.learning_resources to authenticated;

-- Students see only published resources; staff see all
create policy "learning_resources: read published or staff"
  on public.learning_resources for select to authenticated
  using (is_published = true or public.is_staff());

-- Staff can insert, update, and delete
create policy "learning_resources: staff manage all"
  on public.learning_resources for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
