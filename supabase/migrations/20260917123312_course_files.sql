-- Downloadable course files (lecture slides as PDF).
--
-- A file belongs to one course and can be linked to any number of that
-- course's videos (a lecture split across several videos shares one slide
-- deck). public.video_files is the link table; its composite foreign keys
-- guarantee a file can only be linked to a video in the same course.
--
-- Files live in the private "course-files" bucket and are served through
-- short-lived signed URLs. Students only see a file when the file and its
-- course are both published -- the storage policy mirrors the table policy,
-- same as the videos / question-images buckets.

create table public.course_files (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  storage_path text not null unique,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  position     integer not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, course_id)
);

create index course_files_course_id_position_idx on public.course_files (course_id, position);

create trigger course_files_set_updated_at
  before update on public.course_files
  for each row execute function public.set_updated_at();

-- Target for video_files' composite FK below.
alter table public.videos add constraint videos_id_course_id_key unique (id, course_id);

create table public.video_files (
  video_id  uuid not null,
  file_id   uuid not null,
  course_id uuid not null,
  primary key (video_id, file_id),
  foreign key (video_id, course_id) references public.videos (id, course_id) on delete cascade,
  foreign key (file_id, course_id) references public.course_files (id, course_id) on delete cascade
);

create index video_files_file_id_idx on public.video_files (file_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.course_files enable row level security;
alter table public.video_files enable row level security;

grant select, insert, update, delete on public.course_files to authenticated;
grant select, insert, update, delete on public.video_files  to authenticated;

create policy "course_files: published readable"
  on public.course_files for select to authenticated
  using (
    public.is_staff()
    or (is_published and exists (
      select 1 from public.courses c where c.id = course_id and c.is_published))
  );
create policy "course_files: staff manages"
  on public.course_files for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "video_files: published readable"
  on public.video_files for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.course_files f
      join public.videos v on v.id = video_id
      join public.courses c on c.id = f.course_id
      where f.id = file_id and f.is_published and v.is_published and c.is_published
    )
  );
create policy "video_files: staff manages"
  on public.video_files for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Storage: private bucket, PDF only, 100 MB per file.
-- (The hosted project's global upload limit still applies on top of this.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-files', 'course-files', false, 104857600, array['application/pdf'])
on conflict (id) do nothing;

create policy "course-files: read own-visible files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-files'
    and (
      public.is_staff()
      or exists (
        select 1 from public.course_files f
        join public.courses c on c.id = f.course_id
        where f.storage_path = storage.objects.name
          and f.is_published and c.is_published
      )
    )
  );
create policy "course-files: staff can write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_staff());
create policy "course-files: staff can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-files' and public.is_staff());
create policy "course-files: staff can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and public.is_staff());
