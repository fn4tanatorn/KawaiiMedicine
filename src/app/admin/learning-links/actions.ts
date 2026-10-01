"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";

const str = (fd: FormData, k: string) => fd.get(k)?.toString().trim() ?? "";
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const bool = (fd: FormData, k: string) =>
  fd.get(k) === "on" || fd.get(k) === "true";

function withMsg(path: string, key: "ok" | "error", msg: string) {
  return `${path}?${key}=${encodeURIComponent(msg)}`;
}

async function swapPositions(
  rows: { id: string; position: number }[],
  id: string,
  dir: -1 | 1,
  write: (id: string, position: number) => Promise<unknown>,
) {
  const idx = rows.findIndex((r) => r.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[idx], order[j]] = [order[j], order[idx]];
  await Promise.all(order.map((rowId, pos) => write(rowId, pos)));
}

export async function createLearningResource(formData: FormData) {
  const { supabase } = await requireStaff("/admin/learning-links");
  const title = str(formData, "title");
  const url = str(formData, "url");
  const description = optStr(formData, "description");
  const category = str(formData, "category") || "general";
  const icon = str(formData, "icon") || "link";
  const is_published = bool(formData, "is_published");

  if (!title || !url) {
    redirect(
      withMsg(
        "/admin/learning-links",
        "error",
        "กรุณากรอกชื่อและลิงก์ (URL) ให้ครบถ้วน",
      ),
    );
  }

  // Get max position
  const { data: last } = await supabase
    .from("learning_resources")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = (last?.position ?? -1) + 1;

  const { error } = await supabase.from("learning_resources").insert({
    title,
    url,
    description,
    category,
    icon,
    position: nextPos,
    is_published,
  });

  if (error) {
    redirect(
      withMsg("/admin/learning-links", "error", "เพิ่มแหล่งเรียนรู้ไม่สำเร็จ"),
    );
  }

  revalidatePath("/admin/learning-links");
  revalidatePath("/learn");
  redirect(
    withMsg("/admin/learning-links", "ok", "เพิ่มแหล่งเรียนรู้เรียบร้อย"),
  );
}

export async function updateLearningResource(formData: FormData) {
  const { supabase } = await requireStaff("/admin/learning-links");
  const id = str(formData, "id");
  const title = str(formData, "title");
  const url = str(formData, "url");
  const description = optStr(formData, "description");
  const category = str(formData, "category") || "general";
  const icon = str(formData, "icon") || "link";
  const is_published = bool(formData, "is_published");

  if (!id || !title || !url) {
    redirect(
      withMsg(
        "/admin/learning-links",
        "error",
        "กรุณากรอกชื่อและลิงก์ (URL) ให้ครบถ้วน",
      ),
    );
  }

  const { error } = await supabase
    .from("learning_resources")
    .update({
      title,
      url,
      description,
      category,
      icon,
      is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      withMsg("/admin/learning-links", "error", "บันทึกแหล่งเรียนรู้ไม่สำเร็จ"),
    );
  }

  revalidatePath("/admin/learning-links");
  revalidatePath("/learn");
  redirect(withMsg("/admin/learning-links", "ok", "บันทึกแล้ว"));
}

export async function deleteLearningResource(formData: FormData) {
  const { supabase } = await requireStaff("/admin/learning-links");
  const id = str(formData, "id");
  if (!id) redirect("/admin/learning-links");

  const { error } = await supabase
    .from("learning_resources")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      withMsg("/admin/learning-links", "error", "ลบแหล่งเรียนรู้ไม่สำเร็จ"),
    );
  }

  revalidatePath("/admin/learning-links");
  revalidatePath("/learn");
  redirect(withMsg("/admin/learning-links", "ok", "ลบแล้ว"));
}

export async function moveLearningResource(formData: FormData) {
  const { supabase } = await requireStaff("/admin/learning-links");
  const id = str(formData, "id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;

  const { data: items } = await supabase
    .from("learning_resources")
    .select("id, position")
    .order("position");

  await swapPositions(items ?? [], id, dir, async (rowId, position) => {
    await supabase
      .from("learning_resources")
      .update({ position })
      .eq("id", rowId);
  });

  revalidatePath("/admin/learning-links");
  revalidatePath("/learn");
  redirect("/admin/learning-links");
}
