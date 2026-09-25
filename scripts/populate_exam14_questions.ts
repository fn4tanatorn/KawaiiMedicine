/**
 * Populate Exam-14 (Skeletal System) with 7 new questions from Netter Histology
 * Identify cards (Chapter 6: Cartilage and Bone), bringing total questions to 10.
 * Also standardizes existing Q1-Q3 stems to Thai format.
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
const SKELETAL_SYSTEM_ID = 6;

interface NewQuestionDef {
  position: number;
  stem: string;
  explanation: string;
  imageFilename: string;
  answers: string[];
}

const NEW_QUESTIONS: NewQuestionDef[] = [
  {
    position: 3,
    stem: "โครงสร้างในวงกลมหมายเลข [5] คืออะไร",
    explanation:
      "Isogenous nest (หรือ Isogenous group) คือกลุ่มของเซลล์ chondrocyte ที่เกิดจากการแบ่งตัวแบบ mitosis จากเซลล์ต้นกำเนิดเดียวกันและอยู่ร่วมกันใน lacuna เดียวกัน",
    imageFilename: "data/exam14_images/q04_hyaline_cartilage_isogenous_group.png",
    answers: [
      "Isogenous nest",
      "Isogenous group",
      "Isogenous nests",
      "Isogenous groups",
      "Chondrocyte isogenous group",
      "Chondrocyte isogenous nest",
    ],
  },
  {
    position: 4,
    stem: "โครงสร้างหมายเลข [2] คืออะไร",
    explanation:
      "Nucleus pulposus คือแกนชั้นในที่มีลักษณะคล้ายวุ้นและมีน้ำเป็นองค์ประกอบสูง อยู่ตรงกลางของหมอนรองกระดูกสันหลัง (Intervertebral disc) ล้อมรอบด้วย Annulus fibrosus",
    imageFilename: "data/exam14_images/q05_fibrocartilage_nucleus_pulposus.png",
    answers: ["Nucleus pulposus", "Nucleus pulposis", "Pulposus"],
  },
  {
    position: 5,
    stem: "เซลล์หมายเลข [1] คืออะไร",
    explanation:
      "Chondrocyte คือเซลล์กระดูกอ่อนที่เจริญเต็มที่แล้ว อาศัยอยู่ในช่องว่างที่เรียกว่า lacuna พบได้หนาแน่นใน Elastic cartilage",
    imageFilename: "data/exam14_images/q06_elastic_cartilage_chondrocyte.png",
    answers: ["Chondrocyte", "Chondrocytes"],
  },
  {
    position: 6,
    stem: "ออร์แกเนลล์หมายเลข [4] คืออะไร",
    explanation:
      "Rough endoplasmic reticulum (RER) มีลักษณะเป็นถุงแบนพับซ้อนกันและมี ribosome เกาะที่ผิวด้านนอก ทำหน้าที่สังเคราะห์โปรตีน เช่น collagen และ proteoglycans ของ cartilage matrix",
    imageFilename: "data/exam14_images/q07_chondrocyte_em_rer.png",
    answers: [
      "Rough endoplasmic reticulum",
      "RER",
      "Rough ER",
      "Rough endoplasmic reticulum (RER)",
    ],
  },
  {
    position: 7,
    stem: "เซลล์หมายเลข [1] คืออะไร",
    explanation:
      "Osteoclast คือเซลล์ขนาดใหญ่ที่มีหลายนิวเคลียส (multinucleated giant cell) ทำหน้าที่สลายกระดูก (bone resorption) มักพบอยู่ในแอ่งสลายกระดูก Howship's lacuna",
    imageFilename: "data/exam14_images/q08_spongy_bone_osteoclast.png",
    answers: ["Osteoclast", "Osteoclasts"],
  },
  {
    position: 8,
    stem: "เซลล์หมายเลข [5] คืออะไร",
    explanation:
      "Osteoblast คือเซลล์สร้างกระดูก มีรูปร่าง cuboidal เรียงตัวเป็นชั้นเดียวอยู่บนผิวของกระดูกใหม่ ทำหน้าที่สังเคราะห์ osteoid matrix",
    imageFilename: "data/exam14_images/q09_cells_of_bone_osteoblast.png",
    answers: ["Osteoblast", "Osteoblasts"],
  },
  {
    position: 9,
    stem: "โครงสร้างหมายเลข [1] คืออะไร",
    explanation:
      "Meniscus (หมอนรองกระดูกข้อเข่า) เป็น fibrocartilage รูปพระจันทร์เสี้ยว ทำหน้าที่กระจายแรงกระแทกและเพิ่มความมั่นคงของข้อเข่า",
    imageFilename: "data/exam14_images/q10_synovium_meniscus.png",
    answers: [
      "Meniscus",
      "Medial meniscus",
      "Lateral meniscus",
      "Articular meniscus",
    ],
  },
];

async function main() {
  console.log("=== Updating Exam-14 (Skeletal System) ===");

  // 1. Verify exam exists
  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .select("id, title, slug, is_published")
    .eq("id", EXAM_ID)
    .single();

  if (examErr || !exam) {
    console.error("Exam not found:", examErr);
    process.exit(1);
  }
  console.log(`Found exam: "${exam.title}" (${exam.slug})`);

  // 2. Update existing questions Q1, Q2, Q3 stems to Thai format
  const { data: existingQs } = await supabase
    .from("questions")
    .select("id, position, stem")
    .eq("exam_id", EXAM_ID)
    .order("position");

  const q1 = existingQs?.find((q) => q.position === 0);
  const q2 = existingQs?.find((q) => q.position === 1);
  const q3 = existingQs?.find((q) => q.position === 2);

  if (q1) {
    await supabase
      .from("questions")
      .update({
        stem: "โครงสร้างหมายเลข [3] คืออะไร",
        explanation:
          "Spongy bone (หรือ Trabecular bone / Cancellous bone) คือกระดูกโปร่งที่มีลักษณะเป็นร่างแหของ trabeculae รองรับ subchondral bone",
      })
      .eq("id", q1.id);

    // Also add "cancellous bone" if not present
    const { data: keys1 } = await supabase
      .from("answer_keys")
      .select("answer")
      .eq("question_id", q1.id);
    const answers1 = keys1?.map((k) => k.answer.toLowerCase()) ?? [];
    if (!answers1.includes("cancellous bone")) {
      await supabase.from("answer_keys").insert({
        question_id: q1.id,
        answer: "Cancellous bone",
        position: answers1.length,
      });
    }
    console.log("Updated Q1 stem to Thai");
  }

  if (q2) {
    await supabase
      .from("questions")
      .update({
        stem: "โซนหมายเลข [4] คืออะไร (*Zone)",
        explanation:
          "Zone of hypertrophy (หรือ Zone of maturation and hypertrophy) คือโซนใน growth plate ที่ chondrocyte มีขนาดใหญ่ขึ้นอย่างเห็นได้ชัดและสะสมไกลโคเจน",
      })
      .eq("id", q2.id);
    console.log("Updated Q2 stem to Thai");
  }

  if (q3) {
    await supabase
      .from("questions")
      .update({
        stem: "โครงสร้างยูนิตหมายเลข [3] (ลูกศรสีน้ำเงิน) คืออะไร (*Unit)",
        explanation:
          "Osteon (หรือ Haversian system) คือหน่วยโครงสร้างพื้นฐานทรงกระบอกของ Compact bone ประกอบด้วย concentric lamellae ล้อมรอบ Haversian canal",
      })
      .eq("id", q3.id);
    console.log("Updated Q3 stem to Thai");
  }

  // 3. Upload images and insert new questions Q4 to Q10
  for (const item of NEW_QUESTIONS) {
    console.log(`Processing Q${item.position + 1}: ${item.stem}...`);
    const fileBuffer = fs.readFileSync(item.imageFilename);
    const imgUuid = crypto.randomUUID();
    const storagePath = `${EXAM_ID}/${imgUuid}.png`;

    const { error: upErr } = await supabase.storage
      .from("question-images")
      .upload(storagePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (upErr) {
      console.error(`Failed to upload ${storagePath}:`, upErr);
      process.exit(1);
    }
    console.log(`Uploaded image to ${storagePath}`);

    // Insert question
    const { data: qRow, error: qErr } = await supabase
      .from("questions")
      .insert({
        exam_id: EXAM_ID,
        kind: "text",
        stem: item.stem,
        explanation: item.explanation,
        points: 1,
        position: item.position,
        image_path: storagePath,
      })
      .select("id")
      .single();

    if (qErr || !qRow) {
      console.error(`Failed to insert question for position ${item.position}:`, qErr);
      process.exit(1);
    }

    // Insert answer keys
    const answerKeyRows = item.answers.map((answer, idx) => ({
      question_id: qRow.id,
      answer,
      position: idx,
    }));

    const { error: kErr } = await supabase.from("answer_keys").insert(answerKeyRows);
    if (kErr) {
      console.error(`Failed to insert answer keys for question ${qRow.id}:`, kErr);
      process.exit(1);
    }

    // Tag with Skeletal system
    const { error: tagErr } = await supabase
      .from("question_organ_systems")
      .insert({
        question_id: qRow.id,
        organ_system_id: SKELETAL_SYSTEM_ID,
      });

    if (tagErr) {
      console.error(`Failed to tag question ${qRow.id} with system ${SKELETAL_SYSTEM_ID}:`, tagErr);
    }

    console.log(`Successfully created Q${item.position + 1} (${qRow.id})`);
  }

  // 4. Verify total questions in Exam-14
  const { data: finalQs } = await supabase
    .from("questions")
    .select("id, position, stem, points, image_path, answer_keys(answer)")
    .eq("exam_id", EXAM_ID)
    .order("position");

  console.log(`\n🎉 Done! Total questions in Exam-14: ${finalQs?.length}`);
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
