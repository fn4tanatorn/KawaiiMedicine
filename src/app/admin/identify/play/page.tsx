import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { signQuestionImages } from "@/lib/storage";
import { badge, btn, input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { IdentifyRunner } from "./identify-runner";

export const metadata: Metadata = { title: "Identify typing (beta)" };

/** Kept outside the component so the render body stays pure. */
function randomItem<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

const SUBJECTS = ["anatomy", "histology"] as const;

export default async function IdentifyPlayPage({
  searchParams,
}: PageProps<"/admin/identify/play">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin("/admin/identify/play");
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  const subject = SUBJECTS.find((s) => s === one(sp.subject));
  const prev = one(sp.prev);
  let cardId = one(sp.card);

  if (!cardId) {
    let q = supabase.from("id_cards").select("id");
    if (subject) q = q.eq("subject", subject);
    const { data: ids } = await q;
    const pool = (ids ?? []).filter((c) => c.id !== prev);
    const pick = pool.length ? pool : (ids ?? []);
    cardId = randomItem(pick)?.id;
  }

  const { data: card } = cardId
    ? await supabase
        .from("id_cards")
        .select("id, title, subject, image_path, id_card_labels(label_no)")
        .eq("id", cardId)
        .maybeSingle()
    : { data: null };

  if (!card) {
    return (
      <EmptyState
        title="ยังไม่มีการ์ดให้เล่น"
        description="เพิ่มการ์ดที่หน้า Identify typing ก่อน"
      />
    );
  }

  const urls = await signQuestionImages(supabase, [card.image_path]);
  const labelNos = card.id_card_labels
    .map((l) => l.label_no)
    .sort((a, b) => a - b);
  const nextHref = `/admin/identify/play?prev=${card.id}${subject ? `&subject=${subject}` : ""}`;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/identify" className={btn.link}>
          ← การ์ดทั้งหมด
        </Link>
        <h1 className="text-xl font-semibold">{card.title}</h1>
        <span className={badge.blue}>{card.subject}</span>
        <form className="ml-auto flex gap-2" action="/admin/identify/play">
          <select name="subject" defaultValue={subject ?? ""} className={input}>
            <option value="">ทุกหมวด</option>
            <option value="anatomy">Anatomy</option>
            <option value="histology">Histology</option>
          </select>
          <button className={btn.secondary}>สุ่ม</button>
        </form>
      </div>
      <IdentifyRunner
        key={card.id}
        cardId={card.id}
        imageUrl={urls.get(card.image_path) ?? null}
        title={card.title}
        labelNos={labelNos}
        nextHref={nextHref}
      />
    </main>
  );
}
