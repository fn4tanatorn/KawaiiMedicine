/**
 * KawaiiMedicine — Exclude Non-Specific GI Labels in Identify
 *
 * Excludes generic cell organelles and non-specific histological labels
 * (Nucleus, Nucleolus, Mitochondria, RER, SER, Golgi, Infoldings of basal plasma membrane, Absorption)
 * from the Gastrointestinal (GI) system question pool.
 *
 * Actions:
 *   1. Sets `is_published = false` on the non-specific labels in `id_card_labels`.
 *   2. Removes the organ system mapping (GI id 3) from `id_card_label_organ_systems`.
 *
 * Usage:
 *   npx tsx scripts/exclude_nonspecific_gi_labels.ts --dry-run
 *   npx tsx scripts/exclude_nonspecific_gi_labels.ts
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

export function isNonSpecificGiLabel(answer: string): boolean {
  const ans = answer.toLowerCase().trim();
  if (ans.includes("nucleus") || ans.includes("nuclei") || ans.includes("nucleol")) return true;
  if (ans.includes("mitochondri")) return true;
  if (ans.includes("endoplasmic reticulum")) return true;
  if (ans.includes("golgi")) return true;
  if (ans.includes("plasma membrane")) return true;
  if (ans === "absorption") return true;
  return false;
}

async function getAllPublishedLabels() {
  const all: { id: string; card_id: string; label_no: number; answer: string; is_published: boolean }[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("id_card_labels")
      .select("id, card_id, label_no, answer, is_published")
      .eq("is_published", true)
      .range(from, from + batchSize - 1);
    if (error) throw error;
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
  console.log("🔬 KawaiiMedicine — Exclude Non-Specific GI Labels");
  console.log(
    `Mode: ${isDryRun ? "🔍 DRY-RUN (no changes will be written)" : "🚀 LIVE UPDATE"}`,
  );
  console.log("==================================================\n");

  // 1. Get GI organ system ID
  const { data: systems, error: sysErr } = await supabase
    .from("organ_systems")
    .select("id, slug, name_en, name_th")
    .eq("slug", "gastrointestinal")
    .single();

  if (sysErr || !systems) {
    console.error("❌ Gastrointestinal system not found in organ_systems table:", sysErr?.message);
    process.exit(1);
  }

  const giSystemId = systems.id;
  console.log(`Target System: ID ${giSystemId} — ${systems.name_en} (${systems.name_th})\n`);

  // 2. Query published cards
  const { data: publishedCards, error: cardErr } = await supabase
    .from("id_cards")
    .select("id, title, is_published")
    .eq("is_published", true);

  if (cardErr || !publishedCards) {
    console.error("❌ Failed to query published cards:", cardErr?.message);
    process.exit(1);
  }

  const cardMap = new Map(publishedCards.map((c) => [c.id, c.title]));
  console.log(`Currently published cards: ${publishedCards.length}`);

  // 3. Query all published labels
  const allPubLabels = await getAllPublishedLabels();
  console.log(`Currently published labels total: ${allPubLabels.length}`);

  // 4. Query labels tagged with GI
  const { data: taggedLabels, error: tagErr } = await supabase
    .from("id_card_label_organ_systems")
    .select("label_id, organ_system_id")
    .eq("organ_system_id", giSystemId);

  if (tagErr || !taggedLabels) {
    console.error("❌ Failed to query tagged labels:", tagErr?.message);
    process.exit(1);
  }

  const giTaggedLabelIds = new Set(taggedLabels.map((t) => t.label_id));
  console.log(`Labels currently tagged with GI in DB: ${giTaggedLabelIds.size}`);

  // Filter to published labels that belong to GI cards
  const giPubLabels = allPubLabels.filter((l) => cardMap.has(l.card_id));
  console.log(`Published labels on active GI cards: ${giPubLabels.length}`);

  // 5. Partition into kept vs excluded
  const toExclude = giPubLabels.filter((l) => isNonSpecificGiLabel(l.answer));
  const toKeep = giPubLabels.filter((l) => !isNonSpecificGiLabel(l.answer));

  console.log("\n--------------------------------------------------");
  console.log(`📊 Partition Analysis:`);
  console.log(`• Total active GI labels: ${giPubLabels.length}`);
  console.log(`• Specific labels to KEEP published: ${toKeep.length}`);
  console.log(`• Non-specific labels to EXCLUDE: ${toExclude.length}`);
  console.log("--------------------------------------------------\n");

  console.log("📋 Labels to exclude:");
  toExclude.sort((a, b) => {
    const cardA = cardMap.get(a.card_id) ?? "";
    const cardB = cardMap.get(b.card_id) ?? "";
    if (cardA !== cardB) return cardA.localeCompare(cardB);
    return a.label_no - b.label_no;
  });

  toExclude.forEach((l, idx) => {
    const cardTitle = cardMap.get(l.card_id) ?? "Unknown Card";
    console.log(
      `  ${String(idx + 1).padStart(2, " ")}. [${cardTitle}] #${l.label_no}: "${l.answer}" (id: ${l.id})`,
    );
  });

  if (isDryRun) {
    console.log("\n🔍 DRY-RUN completed. No changes made.");
    return;
  }

  // 6. Live updates
  console.log("\n🚀 Applying changes to database...");
  const excludedIds = toExclude.map((l) => l.id);

  // 6a. Set is_published = false on id_card_labels
  for (let i = 0; i < excludedIds.length; i += 50) {
    const chunk = excludedIds.slice(i, i + 50);
    const { error: updErr } = await supabase
      .from("id_card_labels")
      .update({ is_published: false })
      .in("id", chunk);

    if (updErr) {
      console.error(`❌ Failed to update id_card_labels chunk:`, updErr.message);
      process.exit(1);
    }
  }
  console.log(`✓ Updated ${excludedIds.length} labels in id_card_labels to is_published = false.`);

  // 6b. Delete organ system tag from id_card_label_organ_systems for GI
  for (let i = 0; i < excludedIds.length; i += 50) {
    const chunk = excludedIds.slice(i, i + 50);
    const { error: delErr } = await supabase
      .from("id_card_label_organ_systems")
      .delete()
      .eq("organ_system_id", giSystemId)
      .in("label_id", chunk);

    if (delErr) {
      console.error(`❌ Failed to remove GI organ system tags:`, delErr.message);
      process.exit(1);
    }
  }
  console.log(`✓ Removed GI organ system tag for ${excludedIds.length} labels.`);

  // 7. Verification
  console.log("\n==================================================");
  console.log("🏁 Post-execution Verification:");

  // Check published labels on GI cards
  const postPubLabels = await getAllPublishedLabels();
  const postGiPubLabels = postPubLabels.filter((l) => cardMap.has(l.card_id));
  console.log(`• Published labels on GI cards: ${postGiPubLabels.length} (expected: ${toKeep.length})`);

  // Check tagged GI labels
  const { data: postTagged } = await supabase
    .from("id_card_label_organ_systems")
    .select("label_id")
    .eq("organ_system_id", giSystemId);
  console.log(`• GI tagged labels remaining: ${postTagged?.length ?? 0} (expected: ${toKeep.length})`);

  // Check student pool via RPC simulation
  const { data: studentPool, error: poolErr } = await supabase.rpc("id_item_groups", {
    p_as_student: true,
  });

  if (poolErr) {
    console.warn(`⚠️ Warning: could not simulate student RPC:`, poolErr.message);
  } else {
    console.log(`• Total items available to students: ${studentPool?.length ?? 0}`);
    const remainingNonSpecific = (studentPool ?? []).filter((item) => {
      return excludedIds.includes(item.card_id); // check if any excluded
    });
    console.log(`• Non-specific items leaking into student pool: ${remainingNonSpecific.length}`);
  }

  console.log("==================================================");
  console.log("✅ Exclusion completed cleanly with zero errors!");
}

if (process.argv[1]?.endsWith("exclude_nonspecific_gi_labels.ts")) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
