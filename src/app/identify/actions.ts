"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import {
  loadIdQuestion,
  STUDENT_MODE_COOKIE,
  type IdQuestionResult,
} from "./question";

export type IdAnswerResult = {
  card_id: string;
  label_no: number;
  answer: string;
  given: string;
  is_correct: boolean;
  daily_limit: number | null;
  used: number;
};

/** Grade the pending question; the RPC enforces the quota and logs it. */
export async function answerIdQuestion(
  answer: string,
): Promise<
  | { ok: true; result: IdAnswerResult }
  | { ok: false; error: string; limitReached?: boolean }
> {
  const { supabase } = await requireUser("/identify");
  const { data, error } = await supabase.rpc("answer_id_label", {
    p_answer: answer,
  });
  if (error?.code === "P0001")
    return {
      ok: false,
      error: "ครบโควต้าวันนี้แล้ว กลับมาใหม่พรุ่งนี้นะ",
      limitReached: true,
    };
  if (error || !data?.[0]) return { ok: false, error: "ตรวจคำตอบไม่สำเร็จ" };
  return { ok: true, result: data[0] };
}

/** Next question picked by the server; the client never chooses. */
export async function nextIdQuestion(): Promise<IdQuestionResult> {
  const { supabase } = await requireUser("/identify");
  // Only has an effect for staff; the RPC ignores it for students.
  const asStudent = (await cookies()).get(STUDENT_MODE_COOKIE)?.value === "1";
  return loadIdQuestion(supabase, undefined, asStudent);
}

/** Staff toggle for "play as a student". */
export async function setStudentMode(formData: FormData) {
  await requireUser("/identify");
  const on = formData.get("on") === "1";
  const jar = await cookies();
  if (on)
    jar.set(STUDENT_MODE_COOKIE, "1", {
      path: "/identify",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  else jar.delete({ name: STUDENT_MODE_COOKIE, path: "/identify" });
  redirect("/identify");
}
