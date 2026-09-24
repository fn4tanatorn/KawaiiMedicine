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
  openAll?: boolean;
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

  const { data: newLabels, error: lErr } = await supabase
    .from("id_card_labels")
    .insert(
      labels.map((l) => ({
        card_id: card.id,
        ...l,
        is_published: !!input.openAll,
      })),
    )
    .select("id");
  if (lErr) {
    await supabase.from("id_cards").delete().eq("id", card.id);
    return { ok: false, error: "บันทึกเฉลยไม่สำเร็จ" };
  }
  // Tags picked on the create form apply to every label of the new card.
  const systemIds = cleanIds(input.organSystemIds ?? []);
  if (systemIds.length && newLabels?.length) {
    const { error: tErr } = await supabase
      .from("id_card_label_organ_systems")
      .insert(
        newLabels.flatMap((l) =>
          systemIds.map((organ_system_id) => ({
            label_id: l.id,
            organ_system_id,
          })),
        ),
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

/** Where to go back to after a label action: same filters, same card. */
function backTo(formData: FormData, cardId: string, msg: string, ok: boolean) {
  const qs = new URLSearchParams(formData.get("back")?.toString() ?? "");
  qs.delete("ok");
  qs.delete("error");
  qs.set(ok ? "ok" : "error", msg);
  return `/admin/identify?${qs}#card-${cardId}`;
}

/**
 * Save the labels shown on one card (hidden inputs `label_id`; labels hidden
 * by the filter are left untouched): which are open to students (checkboxes
 * named `open`, value = label id) and each label's tags (checkboxes named
 * `organ_system:<label_id>`).
 */
export async function saveCardLabels(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/identify");
  const cardId = formData.get("card_id")?.toString() ?? "";
  const shown = formData.getAll("label_id").map(String);
  const { data: labels } = await supabase
    .from("id_card_labels")
    .select("id")
    .eq("card_id", cardId)
    .in("id", shown);
  const labelIds = (labels ?? []).map((l) => l.id);
  const rows = labelIds.flatMap((label_id) =>
    cleanIds(formData.getAll(`organ_system:${label_id}`)).map(
      (organ_system_id) => ({ label_id, organ_system_id }),
    ),
  );
  const { error } = labelIds.length
    ? await supabase
        .from("id_card_label_organ_systems")
        .delete()
        .in("label_id", labelIds)
    : { error: null };
  const { error: insErr } =
    error || rows.length === 0
      ? { error }
      : await supabase.from("id_card_label_organ_systems").insert(rows);
  const open = new Set(formData.getAll("open").map(String));
  const openIds = labelIds.filter((id) => open.has(id));
  const closedIds = labelIds.filter((id) => !open.has(id));
  const [{ error: openErr }, { error: closeErr }] = await Promise.all([
    openIds.length
      ? supabase
          .from("id_card_labels")
          .update({ is_published: true })
          .in("id", openIds)
      : { error: null },
    closedIds.length
      ? supabase
          .from("id_card_labels")
          .update({ is_published: false })
          .in("id", closedIds)
      : { error: null },
  ]);
  revalidatePath("/admin/identify");
  const failed = !!(insErr || openErr || closeErr);
  redirect(
    backTo(
      formData,
      cardId,
      failed
        ? "บันทึกไม่สำเร็จ"
        : `บันทึกแล้ว · เปิด ${openIds.length}/${labelIds.length} ข้อ`,
      !failed,
    ),
  );
}

/**
 * Delete one label (question). Its tags and anyone's pending question on it
 * go with it (FK cascade); past answers in id_answers stay for the log.
 */
export async function deleteIdLabel(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/identify");
  const cardId = formData.get("card_id")?.toString() ?? "";
  const id = formData.get("delete_label")?.toString() ?? "";
  const { data, error } = await supabase
    .from("id_card_labels")
    .delete()
    .eq("id", id)
    .eq("card_id", cardId)
    .select("label_no");
  revalidatePath("/admin/identify");
  const ok = !error && !!data?.length;
  redirect(
    backTo(
      formData,
      cardId,
      ok ? `ลบข้อ ${data[0].label_no} แล้ว` : "ลบข้อไม่สำเร็จ",
      ok,
    ),
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
