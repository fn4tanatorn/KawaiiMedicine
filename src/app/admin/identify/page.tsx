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
  setIdCardOrganSystems,
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
        "id, title, subject, image_path, is_published, id_card_labels(label_no, answer), id_card_organ_systems(organ_system_id)",
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
                    {c.id_card_organ_systems.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.id_card_organ_systems.map((t) => (
                          <span key={t.organ_system_id} className={badge.gray}>
                            {systemName.get(t.organ_system_id)}
                          </span>
                        ))}
                      </div>
                    )}
                    <details className="text-sm text-ink-2">
                      <summary className="cursor-pointer">ระบบอวัยวะ</summary>
                      <form
                        action={setIdCardOrganSystems}
                        className="mt-2 space-y-2"
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <OrganSystemPicker
                          systems={systems}
                          selected={c.id_card_organ_systems.map(
                            (t) => t.organ_system_id,
                          )}
                        />
                        <button className={btn.secondary}>บันทึก</button>
                      </form>
                    </details>
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
