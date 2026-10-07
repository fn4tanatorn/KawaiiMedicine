/**
 * scripts/update_identify_labels_db.ts
 *
 * Updates Supabase `id_card_labels` table with the curated primary answers
 * and enriched synonyms from `data/identify/cards.json` and explicit cleanups.
 *
 * Usage:
 *   npx tsx scripts/update_identify_labels_db.ts --dry-run
 *   npx tsx scripts/update_identify_labels_db.ts
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

interface CardData {
  title: string;
  labels: {
    label_no: number;
    answer: string;
    synonyms: string[];
  }[];
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log("==================================================");
  console.log("🫀 KawaiiMedicine — Update Identify Labels in DB");
  console.log(`Mode: ${isDryRun ? "🔍 DRY-RUN" : "🚀 LIVE UPDATE"}`);
  console.log("==================================================\n");

  const cardsFile = path.resolve(process.cwd(), "data/identify/cards.json");
  const cards: CardData[] = JSON.parse(fs.readFileSync(cardsFile, "utf-8"));

  // 1. Fetch all DB cards
  const { data: dbCards, error: cErr } = await supabase
    .from("id_cards")
    .select("id, title");

  if (cErr || !dbCards) {
    console.error("Failed to query id_cards:", cErr?.message);
    process.exit(1);
  }

  const titleToCardId = new Map<string, string>();
  for (const c of dbCards) {
    titleToCardId.set(c.title.toLowerCase().trim(), c.id);
  }
  // Title alias for Chondrocyte -> Chondrocyte (EM)
  if (titleToCardId.has("chondrocyte (em)")) {
    titleToCardId.set("chondrocyte", titleToCardId.get("chondrocyte (em)")!);
  }

  // 2. Fetch all DB labels
  type DbLabel = {
    id: string;
    card_id: string;
    label_no: number;
    answer: string;
    synonyms: string[] | null;
  };
  const dbLabels: DbLabel[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("id_card_labels")
      .select("id, card_id, label_no, answer, synonyms")
      .range(from, from + batchSize - 1);
    if (error) {
      console.error(error);
      break;
    }
    if (!data || data.length === 0) break;
    dbLabels.push(...(data as DbLabel[]));
    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Loaded ${dbCards.length} DB cards, ${dbLabels.length} DB labels.`);

  // Build lookup (card_id:label_no) -> dbLabel
  const dbLabelMap = new Map<string, DbLabel>();
  for (const l of dbLabels) {
    dbLabelMap.set(`${l.card_id}:${l.label_no}`, l);
  }

  // 3. Collect pending updates
  const updates: { id: string; answer: string; synonyms: string[]; reason: string }[] = [];

  for (const card of cards) {
    const cardId = titleToCardId.get(card.title.toLowerCase().trim());
    if (!cardId) {
      console.warn(`Card not found in DB: "${card.title}"`);
      continue;
    }

    for (const l of card.labels) {
      const dbL = dbLabelMap.get(`${cardId}:${l.label_no}`);
      if (!dbL) continue;

      const answerChanged = dbL.answer !== l.answer;
      const currentSyns = Array.isArray(dbL.synonyms) ? dbL.synonyms : [];
      const newSyns = l.synonyms || [];
      const synsChanged =
        currentSyns.length !== newSyns.length ||
        JSON.stringify(currentSyns.sort()) !== JSON.stringify([...newSyns].sort());

      if (answerChanged || synsChanged) {
        updates.push({
          id: dbL.id,
          answer: l.answer,
          synonyms: newSyns,
          reason: answerChanged ? `Ans: "${dbL.answer}" -> "${l.answer}"` : "Syns updated",
        });
      }
    }
  }

  // Also check non-Netter extra cards: Skull, Endochondral ossification, Bone
  const extraCleanups: Record<string, { answer: string; synonyms: string[] }> = {
    // Skull #2
    "b3162e2b-e2ad-49f8-b166-ab4de972d6b6": {
      answer: "Supraorbital notch",
      synonyms: ["Supraorbital foramen", "Supraorbital notch (foramen)"],
    },
    // Bone #5
    "74337dc5-1232-485f-a805-2147128e9b5b": {
      answer: "Woven bone",
      synonyms: ["Immature bone", "Woven bone trabecula", "Woven bone (trabecula)"],
    },
    // Bone #6
    "50b025be-c404-4b2a-9516-06def3ae906b": {
      answer: "Lamellar bone",
      synonyms: ["Mature bone", "Lamellar bone trabecula", "Lamellar bone (trabecula)"],
    },
    // Bone #7
    "90e3b1a5-f16e-4ddf-9c52-2c74814ed10d": {
      answer: "Adipocyte",
      synonyms: ["Adipocytes", "Fat cell", "Fat cells"],
    },
  };

  for (const [id, clean] of Object.entries(extraCleanups)) {
    const dbL = dbLabels.find((l) => l.id === id);
    if (dbL && (dbL.answer !== clean.answer || JSON.stringify(dbL.synonyms) !== JSON.stringify(clean.synonyms))) {
      updates.push({
        id,
        answer: clean.answer,
        synonyms: clean.synonyms,
        reason: `Extra cleanup: "${dbL.answer}" -> "${clean.answer}"`,
      });
    }
  }

  console.log(`Total labels needing update: ${updates.length}`);
  console.log("\nSample updates (first 10):");
  for (const u of updates.slice(0, 10)) {
    console.log(`- [${u.id}] ${u.reason} | Syns: ${JSON.stringify(u.synonyms)}`);
  }

  if (isDryRun) {
    console.log("\n[DRY-RUN] No changes were written to the database.");
    return;
  }

  // Execute live updates
  console.log("\n🚀 Applying live updates in batches of 50...");
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    for (const u of chunk) {
      const { error } = await supabase
        .from("id_card_labels")
        .update({
          answer: u.answer,
          synonyms: u.synonyms,
        })
        .eq("id", u.id);

      if (error) {
        console.error(`❌ Failed to update label ${u.id}:`, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }
    process.stdout.write(`\rProgress: ${Math.min(i + 50, updates.length)} / ${updates.length}`);
  }

  console.log("\n\n==================================================");
  console.log("🏁 Live Update Complete!");
  console.log(`• Successfully updated: ${successCount} labels`);
  console.log(`• Failures: ${failCount}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
