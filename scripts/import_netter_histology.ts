/**
 * Netter Histology Flashcards Ingestion Script for KawaiiMedicine.
 *
 * Reads `data/identify/cards.json` and `data/identify/images/`, uploads images to
 * Supabase storage (`question-images` bucket), and inserts cards, labels, and organ system tags.
 *
 * Usage:
 *   npx tsx scripts/import_netter_histology.ts --dry-run
 *   npx tsx scripts/import_netter_histology.ts --chapter 1 --dry-run
 *   npx tsx scripts/import_netter_histology.ts --chapter 1
 *   npx tsx scripts/import_netter_histology.ts --all
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

interface CardData {
  code: string;
  chapter: number;
  chapter_name: string;
  title: string;
  display_title: string;
  subject: string;
  organ_system_slug: string;
  image_filename: string;
  front_page: number;
  back_page: number;
  labels_count: number;
  labels: {
    label_no: number;
    answer: string;
    synonyms: string[];
  }[];
  comment: string;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isPublished = args.includes("--publish");
  const chapterIdx = args.indexOf("--chapter");
  const targetChapter = chapterIdx !== -1 ? Number(args[chapterIdx + 1]) : null;
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : null;

  console.log("==================================================");
  console.log("🫀 KawaiiMedicine — Netter Histology Importer");
  console.log(`Mode: ${isDryRun ? "🔍 DRY-RUN (no changes will be written)" : "🚀 LIVE INGESTION"}`);
  console.log(`Publish: ${isPublished ? "✅ auto-publish" : "🔒 draft (is_published = false)"}`);
  if (targetChapter) console.log(`Filter: Chapter ${targetChapter}`);
  if (limit) console.log(`Limit: first ${limit} cards`);
  console.log("==================================================\n");

  const cardsFile = path.resolve(process.cwd(), "data/identify/cards.json");
  if (!fs.existsSync(cardsFile)) {
    console.error(`❌ cards.json not found at ${cardsFile}. Run scripts/extract_netter_histology.py first!`);
    process.exit(1);
  }

  const allCards: CardData[] = JSON.parse(fs.readFileSync(cardsFile, "utf-8"));
  console.log(`Found ${allCards.length} cards in cards.json`);

  // 1. Fetch organ systems
  const { data: organSystems, error: osErr } = await supabase
    .from("organ_systems")
    .select("id, slug, name_en");

  if (osErr || !organSystems) {
    console.error("❌ Failed to query organ_systems:", osErr?.message);
    process.exit(1);
  }

  const slugToId = new Map(organSystems.map((s) => [s.slug, s.id]));
  console.log(`Loaded ${organSystems.length} organ systems from database.`);

  // 2. Fetch existing id_cards to prevent accidental duplicates
  const { data: existingCards, error: ecErr } = await supabase
    .from("id_cards")
    .select("id, title, image_path");

  if (ecErr) {
    console.error("❌ Failed to query existing id_cards:", ecErr.message);
    process.exit(1);
  }

  const existingTitles = new Set(
    (existingCards ?? []).map((c) => c.title.toLowerCase().trim()),
  );
  console.log(`Found ${existingCards?.length ?? 0} existing cards in database.`);

  // 3. Filter candidates
  let toProcess = allCards;
  if (targetChapter) {
    toProcess = toProcess.filter((c) => c.chapter === targetChapter);
  }
  if (limit) {
    toProcess = toProcess.slice(0, limit);
  }

  console.log(`Target cards to evaluate: ${toProcess.length}\n`);

  let skippedCount = 0;
  let importedCount = 0;
  let totalLabelsCreated = 0;

  for (const [idx, card] of toProcess.entries()) {
    const isAlreadyPresent =
      existingTitles.has(card.title.toLowerCase().trim()) ||
      existingTitles.has(card.display_title.toLowerCase().trim()) ||
      (card.code === "6-5" && [...existingTitles].some((t) => t.includes("chondrocyte")));

    if (isAlreadyPresent) {
      console.log(
        `⏭️  [${idx + 1}/${toProcess.length}] Skipping existing card: "${card.title}" (${card.code})`,
      );
      skippedCount++;
      continue;
    }

    const sysId = slugToId.get(card.organ_system_slug);
    if (!sysId) {
      console.warn(
        `⚠️ Unknown organ_system_slug "${card.organ_system_slug}" for card ${card.code}. Defaulting to general.`,
      );
    }
    const finalSysId = sysId ?? slugToId.get("general") ?? 13;

    const imgPath = path.resolve(
      process.cwd(),
      "data/identify/images",
      card.image_filename,
    );
    if (!fs.existsSync(imgPath)) {
      console.error(`❌ Image file missing: ${imgPath}`);
      continue;
    }

    if (isDryRun) {
      console.log(
        `[DRY-RUN] Would create: "${card.title}" (${card.code}) | Chapter: ${card.chapter_name} | System ID: ${finalSysId} | Labels: ${card.labels_count}`,
      );
      importedCount++;
      totalLabelsCreated += card.labels_count;
      continue;
    }

    // --- LIVE EXECUTION ---
    // 1. Upload image to Supabase Storage
    const storagePath = `identify/${crypto.randomUUID()}.jpg`;
    const imageBytes = fs.readFileSync(imgPath);

    const { error: upErr } = await supabase.storage
      .from("question-images")
      .upload(storagePath, imageBytes, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (upErr) {
      console.error(
        `❌ Storage upload error for ${card.code} (${card.title}):`,
        upErr.message,
      );
      continue;
    }

    // 2. Insert into id_cards
    const { data: newCard, error: cardErr } = await supabase
      .from("id_cards")
      .insert({
        title: card.title,
        subject: "histology",
        image_path: storagePath,
        is_published: isPublished,
      })
      .select("id")
      .single();

    if (cardErr || !newCard) {
      console.error(`❌ Insert id_cards failed for ${card.code}:`, cardErr?.message);
      // clean up uploaded image
      await supabase.storage.from("question-images").remove([storagePath]);
      continue;
    }

    // 3. Insert into id_card_labels
    const labelInserts = card.labels.map((l) => ({
      card_id: newCard.id,
      label_no: l.label_no,
      answer: l.answer,
      synonyms: l.synonyms,
      is_published: isPublished,
    }));

    const { data: newLabels, error: labelsErr } = await supabase
      .from("id_card_labels")
      .insert(labelInserts)
      .select("id");

    if (labelsErr || !newLabels) {
      console.error(`❌ Insert id_card_labels failed for ${card.code}:`, labelsErr?.message);
      await supabase.from("id_cards").delete().eq("id", newCard.id);
      await supabase.storage.from("question-images").remove([storagePath]);
      continue;
    }

    // 4. Insert into id_card_label_organ_systems
    const tagInserts = newLabels.map((l) => ({
      label_id: l.id,
      organ_system_id: finalSysId,
    }));

    const { error: tagErr } = await supabase
      .from("id_card_label_organ_systems")
      .insert(tagInserts);

    if (tagErr) {
      console.warn(
        `⚠️ Failed to tag labels for ${card.code}: ${tagErr.message} (card was created)`,
      );
    }

    importedCount++;
    totalLabelsCreated += newLabels.length;
    console.log(
      `✓ [${idx + 1}/${toProcess.length}] Imported "${card.title}" (${card.code}) — ${newLabels.length} labels`,
    );
  }

  console.log("\n==================================================");
  console.log("🏁 Summary:");
  console.log(`• Cards skipped (already in DB): ${skippedCount}`);
  console.log(`• Cards processed: ${importedCount}`);
  console.log(`• Labels created: ${totalLabelsCreated}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
