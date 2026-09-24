import type { Metadata } from "next";
import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { alert, btn, card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PageTitle } from "@/components/page-title";
import { IconTarget } from "@/components/icons";
import { IdentifyRunner } from "./identify-runner";
import { loadIdQuestion } from "./question";

export const metadata: Metadata = { title: "Identify" };

export default async function IdentifyPage({
  searchParams,
}: PageProps<"/identify">) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser("/identify");
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const [{ data: quotaRows }, profile] = await Promise.all([
    supabase.rpc("id_quota"),
    getProfile(user.id),
  ]);
  const isStaff = profile?.role === "admin" || profile?.role === "instructor";
  const limit = quotaRows?.[0]?.daily_limit ?? null;
  const used = quotaRows?.[0]?.used ?? 0;
  const remaining = limit === null ? null : Math.max(limit - used, 0);
  // Students never choose; staff may force a card (?card=) to test it.
  const staffCard = isStaff ? one(sp.card) : undefined;
  const playing = one(sp.play) === "1" || !!staffCard;

  const header = (
    <PageTitle
      icon={<IconTarget width={28} height={28} />}
      tint="pink"
      title="Identify"
      subtitle="ดูรูปแล้วพิมพ์ชื่อโครงสร้างตามหมายเลข"
    />
  );
  const limitMsg = (
    <p className={alert.warn}>
      วันนี้ทำครบ {limit} ข้อแล้ว กลับมาใหม่พรุ่งนี้นะ
      {limit !== null &&
        limit < 10 &&
        " · ดูวิดีโอให้ครบทุกคลิปเพื่อได้ 10 ข้อ/วัน"}
    </p>
  );

  if (remaining === 0) {
    return (
      <main className="space-y-6">
        {header}
        {limitMsg}
      </main>
    );
  }

  if (!playing) {
    return (
      <main className="space-y-6">
        {header}
        <div className={`${card} space-y-4 text-center`}>
          <p className="text-ink-2">
            ระบบจะสุ่มข้อให้ เน้นข้อที่เคยตอบผิด ทบทวนข้อที่เพิ่งจำได้
            และเพิ่มข้อใหม่
          </p>
          <p className="text-sm text-ink-2">
            {limit === null
              ? "ไม่จำกัดจำนวนข้อ (staff)"
              : `วันนี้เหลือ ${remaining}/${limit} ข้อ${limit < 10 ? " · ดูวิดีโอครบทุกคลิปเพื่อปลดล็อก 10 ข้อ/วัน" : ""}`}
          </p>
          <Link href="/identify?play=1" className={`${btn.primary} px-10`}>
            Start
          </Link>
        </div>
      </main>
    );
  }

  const first = await loadIdQuestion(supabase, staffCard);

  return (
    <main className="space-y-6">
      {header}
      {first.kind === "question" ? (
        <IdentifyRunner
          initialQuestion={first.question}
          initialLimit={limit}
          initialUsed={used}
        />
      ) : first.kind === "limit" ? (
        limitMsg
      ) : (
        <EmptyState
          title={first.kind === "empty" ? "ยังไม่มีการ์ด" : "โหลดข้อไม่สำเร็จ"}
          description={
            first.kind === "empty"
              ? "รอผู้สอนเพิ่มการ์ดก่อนนะ"
              : "ลองรีเฟรชอีกครั้ง"
          }
        />
      )}
    </main>
  );
}
