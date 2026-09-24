import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { signQuestionImages } from "@/lib/storage";

export type IdQuestion = {
  cardId: string;
  labelNo: number;
  title: string;
  subject: string;
  isPublished: boolean;
  imageUrl: string | null;
};

export type IdQuestionResult =
  | { kind: "question"; question: IdQuestion }
  | { kind: "limit" }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * The caller's current question. The DB picks it (weighted review order) and
 * keeps it pending, so reloading doesn't re-roll. cardId: staff-only override.
 */
export async function loadIdQuestion(
  supabase: SupabaseClient<Database>,
  cardId?: string,
): Promise<IdQuestionResult> {
  const { data, error } = await supabase.rpc(
    "next_id_question",
    cardId ? { p_card_id: cardId } : {},
  );
  if (error?.code === "P0001") return { kind: "limit" };
  if (error) {
    console.error("next_id_question failed", error);
    return {
      kind: "error",
      message: `next_id_question: ${error.code ?? ""} ${error.message}`,
    };
  }
  const q = data?.[0];
  if (!q) return { kind: "empty" };

  const { data: card, error: cardError } = await supabase
    .from("id_cards")
    .select("title, subject, is_published, image_path")
    .eq("id", q.card_id)
    .single();
  if (!card) {
    console.error("id_cards lookup failed", cardError);
    return {
      kind: "error",
      message: `id_cards: ${cardError?.code ?? ""} ${cardError?.message ?? "not found"}`,
    };
  }
  const urls = await signQuestionImages(supabase, [card.image_path]);
  return {
    kind: "question",
    question: {
      cardId: q.card_id,
      labelNo: q.label_no,
      // Only the topic before " — " is shown: the detail can give answers away.
      title: card.title.split(" — ")[0].trim(),
      subject: card.subject,
      isPublished: card.is_published,
      imageUrl: urls.get(card.image_path) ?? null,
    },
  };
}
