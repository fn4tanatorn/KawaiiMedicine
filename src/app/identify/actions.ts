"use server";

import { requireUser } from "@/lib/auth/require-user";
import { loadIdQuestion, type IdQuestionResult } from "./question";

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
  return loadIdQuestion(supabase);
}
