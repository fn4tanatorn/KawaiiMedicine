"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseLabelLines } from "./parse-labels";

export async function createIdCard(input: {
  title: string;
  subject: string;
  imagePath: string;
  labels: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireAdmin("/admin/identify");
  const title = input.title.trim();
  const subject = input.subject === "histology" ? "histology" : "anatomy";
  const labels = parseLabelLines(input.labels);
  if (!title) return { ok: false, error: "กรุณากรอกชื่อการ์ด" };
  if (!input.imagePath) return { ok: false, error: "กรุณาเลือกรูป" };
  if (labels.length === 0)
    return {
      ok: false,
      error: 'อ่านเฉลยไม่ได้ — ใช้รูปแบบ "1. Frontal bone" บรรทัดละข้อ',
    };

  const { data: card, error } = await supabase
    .from("id_cards")
    .insert({
      title,
      subject,
      image_path: input.imagePath,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !card) return { ok: false, error: "สร้างการ์ดไม่สำเร็จ" };

  const { error: lErr } = await supabase
    .from("id_card_labels")
    .insert(labels.map((l) => ({ card_id: card.id, ...l })));
  if (lErr) {
    await supabase.from("id_cards").delete().eq("id", card.id);
    return { ok: false, error: "บันทึกเฉลยไม่สำเร็จ" };
  }
  revalidatePath("/admin/identify");
  return { ok: true, id: card.id };
}

export async function deleteIdCard(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/identify");
  const id = formData.get("id")?.toString() ?? "";
  const { data } = await supabase
    .from("id_cards")
    .delete()
    .eq("id", id)
    .select("image_path")
    .single();
  if (data?.image_path)
    await supabase.storage.from("question-images").remove([data.image_path]);
  revalidatePath("/admin/identify");
  redirect("/admin/identify?ok=" + encodeURIComponent("ลบการ์ดแล้ว"));
}

export type IdCheckResult = {
  label_no: number;
  answer: string;
  given: string;
  is_correct: boolean;
}[];

export async function checkIdCard(
  cardId: string,
  labelNo: number,
  answer: string,
): Promise<
  { ok: true; result: IdCheckResult[number] } | { ok: false; error: string }
> {
  const { supabase } = await requireAdmin("/admin/identify/play");
  const { data, error } = await supabase.rpc("check_id_card", {
    p_card_id: cardId,
    p_answers: { [labelNo]: answer },
  });
  if (error || !data) return { ok: false, error: "ตรวจคำตอบไม่สำเร็จ" };
  // Return only the asked label so other answers never reach the browser.
  const result = data.find((r) => r.label_no === labelNo);
  if (!result) return { ok: false, error: "ไม่พบหมายเลขนี้" };
  return { ok: true, result };
}
