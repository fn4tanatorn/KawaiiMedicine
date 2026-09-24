-- Identify: organ-system tags move from the card to each label (1 label =
-- 1 question), so admins can find the questions that match what they have
-- taught. Card-level tags were added earlier today and never used.
--
-- Also split 'musculoskeletal' into 'skeletal' and 'muscular' to match how
-- anatomy is taught. Nothing is tagged yet, so no rows need remapping.

drop table public.id_card_organ_systems;

update public.organ_systems
  set slug = 'skeletal', name_en = 'Skeletal', name_th = 'ระบบโครงกระดูก'
  where slug = 'musculoskeletal';
update public.organ_systems set position = position + 1 where position > 6;
insert into public.organ_systems (slug, name_en, name_th, position)
  values ('muscular', 'Muscular', 'ระบบกล้ามเนื้อ', 7);

create table public.id_card_label_organ_systems (
  label_id        uuid not null references public.id_card_labels (id) on delete cascade,
  organ_system_id smallint not null references public.organ_systems (id) on delete cascade,
  primary key (label_id, organ_system_id)
);
create index id_card_label_organ_systems_system_idx
  on public.id_card_label_organ_systems (organ_system_id);

-- Staff only, like id_card_labels itself (labels carry the answers).
alter table public.id_card_label_organ_systems enable row level security;
create policy "id_card_label_organ_systems: staff only"
  on public.id_card_label_organ_systems for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.id_card_label_organ_systems to authenticated;
