-- Organ-system tag per Identify answer (label). Nullable: untagged labels are allowed.
alter table public.id_card_labels
  add column organ_system text
  check (organ_system in (
    'General histology',
    'Musculoskeletal',
    'Nervous',
    'Cardiovascular',
    'Respiratory',
    'Gastrointestinal',
    'Renal',
    'Reproductive',
    'Endocrine',
    'Integumentary',
    'Hematologic & Lymphoid',
    'Special senses'
  ));

-- Tag the cards that already exist.
update public.id_card_labels set organ_system = 'Musculoskeletal'
  where card_id in (
    'ba60daff-d5d5-4736-af68-f316d28e43ed', -- Skull
    '50e3fbaa-489a-4a68-8fff-cf612af49cb0', -- Endochondral ossification
    'c115c2b5-bead-47fc-868d-5348f5b43949'  -- Bone
  );
update public.id_card_labels set organ_system = 'Cardiovascular'
  where card_id = 'c115c2b5-bead-47fc-868d-5348f5b43949' and label_no = 4;
update public.id_card_labels set organ_system = 'General histology'
  where card_id = 'c115c2b5-bead-47fc-868d-5348f5b43949' and label_no = 7;
