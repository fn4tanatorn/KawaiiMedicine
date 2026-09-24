import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";
import { signQuestionImages } from "@/lib/storage";
import { badge, btn } from "@/components/ui";
import { Flash } from "@/components/flash";
import { EmptyState } from "@/components/empty-state";
import { ConfirmButton } from "@/components/confirm-button";
import {
  deleteIdCard,
  saveCardLabels,
  setIdCardPublished,
} from "./actions";
import { CardForm } from "./card-form";
import { OrganSystemPicker } from "@/components/organ-system-picker";

export const metadata: Metadata = { title: "Identify typing (beta)" };

export default async function IdentifyAdminPage({
  searchParams,
}: PageProps<"/admin/identify">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin("/admin/identify");
  const [{ data: cards }, { data: organSystems }] = await Promise.all([
    supabase
      .from("id_cards")
      .select(
        "id, title, subject, image_path, is_published, id_card_labels(id, label_no, answer, is_published, id_card_label_organ_systems(organ_system_id))",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("organ_systems")
      .select("id, name_th, name_en")
      .order("position"),
  ]);
  const systems = organSystems ?? [];
  const systemName = new Map(systems.map((s) => [s.id, s.name_en]));
  const urls = await signQuestionImages(
    supabase,
    (cards ?? []).map((c) => c.image_path),
  );

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Identify typing</h1>
        <span className={badge.pink}>Beta</span>
        <Link href="/identify" className={`${btn.primary} ml-auto`}>
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
                  id={`card-${c.id}`}
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
                      <span
                        className={c.is_published ? badge.green : badge.gray}
                      >
                        {c.is_published ? "เผยแพร่" : "ร่าง"}
                      </span>
                    </div>
                    <details className="text-sm text-ink-2">
                      <summary className="cursor-pointer">
                        {c.id_card_labels.length} ข้อ · เปิด{" "}
                        {c.id_card_labels.filter((l) => l.is_published).length}
                        /{c.id_card_labels.length} · ติดระบบแล้ว{" "}
                        {
                          c.id_card_labels.filter(
                            (l) => l.id_card_label_organ_systems.length,
                          ).length
                        }
                      </summary>
                      <form
                        action={saveCardLabels}
                        className="mt-2 space-y-2"
                      >
                        <input type="hidden" name="card_id" value={c.id} />
                        <p className="text-xs">
                          ติ๊กช่องหน้าข้อ = เปิดให้นักศึกษาทำ · กดชื่อข้อเพื่อติดระบบอวัยวะ
                        </p>
                        <ol className="space-y-1">
                          {[...c.id_card_labels]
                            .sort((a, b) => a.label_no - b.label_no)
                            .map((l) => {
                              const tags = l.id_card_label_organ_systems.map(
                                (t) => t.organ_system_id,
                              );
                              return (
                                <li key={l.id} className="flex gap-2">
                                  <input
                                    type="checkbox"
                                    name="open"
                                    value={l.id}
                                    defaultChecked={l.is_published}
                                    aria-label={`เปิดข้อ ${l.label_no}`}
                                    className="mt-1"
                                  />
                                  <details className="min-w-0 flex-1">
                                    <summary className="cursor-pointer">
                                      <span
                                        className={
                                          l.is_published
                                            ? "text-ink"
                                            : "text-ink-2 line-through decoration-ink-2/40"
                                        }
                                      >
                                        {l.label_no}. {l.answer}
                                      </span>{" "}
                                      {tags.map((t) => (
                                        <span
                                          key={t}
                                          className={`${badge.gray} ml-1`}
                                        >
                                          {systemName.get(t)}
                                        </span>
                                      ))}
                                    </summary>
                                    <div className="py-2 pl-4">
                                      <OrganSystemPicker
                                        systems={systems}
                                        selected={tags}
                                        name={`organ_system:${l.id}`}
                                        legend={null}
                                      />
                                    </div>
                                  </details>
                                </li>
                              );
                            })}
                        </ol>
                        <button className={btn.secondary}>
                          บันทึก
                        </button>
                      </form>
                    </details>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/identify?card=${c.id}`}
                        className={btn.secondary}
                      >
                        เล่นการ์ดนี้
                      </Link>
                      <form action={setIdCardPublished}>
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="hidden"
                          name="publish"
                          value={String(!c.is_published)}
                        />
                        <button className={btn.secondary}>
                          {c.is_published ? "ซ่อน" : "เผยแพร่"}
                        </button>
                      </form>
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
        <CardForm organSystems={systems} />
      </div>
    </main>
  );
}
