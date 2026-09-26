"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidClassCode } from "@/lib/auth/class-code";
import { safeNextPath } from "@/lib/auth/site-url";

export async function enrollWithClassCode(formData: FormData) {
  const code = formData.get("code")?.toString().trim() ?? "";
  const lineName = formData.get("line_name")?.toString().trim() ?? "";
  const nextRaw = formData.get("next")?.toString();
  const next = safeNextPath(nextRaw && nextRaw !== "/join" ? nextRaw : "/learn");

  if (!code) {
    redirect(`/join?error=${encodeURIComponent("กรุณากรอกรหัสเข้าคลาส")}`);
  }

  if (!isValidClassCode(code)) {
    redirect(
      `/join?error=${encodeURIComponent(
        "รหัสเข้าคลาสไม่ถูกต้อง กรุณาตรวจสอบรหัสจากโน้ตประกาศในกลุ่ม LINE OpenChat อีกครั้ง",
      )}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const updatePayload: { enrolled: boolean; line_name?: string } = {
    enrolled: true,
  };
  if (lineName) {
    updatePayload.line_name = lineName.slice(0, 80);
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    console.error("Failed to enroll profile:", error);
    redirect(
      `/join?error=${encodeURIComponent("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}
