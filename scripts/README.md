# Scripts Directory

Management, data ingestion, and batch curation scripts for the KawaiiMedicine platform.

## Overview

| Script | Runtime | Category | Status | Description |
|---|---|---|---|---|
| [`disable_all_identify_cards.ts`](./disable_all_identify_cards.ts) | `npx tsx` | Operations | **Active** | Bulk unpublishes all Identify cards and labels |
| [`publish_organ_system.ts`](./publish_organ_system.ts) | `npx tsx` | Operations | **Active** | Bulk publishes/unpublishes cards by organ system |
| [`curate_identify_answers.py`](./curate_identify_answers.py) | `python3` | Curation | Completed | Enriches medical synonyms & cleans caption text |
| [`update_identify_labels_db.ts`](./update_identify_labels_db.ts) | `npx tsx` | Curation | Completed | Syncs curated synonyms from `cards.json` to Supabase |
| [`exclude_nonspecific_gi_labels.ts`](./exclude_nonspecific_gi_labels.ts) | `npx tsx` | Curation | Completed | Unpublishes generic subcellular labels (Nucleus, etc.) |
| [`extract_netter_histology.py`](./extract_netter_histology.py) | `python3` | Ingestion | Completed | Extracts 223 Netter cards & builds `cards.json` |
| [`import_netter_histology.ts`](./import_netter_histology.ts) | `npx tsx` | Ingestion | Completed | Uploads Netter images to Storage & seeds tables |
| [`prepare_exam14_images.py`](./prepare_exam14_images.py) | `python3` | Exam Migration | Completed | Crops high-res figures for Exam 14 from PDF |
| [`populate_exam14_questions.ts`](./populate_exam14_questions.ts) | `npx tsx` | Exam Migration | Completed | Seeds Exam 14 questions and uploads images to Storage |
| [`update_exam14_questions.ts`](./update_exam14_questions.ts) | `npx tsx` | Exam Migration | Completed | Updates Exam 14 questions with refined histology keys |

---

## 1. Active Operational CLI Tools

### `disable_all_identify_cards.ts`
Deactivates all active cards and question labels in Supabase (`id_cards` and `id_card_labels` set to `is_published = false`). Used to close down Identify study rounds safely without deleting learner progress history.

```bash
# Preview changes without modifying database
npx tsx scripts/disable_all_identify_cards.ts --dry-run

# Execute batch deactivation
npx tsx scripts/disable_all_identify_cards.ts
```

### `publish_organ_system.ts`
Batch manages card publication state filtered by organ system. Handles PostgREST 1,000-row pagination bounds and executes in slices of 100.

```bash
# Publish Gastrointestinal (system ID 3) exclusively (closing all others)
npx tsx scripts/publish_organ_system.ts --system 3 --exclusive

# Dry run with slug
npx tsx scripts/publish_organ_system.ts --slug gastrointestinal --exclusive --dry-run
```

---

## 2. Identify Bank Ingestion & Curation

### `curate_identify_answers.py`
Enriches `data/identify/cards.json` with clinical acronyms (RER, SER, RBC, WBC), eponyms (Peyer, Bowman, Kupffer), singular/plural variants, and strips parentheses/captions while pruning intra-card collisions.

```bash
python3 scripts/curate_identify_answers.py
```

### `update_identify_labels_db.ts`
Pushes curated answer keys and medical synonyms from `data/identify/cards.json` directly into Supabase `id_card_labels`.

```bash
npx tsx scripts/update_identify_labels_db.ts --dry-run
npx tsx scripts/update_identify_labels_db.ts
```

### `exclude_nonspecific_gi_labels.ts`
Unpublishes generic organelles (Nucleus, Mitochondria, RER, Golgi) and non-structural tags from GI cards to ensure questions test pathognomonic, organ-specific structures.

```bash
npx tsx scripts/exclude_nonspecific_gi_labels.ts --dry-run
npx tsx scripts/exclude_nonspecific_gi_labels.ts
```

### `extract_netter_histology.py` & `import_netter_histology.ts`
Extracts all 223 flashcards from the Netter Histology PDF and imports cards, images, and labels into Supabase.

```bash
python3 scripts/extract_netter_histology.py
npx tsx scripts/import_netter_histology.ts --chapter 1 --dry-run
npx tsx scripts/import_netter_histology.ts --all
```

---

## 3. Exam 14 Data Population

Historical migration scripts used during the construction of EXAM-14 (Skeletal System):
- `prepare_exam14_images.py`: Crops 250 DPI figures from Netter PDF.
- `populate_exam14_questions.ts`: Uploads images to `question-images` bucket and inserts questions.
- `update_exam14_questions.ts`: Replaces specific questions with updated keys.
