/**
 * KawaiiMedicine — Disable / Off All Cards in Identify
 *
 * Sets `is_published = false` across ALL cards (`id_cards`) and
 * all question labels (`id_card_labels`) in the database.
 *
 * Usage:
 *   npx tsx scripts/disable_all_identify_cards.ts --dry-run
 *   npx tsx scripts/disable_all_identify_cards.ts
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
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

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

async function getAllPublishedLabels() {
  const all: { id: string; card_id: string; is_published: boolean }[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("id_card_labels")
      .select("id, card_id, is_published")
      .eq("is_published", true)
      .range(from, from + batchSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("==================================================");
  console.log("🫀 KawaiiMedicine — Disable All Identify Cards");
  console.log(
    `Mode: ${isDryRun ? "🔍 DRY-RUN (no changes will be written)" : "🚀 LIVE EXECUTION"}`,
  );
  console.log("==================================================\n");

  // 1. Query all currently published cards
  const { data: publishedCards, error: cardErr } = await supabase
    .from("id_cards")
    .select("id, title, is_published")
    .eq("is_published", true);

  if (cardErr) {
    console.error("❌ Failed to query published id_cards:", cardErr.message);
    process.exit(1);
  }

  // 2. Query all currently published labels
  const publishedLabels = await getAllPublishedLabels();

  console.log(`Current Published Inventory:`);
  console.log(`• Published Cards: ${publishedCards?.length ?? 0}`);
  console.log(`• Published Labels: ${publishedLabels.length}\n`);

  if (!publishedCards || (publishedCards.length === 0 && publishedLabels.length === 0)) {
    console.log("ℹ️ All cards and labels are already closed/unpublished (0 active).");
    return;
  }

  if (isDryRun) {
    console.log("📋 Cards that will be turned off:");
    publishedCards.forEach((c) => console.log(`  - [CARD] ${c.title} (${c.id})`));
    console.log(`\n🔍 DRY-RUN complete. No changes made.`);
    return;
  }

  console.log("🚀 Turning off all cards and labels...");

  // Update cards to is_published = false
  if (publishedCards.length > 0) {
    const cardIds = publishedCards.map((c) => c.id);
    await chunkedUpdate("id_cards", cardIds, false);
    console.log(`✅ Updated ${cardIds.length} cards to is_published = false.`);
  }

  // Update labels to is_published = false
  if (publishedLabels.length > 0) {
    const labelIds = publishedLabels.map((l) => l.id);
    await chunkedUpdate("id_card_labels", labelIds, false);
    console.log(`✅ Updated ${labelIds.length} labels to is_published = false.`);
  }

  // Post-execution verification
  const { count: remainingCards } = await supabase
    .from("id_cards")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);

  const { count: remainingLabels } = await supabase
    .from("id_card_labels")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);

  console.log("\n==================================================");
  console.log("🏁 Post-execution Verification:");
  console.log(`• Active Published Cards in DB: ${remainingCards ?? 0} (expected: 0)`);
  console.log(`• Active Published Labels in DB: ${remainingLabels ?? 0} (expected: 0)`);
  console.log("==================================================");

  if (remainingCards === 0 && remainingLabels === 0) {
    console.log("\n🎉 All cards in Identify have been successfully turned off!");
  } else {
    console.warn("\n⚠️ Warning: Some cards or labels still appear published.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
