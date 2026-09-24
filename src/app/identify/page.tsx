import type { Metadata } from "next";
import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { signQuestionImages } from "@/lib/storage";
import { alert, badge, btn, card } from "@/components/ui";
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

export default async function IdentifyPage({
  searchParams,
}: PageProps<"/identify">) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser("/identify");
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  const playing = one(sp.play) === "1";
  const prev = one(sp.prev);

  const [{ data: quotaRows }, profile] = await Promise.all([
    supabase.rpc("id_quota"),
    getProfile(user.id),
  ]);
  const isStaff = profile?.role === "admin" || profile?.role === "instructor";
  const limit = quotaRows?.[0]?.daily_limit ?? null;
  const used = quotaRows?.[0]?.used ?? 0;
  const remaining = limit === null ? null : Math.max(limit - used, 0);

  const header = (
    <PageTitle
      icon={<IconTarget width={28} height={28} />}
      tint="pink"
      title="Identify"
      subtitle="ดูรูปแล้วพิมพ์ชื่อโครงสร้างตามหมายเลข"
    />
  );
  const quotaNote =
    limit === null
      ? "ไม่จำกัดจำนวนข้อ (staff)"
      : `วันนี้เหลือ ${remaining}/${limit} ข้อ${limit < 10 ? " · ดูวิดีโอครบทุกคลิปเพื่อปลดล็อก 10 ข้อ/วัน" : ""}`;

  if (remaining === 0) {
    return (
      <main className="space-y-6">
        {header}
        <p className={alert.warn}>
          วันนี้ทำครบ {limit} ข้อแล้ว กลับมาใหม่พรุ่งนี้นะ
          {limit !== null &&
            limit < 10 &&
            " · ดูวิดีโอให้ครบทุกคลิปเพื่อได้ 10 ข้อ/วัน"}
        </p>
      </main>
    );
  }

  // Students never choose: the card is always random. Staff may open a
  // specific card (?card=) to test it from /admin/identify.
  const staffCard = isStaff ? one(sp.card) : undefined;

  if (!playing && !staffCard) {
    return (
      <main className="space-y-6">
        {header}
        <div className={`${card} space-y-4 text-center`}>
          <p className="text-ink-2">
            ระบบจะสุ่มการ์ดและหมายเลขให้ พิมพ์ชื่อโครงสร้างทีละข้อ
          </p>
          <p className="text-sm text-ink-2">{quotaNote}</p>
          <Link href="/identify?play=1" className={`${btn.primary} px-10`}>
            Start
          </Link>
        </div>
      </main>
    );
  }

  let cardId = staffCard;
  if (!cardId) {
    // RLS: students only get published cards; staff also get drafts.
    const { data: ids } = await supabase.from("id_cards").select("id");
    const pool = (ids ?? []).filter((c) => c.id !== prev);
    cardId = randomItem(pool.length ? pool : (ids ?? []))?.id;
  }

  const { data: idCard } = cardId
    ? await supabase
        .from("id_cards")
        .select("id, title, subject, image_path, is_published")
        .eq("id", cardId)
        .maybeSingle()
    : { data: null };

  if (!idCard) {
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
    supabase.rpc("id_card_label_nos", { p_card_id: idCard.id }),
    signQuestionImages(supabase, [idCard.image_path]),
  ]);

  return (
    <main className="space-y-6">
      {header}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{idCard.title}</h2>
        <span className={badge.blue}>{idCard.subject}</span>
        {!idCard.is_published && (
          <span className={badge.gray}>ยังไม่เผยแพร่</span>
        )}
      </div>
      <SingleRunner
        key={idCard.id}
        cardId={idCard.id}
        imageUrl={urls.get(idCard.image_path) ?? null}
        title={idCard.title}
        order={shuffled(labelNos ?? [])}
        nextHref={`/identify?play=1&prev=${idCard.id}`}
        initialLimit={limit}
        initialUsed={used}
      />
    </main>
  );
}
