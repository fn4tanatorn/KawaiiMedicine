/**
 * KawaiiMedicine — Organ System Identify Batch Publisher
 *
 * Usage:
 *   npx tsx scripts/publish_organ_system.ts --system 3 --exclusive --dry-run
 *   npx tsx scripts/publish_organ_system.ts --system 3 --exclusive
 *   npx tsx scripts/publish_organ_system.ts --slug gastrointestinal --exclusive
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { isNonSpecificGiLabel } from "./exclude_nonspecific_gi_labels";

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

async function getAllLabels() {
  const all: { id: string; card_id: string; is_published: boolean }[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("id_card_labels")
      .select("id, card_id, is_published")
      .range(from, from + batchSize - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

async function chunkedUpdate(
  table: "id_cards" | "id_card_labels",
  ids: string[],
  is_published: boolean,
  chunkSize = 100,
) {
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any)
      .update({ is_published })
      .in("id", chunk);
    if (error) {
      throw new Error(`Failed to update ${table} chunk ${i}: ${error.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isExclusive = args.includes("--exclusive");

  const systemIdx = args.indexOf("--system");
  let targetSystemId = systemIdx !== -1 ? Number(args[systemIdx + 1]) : null;

  const slugIdx = args.indexOf("--slug");
  const targetSlug = slugIdx !== -1 ? args[slugIdx + 1] : null;

  // 1. Query organ systems
  const { data: systems, error: sysErr } = await supabase
    .from("organ_systems")
    .select("id, slug, name_en, name_th")
    .order("position");

  if (sysErr || !systems) {
    console.error("❌ Failed to query organ systems:", sysErr?.message);
    process.exit(1);
  }

  if (targetSlug && !targetSystemId) {
    const found = systems.find((s) => s.slug === targetSlug);
    if (found) {
      targetSystemId = found.id;
    } else {
      console.error(`❌ Organ system slug not found: "${targetSlug}"`);
      process.exit(1);
    }
  }

  if (!targetSystemId) {
    console.log("Available organ systems:");
    systems.forEach((s) =>
      console.log(`  ID ${s.id}: ${s.name_en} (${s.name_th}) [${s.slug}]`),
    );
    console.error("\n❌ Please specify --system <id> or --slug <slug>");
    process.exit(1);
  }

  const currentSystem = systems.find((s) => s.id === targetSystemId);
  if (!currentSystem) {
    console.error(`❌ Organ system ID ${targetSystemId} not found.`);
    process.exit(1);
  }

  console.log("==================================================");
  console.log("🫀 KawaiiMedicine — Organ System Identify Publisher");
  console.log(
    `Target System: ID ${currentSystem.id} — ${currentSystem.name_en} (${currentSystem.name_th})`,
  );
  console.log(
    `Mode: ${isDryRun ? "🔍 DRY-RUN (no changes will be written)" : "🚀 LIVE UPDATE"}`,
  );
  console.log(
    `Exclusive: ${isExclusive ? "🔒 Yes (close all other non-matching systems)" : "🔓 No (leave others as-is)"}`,
  );
  console.log("==================================================\n");

  // 2. Query target labels
  const { data: taggedLabels, error: tagErr } = await supabase
    .from("id_card_label_organ_systems")
    .select("label_id, organ_system_id, id_card_labels(id, card_id, answer)")
    .eq("organ_system_id", targetSystemId);

  if (tagErr || !taggedLabels) {
    console.error("❌ Failed to query tagged labels:", tagErr?.message);
    process.exit(1);
  }

  // Filter out any non-specific labels (e.g. Nucleus, Mitochondria, RER, SER, Golgi, etc.)
  const specificTaggedLabels = taggedLabels.filter((t) => {
    const l = t.id_card_labels;
    const answer = Array.isArray(l) ? l[0]?.answer : l?.answer;
    return !isNonSpecificGiLabel(answer ?? "");
  });

  const targetLabelIds = new Set(specificTaggedLabels.map((t) => t.label_id));
  const targetCardIds = new Set(
    specificTaggedLabels
      .map((t) => {
        // Supabase joins can return object or array
        const l = t.id_card_labels;
        return Array.isArray(l) ? l[0]?.card_id : l?.card_id;
      })
      .filter(Boolean) as string[],
  );

  console.log(`Found in system "${currentSystem.name_en}":`);
  console.log(`• ${targetCardIds.size} unique cards`);
  console.log(`• ${targetLabelIds.size} unique specific labels\n`);

  // 3. Fetch all cards and all labels
  const { data: allCards, error: cardErr } = await supabase
    .from("id_cards")
    .select("id, title, is_published");

  if (cardErr || !allCards) {
    console.error("❌ Failed to query id_cards:", cardErr?.message);
    process.exit(1);
  }

  const allLabels = await getAllLabels();

  // Cards to open and close
  const cardsToOpen = allCards.filter((c) => targetCardIds.has(c.id));
  const cardsToClose = isExclusive
    ? allCards.filter((c) => !targetCardIds.has(c.id))
    : [];

  // Labels to open and close
  const labelsToOpen = allLabels.filter((l) => targetLabelIds.has(l.id));
  const labelsToClose = isExclusive
    ? allLabels.filter((l) => !targetLabelIds.has(l.id))
    : [];

  const cardsToOpenNeedUpdate = cardsToOpen.filter((c) => !c.is_published);
  const cardsToCloseNeedUpdate = cardsToClose.filter((c) => c.is_published);

  const labelsToOpenNeedUpdate = labelsToOpen.filter((l) => !l.is_published);
  const labelsToCloseNeedUpdate = labelsToClose.filter((l) => l.is_published);

  console.log("📊 Changes plan:");
  console.log(
    `• Cards to OPEN: ${cardsToOpen.length} total (${cardsToOpenNeedUpdate.length} currently closed)`,
  );
  console.log(
    `• Labels to OPEN: ${labelsToOpen.length} total (${labelsToOpenNeedUpdate.length} currently closed)`,
  );

  if (isExclusive) {
    console.log(
      `• Cards to CLOSE: ${cardsToClose.length} total (${cardsToCloseNeedUpdate.length} currently open)`,
    );
    console.log(
      `• Labels to CLOSE: ${labelsToClose.length} total (${labelsToCloseNeedUpdate.length} currently open)`,
    );
  }

  if (isDryRun) {
    console.log("\n🔍 DRY-RUN complete. No database changes were made.");
    return;
  }

  // --- LIVE EXECUTION ---
  console.log("\n🚀 Executing updates...");

  // 1. Open target cards
  if (cardsToOpenNeedUpdate.length > 0) {
    console.log(`Updating ${cardsToOpenNeedUpdate.length} cards to is_published = true...`);
    await chunkedUpdate(
      "id_cards",
      cardsToOpenNeedUpdate.map((c) => c.id),
      true,
    );
  }

  // 2. Open target labels
  if (labelsToOpenNeedUpdate.length > 0) {
    console.log(`Updating ${labelsToOpenNeedUpdate.length} labels to is_published = true...`);
    await chunkedUpdate(
      "id_card_labels",
      labelsToOpenNeedUpdate.map((l) => l.id),
      true,
    );
  }

  // 3. Close other cards if exclusive
  if (isExclusive && cardsToCloseNeedUpdate.length > 0) {
    console.log(`Updating ${cardsToCloseNeedUpdate.length} other cards to is_published = false...`);
    await chunkedUpdate(
      "id_cards",
      cardsToCloseNeedUpdate.map((c) => c.id),
      false,
    );
  }

  // 4. Close other labels if exclusive
  if (isExclusive && labelsToCloseNeedUpdate.length > 0) {
    console.log(`Updating ${labelsToCloseNeedUpdate.length} other labels to is_published = false...`);
    await chunkedUpdate(
      "id_card_labels",
      labelsToCloseNeedUpdate.map((l) => l.id),
      false,
    );
  }

  console.log("\n✅ All updates completed successfully!");

  // Verify DB state
  const { data: verifyCards } = await supabase
    .from("id_cards")
    .select("id, is_published");
  const verifyLabels = await getAllLabels();

  const publishedCardsCount = verifyCards?.filter((c) => c.is_published).length ?? 0;
  const publishedLabelsCount = verifyLabels.filter((l) => l.is_published).length;

  console.log("==================================================");
  console.log("🏁 Post-execution Verification:");
  console.log(`• Published cards in DB: ${publishedCardsCount} (expected: ${cardsToOpen.length})`);
  console.log(`• Published labels in DB: ${publishedLabelsCount} (expected: ${labelsToOpen.length})`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
