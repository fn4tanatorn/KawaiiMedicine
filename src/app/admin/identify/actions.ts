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
  organSystemIds?: number[];
}): Promise<
  { ok: true; id: string; warning?: string } | { ok: false; error: string }
> {
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
  const systemIds = cleanIds(input.organSystemIds ?? []);
  if (systemIds.length) {
    const { error: tErr } = await supabase
      .from("id_card_organ_systems")
      .insert(
        systemIds.map((organ_system_id) => ({
          card_id: card.id,
          organ_system_id,
        })),
      );
    if (tErr) {
      revalidatePath("/admin/identify");
      // The card is saved; keep its image (the client rolls back on !ok).
      return {
        ok: true,
        id: card.id,
        warning: "เพิ่มการ์ดแล้ว แต่บันทึกระบบอวัยวะไม่สำเร็จ",
      };
    }
  }
  revalidatePath("/admin/identify");
  return { ok: true, id: card.id };
}

function cleanIds(ids: unknown[]) {
  return [
    ...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
  ];
}

export async function setIdCardOrganSystems(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/identify");
  const id = formData.get("id")?.toString() ?? "";
  const systemIds = cleanIds(formData.getAll("organ_system"));
  const { error } = await supabase
    .from("id_card_organ_systems")
    .delete()
    .eq("card_id", id);
  const { error: insErr } =
    error || systemIds.length === 0
      ? { error }
      : await supabase
          .from("id_card_organ_systems")
          .insert(
            systemIds.map((organ_system_id) => ({
              card_id: id,
              organ_system_id,
            })),
          );
  revalidatePath("/admin/identify");
  redirect(
    "/admin/identify?" +
      (insErr
        ? "error=" + encodeURIComponent("บันทึกระบบอวัยวะไม่สำเร็จ")
        : "ok=" + encodeURIComponent("บันทึกระบบอวัยวะแล้ว")),
  );
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

export async function setIdCardPublished(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/identify");
  const id = formData.get("id")?.toString() ?? "";
  const publish = formData.get("publish") === "true";
  const { error } = await supabase
    .from("id_cards")
    .update({ is_published: publish })
    .eq("id", id);
  revalidatePath("/admin/identify");
  revalidatePath("/identify");
  redirect(
    "/admin/identify?" +
      (error
        ? "error=" + encodeURIComponent("อัปเดตไม่สำเร็จ")
        : "ok=" + encodeURIComponent(publish ? "เผยแพร่แล้ว" : "ซ่อนแล้ว")),
  );
}
