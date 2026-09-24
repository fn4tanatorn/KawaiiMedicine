import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";
import { signQuestionImages } from "@/lib/storage";
import { alert, badge, btn, input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PageTitle } from "@/components/page-title";
import { IconTarget } from "@/components/icons";
import { SingleRunner } from "./single-runner";

export const metadata: Metadata = { title: "Identify" };

// Kept outside the component so the render body stays pure.
function randomItem<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SUBJECTS = ["anatomy", "histology"] as const;

export default async function IdentifyPage({
  searchParams,
}: PageProps<"/identify">) {
  const sp = await searchParams;
  const { supabase } = await requireUser("/identify");
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  const subject = SUBJECTS.find((s) => s === one(sp.subject));
  const prev = one(sp.prev);
  let cardId = one(sp.card);

  const { data: quotaRows } = await supabase.rpc("id_quota");
  const limit = quotaRows?.[0]?.daily_limit ?? null;
  const used = quotaRows?.[0]?.used ?? 0;
  const remaining = limit === null ? null : Math.max(limit - used, 0);

  // RLS: students only get published cards; staff also get drafts.
  if (!cardId) {
    let q = supabase.from("id_cards").select("id");
    if (subject) q = q.eq("subject", subject);
    const { data: ids } = await q;
    const pool = (ids ?? []).filter((c) => c.id !== prev);
    cardId = randomItem(pool.length ? pool : (ids ?? []))?.id;
  }

  const { data: card } = cardId
    ? await supabase
        .from("id_cards")
        .select("id, title, subject, image_path, is_published")
        .eq("id", cardId)
        .maybeSingle()
    : { data: null };

  const header = (
    <PageTitle
      icon={<IconTarget width={28} height={28} />}
      tint="pink"
      title="Identify"
      subtitle={
        limit === null
          ? "ดูรูปแล้วพิมพ์ชื่อโครงสร้างตามหมายเลข"
          : `วันนี้ทำได้ ${limit} ข้อ${limit < 10 ? " · ดูวิดีโอครบทุกคลิปเพื่อปลดล็อก 10 ข้อ/วัน" : ""}`
      }
      actions={
        <form className="flex gap-2" action="/identify">
          <select name="subject" defaultValue={subject ?? ""} className={input}>
            <option value="">ทุกหมวด</option>
            <option value="anatomy">Anatomy</option>
            <option value="histology">Histology</option>
          </select>
          <button className={btn.secondary}>สุ่มการ์ด</button>
        </form>
      }
    />
  );

  if (!card) {
    return (
      <main className="space-y-6">
        {header}
        <EmptyState
          title="ยังไม่มีการ์ด"
          description="รอผู้สอนเพิ่มการ์ดก่อนนะ"
        />
      </main>
    );
  }

  const [{ data: labelNos }, urls] = await Promise.all([
    supabase.rpc("id_card_label_nos", { p_card_id: card.id }),
    signQuestionImages(supabase, [card.image_path]),
  ]);
  const nextHref = `/identify?${new URLSearchParams({
    prev: card.id,
    ...(subject ? { subject } : {}),
  })}`;

  return (
    <main className="space-y-6">
      {header}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{card.title}</h2>
        <span className={badge.blue}>{card.subject}</span>
        {!card.is_published && (
          <span className={badge.gray}>ยังไม่เผยแพร่</span>
        )}
      </div>
      {remaining === 0 ? (
        <p className={alert.warn}>
          วันนี้ทำครบ {limit} ข้อแล้ว กลับมาใหม่พรุ่งนี้นะ
          {limit !== null &&
            limit < 10 &&
            " · ดูวิดีโอให้ครบทุกคลิปเพื่อได้ 10 ข้อ/วัน"}
        </p>
      ) : (
        <SingleRunner
          key={card.id}
          cardId={card.id}
          imageUrl={urls.get(card.image_path) ?? null}
          title={card.title}
          order={shuffled(labelNos ?? [])}
          nextHref={nextHref}
          initialLimit={limit}
          initialUsed={used}
        />
      )}
    </main>
  );
}
