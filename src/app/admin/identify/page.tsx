import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { signQuestionImages } from "@/lib/storage";
import { badge, btn } from "@/components/ui";
import { Flash } from "@/components/flash";
import { EmptyState } from "@/components/empty-state";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteIdCard } from "./actions";
import { CardForm } from "./card-form";

export const metadata: Metadata = { title: "Identify typing (beta)" };

export default async function IdentifyAdminPage({
  searchParams,
}: PageProps<"/admin/identify">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin("/admin/identify");
  const { data: cards } = await supabase
    .from("id_cards")
    .select("id, title, subject, image_path, id_card_labels(label_no, answer)")
    .order("created_at", { ascending: false });
  const urls = await signQuestionImages(
    supabase,
    (cards ?? []).map((c) => c.image_path),
  );

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Identify typing</h1>
        <span className={badge.pink}>Beta · admin only</span>
        <Link href="/admin/identify/play" className={`${btn.primary} ml-auto`}>
          เริ่มเล่น (สุ่มการ์ด)
        </Link>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section>
          {!cards?.length ? (
            <EmptyState
              title="ยังไม่มีการ์ด"
              description="อัปโหลดรูปที่มีเลขกำกับ + เฉลยจากฟอร์มด้านข้าง"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {cards.map((c) => (
                <li
                  key={c.id}
                  className="overflow-hidden rounded-card border border-line bg-surface shadow-soft"
                >
                  {urls.get(c.image_path) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urls.get(c.image_path)}
                      alt={c.title}
                      className="aspect-[4/3] w-full bg-white object-contain"
                    />
                  )}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-medium">{c.title}</span>
                      <span className={badge.blue}>{c.subject}</span>
                    </div>
                    <details className="text-sm text-ink-2">
                      <summary className="cursor-pointer">
                        เฉลย {c.id_card_labels.length} ตำแหน่ง
                      </summary>
                      <ol className="mt-2 space-y-0.5">
                        {[...c.id_card_labels]
                          .sort((a, b) => a.label_no - b.label_no)
                          .map((l) => (
                            <li key={l.label_no}>
                              {l.label_no}. {l.answer}
                            </li>
                          ))}
                      </ol>
                    </details>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/identify/play?card=${c.id}`}
                        className={btn.secondary}
                      >
                        เล่นการ์ดนี้
                      </Link>
                      <form action={deleteIdCard}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton
                          className={btn.danger}
                          message="ลบการ์ดนี้?"
                        >
                          ลบ
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <CardForm />
      </div>
    </main>
  );
}
