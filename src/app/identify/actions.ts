"use server";

import { requireUser } from "@/lib/auth/require-user";

export type IdAnswerResult = {
  label_no: number;
  answer: string;
  given: string;
  is_correct: boolean;
  daily_limit: number | null;
  used: number;
};

/** Grade one label; the RPC enforces the daily quota and logs the answer. */
export async function answerIdLabel(
  cardId: string,
  labelNo: number,
  answer: string,
): Promise<
  | { ok: true; result: IdAnswerResult }
  | { ok: false; error: string; limitReached?: boolean }
> {
  const { supabase } = await requireUser("/identify");
  const { data, error } = await supabase.rpc("answer_id_label", {
    p_card_id: cardId,
    p_label_no: labelNo,
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
