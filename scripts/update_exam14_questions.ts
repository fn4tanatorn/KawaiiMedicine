/**
 * Replace questions at positions 3, 4, 5, 6, and 9 (Q4-Q7 and Q10) with bone-specific
 * histology questions aligned with taught lecture content.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

const EXAM_ID = "65499f09-3348-4be7-b73b-5a8adf47076d";

interface ReplacementDef {
  position: number;
  stem: string;
  explanation: string;
  imageFilename: string;
  answers: string[];
}

const REPLACEMENTS: ReplacementDef[] = [
  {
    position: 3, // Q4
    stem: "โครงสร้างหมายเลข [2] (ช่องกึ่งกลางของ Osteon) คืออะไร",
    explanation:
      "Haversian canal (หรือ Central canal) คือท่อกลวงตรงกลางของแต่ละ Osteon เป็นทางผ่านของหลอดเลือด capillary และเส้นประสาททอดตามแนวยาวของ compact bone",
    imageFilename: "data/exam14_images/q04_compact_bone_haversian_canal.png",
    answers: [
      "Haversian canal",
      "Central canal",
      "Capillary in Haversian canal",
      "Osteonic canal",
    ],
  },
  {
    position: 4, // Q5
    stem: "เยื่อหุ้มกระดูกหมายเลข [1] คืออะไร",
    explanation:
      "Periosteum (เยื่อหุ้มกระดูก) คือเนื้อเยื่อเกี่ยวพันหนาแน่นที่หุ้มผิวนอกของกระดูก ประกอบด้วย outer fibrous layer และ inner osteogenic layer",
    imageFilename: "data/exam14_images/q05_compact_bone_periosteum.png",
    answers: ["Periosteum", "Periosteal membrane"],
  },
  {
    position: 5, // Q6
    stem: "เซลล์หมายเลข [2] ที่ฝังตัวอยู่ในเนื้อกระดูกคืออะไร",
    explanation:
      "Osteocyte คือเซลล์กระดูกที่พัฒนามาจาก osteoblast แล้วถูกกักขังอยู่ภายใน lacuna ของเนื้อกระดูก ทำหน้าที่ดูแลรักษา matrix และรับรู้แรงกล (mechanosensation)",
    imageFilename: "data/exam14_images/q06_spongy_bone_osteocyte.png",
    answers: ["Osteocyte", "Osteocytes"],
  },
  {
    position: 6, // Q7
    stem: "แถบ Matrix หมายเลข [4] (กระดูกที่เพิ่งสร้างใหม่ยังไม่สะสมแร่ธาตุ) คืออะไร",
    explanation:
      "Osteoid คือสารพื้น matrix กระดูกที่เซลล์ osteoblast เพิ่งสังเคราะห์ขึ้นใหม่ มีคอลลาเจน type I เป็นหลัก แต่ยังไม่ผ่านการสะสมแร่ธาตุ hydroxyapatite (unmineralized matrix)",
    imageFilename: "data/exam14_images/q07_cells_of_bone_osteoid.png",
    answers: ["Osteoid", "Osteoid matrix", "Newly synthesized bone"],
  },
  {
    position: 9, // Q10
    stem: "โซนหมายเลข [2] ใน Growth plate ที่เซลล์แบ่งตัวเรียงเป็นแถวคล้ายเหรียญซ้อนคืออะไร (*Zone)",
    explanation:
      "Proliferative zone (หรือ Zone of proliferation) คือชั้นใน growth plate ที่ chondrocytes มีการแบ่งตัวแบบ mitosis อย่างรวดเร็วและเรียงตัวเป็นแท่งคล้ายเหรียญซ้อนกัน (stacks of coins) เพื่อยืดความยาวของกระดูก",
    imageFilename: "data/exam14_images/q10_growth_plate_proliferative_zone.png",
    answers: [
      "Proliferative zone",
      "Proliferating zone",
      "Zone of proliferation",
    ],
  },
];

async function main() {
  console.log("=== Replacing Questions 4-7 and 10 in Exam-14 ===");

  const { data: qs, error: qErr } = await supabase
    .from("questions")
    .select("id, position, image_path")
    .eq("exam_id", EXAM_ID)
    .order("position");

  if (qErr || !qs) {
    console.error("Failed to load questions:", qErr);
    process.exit(1);
  }

  for (const item of REPLACEMENTS) {
    const targetQ = qs.find((q) => q.position === item.position);
    if (!targetQ) {
      console.error(`Question at position ${item.position} not found!`);
      continue;
    }

    console.log(`Updating Question at position ${item.position} (ID: ${targetQ.id})...`);

    // 1. Upload new image
    const fileBuffer = fs.readFileSync(item.imageFilename);
    const imgUuid = crypto.randomUUID();
    const newStoragePath = `${EXAM_ID}/${imgUuid}.png`;

    const { error: upErr } = await supabase.storage
      .from("question-images")
      .upload(newStoragePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (upErr) {
      console.error(`Failed to upload ${newStoragePath}:`, upErr);
      process.exit(1);
    }

    // 2. Update Question row
    const { error: updateErr } = await supabase
      .from("questions")
      .update({
        stem: item.stem,
        explanation: item.explanation,
        image_path: newStoragePath,
      })
      .eq("id", targetQ.id);

    if (updateErr) {
      console.error(`Failed to update question ${targetQ.id}:`, updateErr);
      process.exit(1);
    }

    // 3. Delete old answer keys
    await supabase.from("answer_keys").delete().eq("question_id", targetQ.id);

    // 4. Insert new answer keys
    const answerKeyRows = item.answers.map((answer, idx) => ({
      question_id: targetQ.id,
      answer,
      position: idx,
    }));

    const { error: keyErr } = await supabase.from("answer_keys").insert(answerKeyRows);
    if (keyErr) {
      console.error(`Failed to insert answer keys for ${targetQ.id}:`, keyErr);
      process.exit(1);
    }

    // 5. Clean up old image if different
    if (targetQ.image_path && targetQ.image_path !== newStoragePath) {
      await supabase.storage.from("question-images").remove([targetQ.image_path]);
    }

    console.log(`✓ Updated Q${item.position + 1}: ${item.stem}`);
  }

  // Verification
  const { data: finalQs } = await supabase
    .from("questions")
    .select("id, position, stem, points, image_path, answer_keys(answer)")
    .eq("exam_id", EXAM_ID)
    .order("position");

  console.log(`\n🎉 Verification: All 10 questions in EXAM-14:`);
  finalQs?.forEach((q, i) => {
    console.log(
      `Q${i + 1} (pos ${q.position}): "${q.stem}" [Keys: ${q.answer_keys.map((k) => k.answer).join(" | ")}]`
    );
  });
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
