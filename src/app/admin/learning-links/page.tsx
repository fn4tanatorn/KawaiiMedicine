import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-user";
import { badge, btn, card, input, label } from "@/components/ui";
import { Flash } from "@/components/flash";
import { ConfirmButton } from "@/components/confirm-button";
import {
  IconBookmark,
  IconExternalLink,
  IconFolder,
  IconGlobe,
  IconLink,
  IconMicroscope,
  IconBook,
} from "@/components/icons";
import {
  createLearningResource,
  updateLearningResource,
  deleteLearningResource,
  moveLearningResource,
} from "./actions";

export const metadata: Metadata = { title: "จัดการแหล่งเรียนรู้ภายนอก" };

function ResourceIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  switch (name) {
    case "drive":
    case "folder":
      return <IconFolder className={className} />;
    case "microscope":
      return <IconMicroscope className={className} />;
    case "globe":
      return <IconGlobe className={className} />;
    case "book":
      return <IconBook className={className} />;
    default:
      return <IconLink className={className} />;
  }
}

const CATEGORIES = [
  { value: "general", label: "ทั่วไป" },
  { value: "slides", label: "สไลด์ / เอกสาร (Drive)" },
  { value: "atlas", label: "Atlas / กายวิภาคศาสตร์" },
  { value: "tools", label: "เครื่องมือ / กล้องเสมือน (Virtual Microscope)" },
  { value: "guidelines", label: "แนวทางเวชปฏิบัติ (CPG)" },
];

const ICONS = [
  { value: "link", label: "ลิงก์ภายนอก" },
  { value: "drive", label: "Drive / โฟลเดอร์" },
  { value: "microscope", label: "กล้องจุลทรรศน์ / พยาธิ" },
  { value: "globe", label: "เว็บ / ฐานข้อมูล" },
  { value: "book", label: "หนังสือ / วารสาร" },
];

export default async function AdminLearningLinksPage({
  searchParams,
}: PageProps<"/admin/learning-links">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("/admin/learning-links");

  const { data: resources } = await supabase
    .from("learning_resources")
    .select("*")
    .order("position", { ascending: true });

  const items = resources ?? [];

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">ลิงก์แหล่งเรียนรู้ภายนอก</h1>
        <p className="mt-1 text-sm text-ink-2">
          รวมลิงก์ประกอบการเรียนรู้ (Google Drive, Histology Guide, Radiopaedia,
          แนวทางเวชปฏิบัติ ฯลฯ) ที่แสดงบนหน้าแรกบทเรียน (/learn) ของนักเรียน
        </p>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* List of current learning resources */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              รายการแหล่งเรียนรู้ ({items.length})
            </h2>
            <a
              href="/learn#resources"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              ดูหน้า Dashboard ผู้เรียน{" "}
              <IconExternalLink width={12} height={12} />
            </a>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-ink-2">
              ยังไม่มีลิงก์แหล่งเรียนรู้ เพิ่มลิงก์แรกจากแบบฟอร์มด้านขวา
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((item, idx) => (
                <li key={item.id} className={card}>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 w-6 text-sm font-medium text-ink-2">
                      {idx + 1}.
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink">
                          <ResourceIcon name={item.icon} className="h-4 w-4" />
                        </span>
                        <span className="max-w-sm truncate font-medium">
                          {item.title}
                        </span>
                        <span
                          className={
                            item.is_published ? badge.green : badge.gray
                          }
                        >
                          {item.is_published ? "เผยแพร่" : "ฉบับร่าง"}
                        </span>
                        <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
                          {CATEGORIES.find((c) => c.value === item.category)
                            ?.label ?? item.category}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-ink-2">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-md items-center gap-1 truncate text-brand hover:underline"
                        >
                          {item.url} <IconExternalLink width={12} height={12} />
                        </a>
                      </div>

                      {/* Edit form in details */}
                      <details className="mt-3 border-t border-line/60 pt-2">
                        <summary className="cursor-pointer text-xs font-medium text-ink-2 hover:text-ink">
                          แก้ไขข้อมูล
                        </summary>
                        <form
                          action={updateLearningResource}
                          className="mt-3 space-y-3"
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <label className={label}>
                            <span>ชื่อแหล่งเรียนรู้</span>
                            <input
                              name="title"
                              defaultValue={item.title}
                              required
                              className={input}
                            />
                          </label>

                          <label className={label}>
                            <span>URL (ลิงก์ภายนอก)</span>
                            <input
                              name="url"
                              type="url"
                              defaultValue={item.url}
                              required
                              className={input}
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <label className={label}>
                              <span>หมวดหมู่</span>
                              <select
                                name="category"
                                defaultValue={item.category}
                                className={input}
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className={label}>
                              <span>ไอคอน</span>
                              <select
                                name="icon"
                                defaultValue={item.icon}
                                className={input}
                              >
                                {ICONS.map((ic) => (
                                  <option key={ic.value} value={ic.value}>
                                    {ic.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label className={label}>
                            <span>คำอธิบายเพิ่มเติม (ไม่บังคับ)</span>
                            <textarea
                              name="description"
                              rows={2}
                              defaultValue={item.description ?? ""}
                              className={input}
                            />
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="is_published"
                              defaultChecked={item.is_published}
                            />{" "}
                            เผยแพร่ให้นักเรียนเห็นบน Dashboard
                          </label>

                          <div className="flex justify-end pt-1">
                            <button type="submit" className={btn.secondary}>
                              บันทึกการแก้ไข
                            </button>
                          </div>
                        </form>
                      </details>
                    </div>

                    {/* Actions: Reorder & Delete */}
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={moveLearningResource}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="dir" value="up" />
                        <button
                          disabled={idx === 0}
                          className="rounded px-2 py-1 text-sm hover:bg-surface-2 disabled:opacity-30"
                          aria-label="เลื่อนขึ้น"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveLearningResource}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="dir" value="down" />
                        <button
                          disabled={idx === items.length - 1}
                          className="rounded px-2 py-1 text-sm hover:bg-surface-2 disabled:opacity-30"
                          aria-label="เลื่อนลง"
                        >
                          ↓
                        </button>
                      </form>
                      <form action={deleteLearningResource}>
                        <input type="hidden" name="id" value={item.id} />
                        <ConfirmButton
                          message={`ลบแหล่งเรียนรู้ "${item.title}"?`}
                          className="rounded px-2 py-1 text-sm text-danger hover:bg-danger-soft"
                        >
                          ลบ
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Create new learning resource panel */}
        <aside className="space-y-6">
          <section className={card}>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <IconBookmark className="h-4 w-4" />
              </span>
              <h2 className="font-semibold">เพิ่มลิงก์แหล่งเรียนรู้ใหม่</h2>
            </div>

            <form action={createLearningResource} className="mt-4 space-y-3">
              <label className={label}>
                <span>ชื่อแหล่งเรียนรู้ / เอกสาร</span>
                <input
                  name="title"
                  required
                  placeholder="เช่น สไลด์ฉบับเต็มบน Google Drive"
                  className={input}
                />
              </label>

              <label className={label}>
                <span>URL (ลิงก์)</span>
                <input
                  name="url"
                  type="url"
                  required
                  placeholder="https://drive.google.com/..."
                  className={input}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className={label}>
                  <span>หมวดหมู่</span>
                  <select
                    name="category"
                    defaultValue="general"
                    className={input}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={label}>
                  <span>ไอคอน</span>
                  <select name="icon" defaultValue="link" className={input}>
                    {ICONS.map((ic) => (
                      <option key={ic.value} value={ic.value}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={label}>
                <span>คำอธิบายย่อ (ไม่บังคับ)</span>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="เช่น รวมภาพสไลด์ Gross และ Microscopic ความละเอียดสูง"
                  className={input}
                />
              </label>

              <label className="flex items-center gap-2 pt-1 text-sm">
                <input type="checkbox" name="is_published" defaultChecked />{" "}
                เผยแพร่ทันที
              </label>

              <button type="submit" className={`${btn.primary} mt-2 w-full`}>
                + เพิ่มแหล่งเรียนรู้
              </button>
            </form>
          </section>

          <div className="space-y-1.5 rounded-xl border border-line bg-surface-2/40 p-4 text-xs text-ink-2">
            <p className="font-semibold text-ink">💡 แนะนำการใช้งาน</p>
            <p>
              • <strong>Google Drive:</strong> ใช้สำหรับสไลด์ขนาดใหญ่เกิน 50MB
              หรือไฟล์ PDF อัปเดตบ่อย
            </p>
            <p>
              • <strong>Virtual Microscope:</strong> เช่น Histology Guide,
              WebMic สำหรับวิชาจุลกายวิภาค
            </p>
            <p>
              • <strong>Radiology:</strong> เช่น Radiopaedia สำหรับภาพรังสีวิทยา
              CT/MRI
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
