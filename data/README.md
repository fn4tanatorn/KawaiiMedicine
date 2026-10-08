# Data Directory

This directory contains reference datasets and seed manifests for the KawaiiMedicine platform.

## Contents

### 1. `data/identify/`
Master metadata for the **Identify** (`/identify`) anatomical and histological flashcard runner.
- **`cards.json`**: Complete structured JSON catalog of 226 Netter's Histology flashcards and 1,338 labeled questions, including canonical medical names, synonyms, organ system bindings, and card codes. Used by `scripts/update_identify_labels_db.ts` to sync rich synonyms into Supabase.
- **`manifest.csv`**: Tabular CSV index of all 226 flashcards (code, chapter, organ system, title, labels count, source book pages).

### 2. Ephemeral / Local Extraction Assets (Git-Ignored)
- **`data/identify/images/`**: High-resolution cropped card images extracted from the local Netter PDF. All active images are hosted securely in the Supabase Storage `question-images` bucket.
- **`data/exam14_images/`**: High-resolution cropped card images extracted from the local Netter PDF for Exam 14. Hosted securely in the Supabase Storage `question-images` bucket.
