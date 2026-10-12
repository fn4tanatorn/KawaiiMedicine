"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import type { MoodType } from "./types";

export async function createLoungePost(input: {
  content: string;
  mood?: MoodType | null;
  isAnonymous: boolean;
  alias?: string;
}) {
  const { supabase, user } = await requireUser("/lounge");

  const content = (input.content ?? "").trim();
  if (!content) {
    return { error: "กรุณาพิมพ์ข้อความก่อนส่งนะ" };
  }
  if (content.length > 1000) {
    return { error: "ข้อความยาวเกินไป (ไม่เกิน 1,000 ตัวอักษร)" };
  }

  const alias = input.isAnonymous
    ? (input.alias?.trim() || "นักศึกษาแพทย์ท่านหนึ่ง")
    : "";

  const { error } = await supabase.from("lounge_posts").insert({
    user_id: user.id,
    content,
    mood: input.mood || null,
    is_anonymous: input.isAnonymous,
    alias: alias || "นักศึกษาแพทย์ท่านหนึ่ง",
  });

  if (error) {
    console.error("Failed to create lounge post:", error);
    return { error: "เกิดข้อผิดพลาด ไม่สามารถส่งข้อความได้" };
  }

  revalidatePath("/lounge");
  return { success: true };
}

export async function deleteLoungePost(postId: string) {
  const { supabase } = await requireUser("/lounge");

  const { error } = await supabase
    .from("lounge_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    console.error("Failed to delete lounge post:", error);
    return { error: "ไม่สามารถลบข้อความได้" };
  }

  revalidatePath("/lounge");
  return { success: true };
}

export async function toggleReaction(postId: string, emoji: string) {
  const { supabase } = await requireUser("/lounge");

  const { data, error } = await supabase.rpc("toggle_lounge_reaction", {
    p_post_id: postId,
    p_emoji: emoji,
  });

  if (error) {
    console.error("Failed to toggle reaction:", error);
    return { error: "เกิดข้อผิดพลาดในการกดส่งกำลังใจ" };
  }

  revalidatePath("/lounge");
  return { success: true, active: Boolean(data) };
}
