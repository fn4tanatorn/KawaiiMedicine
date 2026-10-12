import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { PACE_TARGET_PCT, coursePaces } from "@/lib/pace";
import { alert, badge, btn, card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PageTitle } from "@/components/page-title";
import { TopicIcon } from "@/components/topic-icon";
import {
  IconBook,
  IconExternalLink,
  IconFolder,
  IconGlobe,
  IconLink,
  IconMicroscope,
} from "@/components/icons";

export const metadata: Metadata = { title: "บทเรียนวิดีโอ" };

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

const CATEGORY_LABELS: Record<string, string> = {
  general: "ทั่วไป",
  slides: "สไลด์ / เอกสาร",
  atlas: "Atlas / กายวิภาค",
  tools: "เครื่องมือ / จำลองเสมือน",
  guidelines: "แนวทางเวชปฏิบัติ",
};

function safeHostname(urlStr: string) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { supabase, user } = await requireUser("/learn");
  const sp = await searchParams;
  const forbidden = sp.error === "forbidden";

  const [
    { data: courses },
    { data: progress },
    profile,
    { data: learningResources },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, slug, title, description, is_published, videos(id, is_published)",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("video_progress")
      .select("video_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true),
    getProfile(user.id),
    supabase
      .from("learning_resources")
      .select("*")
      .order("position", { ascending: true }),
  ]);

  const done = new Set((progress ?? []).map((p) => p.video_id));
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";
  const resources = (learningResources ?? []).filter(
    (r) => isStaff || r.is_published,
  );
  // Staff only: which courses' class average has reached the pace target,
  // so the next video can go out without opening each course to check.
  const paces = isStaff
    ? await coursePaces(
        supabase,
        (courses ?? []).map((c) => c.id),
      )
    : new Map();

  return (
    <main>
      <PageTitle
        icon={
          <Image
            src="/icons/books.png"
            alt=""
            width={40}
            height={40}
            className="object-contain"
          />
        }
        tint="brand"
        title="บทเรียนวิดีโอ"
        subtitle="เรียนรู้ได้ทุกที่ ทุกเวลา เสริมสร้างความรู้ทางการแพทย์"
      />
      {forbidden && (
        <p role="alert" className={`mt-4 ${alert.warn}`}>
          หน้าจัดการใช้ได้เฉพาะผู้สอน/ผู้ดูแลระบบเท่านั้น
        </p>
      )}

      {!courses?.length ? (
        <div className="mt-8">
          <EmptyState
            title="ยังไม่มีคอร์สที่เผยแพร่"
            description={
              isStaff
                ? "เริ่มสร้างคอร์สวิดีโอเพื่อแบ่งปันความรู้ให้กับผู้เรียนกันเลย!"
                : "รอผู้สอนเพิ่มคอร์สเข้ามา แล้วกลับมาดูใหม่อีกครั้งนะ"
            }
            action={
              isStaff && (
                <Link href="/admin/courses" className={btn.primary}>
                  + เพิ่มคอร์สแรก
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {courses.map((c, i) => {
            const vids = c.videos.filter((v) => v.is_published);
            const finished = vids.filter((v) => done.has(v.id)).length;
            const pct = vids.length
              ? Math.round((finished / vids.length) * 100)
              : 0;
            const pace = paces.get(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/learn/${c.slug}`}
                  className={`${card} flex h-full gap-4 hover:border-brand/40 ${
                    pace?.ready ? "ring-2 ring-mint" : ""
                  }`}
                >
                  <TopicIcon index={i} title={c.title} size={48} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{c.title}</h2>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-ink-2">
                      <span>{vids.length} วิดีโอ</span>
                      {vids.length > 0 && (
                        <span
                          className={pct === 100 ? badge.green : badge.gray}
                        >
                          {pct === 100
                            ? "เรียนจบแล้ว"
                            : `ดูแล้ว ${finished}/${vids.length}`}
                        </span>
                      )}
                    </div>
                    {vids.length > 0 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full bg-mint"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {pace && (
                      <p
                        className={`mt-3 text-xs ${
                          pace.ready ? "font-semibold text-mint" : "text-ink-2"
                        }`}
                      >
                        ทั้งห้องดูจบเฉลี่ย {pace.pct}% ({pace.active_students}{" "}
                        คน)
                        {pace.ready &&
                          ` · ถึงเป้า ${PACE_TARGET_PCT}% แล้ว พร้อมลงคลิปใหม่`}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Recommended Learning Resources Section (General external links hub on Dashboard) */}
      {(resources.length > 0 || isStaff) && (
        <section id="resources" className="mt-12 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span>แหล่งเรียนรู้แนะนำ</span>
              {resources.length > 0 && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-normal text-ink-2">
                  {resources.length} แหล่งข้อมูล
                </span>
              )}
            </h2>
            {isStaff && (
              <Link
                href="/admin/learning-links"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
              >
                <span>⚙ จัดการลิงก์</span>
              </Link>
            )}
          </div>

          {resources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-2">
              <p>ยังไม่มีแหล่งเรียนรู้แนะนำบน Dashboard</p>
              <Link
                href="/admin/learning-links"
                className={`${btn.secondary} mt-3 inline-block text-xs`}
              >
                + เพิ่มลิงก์แรก
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((res) => {
                const host = safeHostname(res.url);
                return (
                  <li key={res.id}>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${card} group flex h-full flex-col justify-between p-4 transition-all hover:border-brand/50 hover:shadow-soft`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-soft text-pink transition group-hover:scale-105 group-hover:bg-brand group-hover:text-white">
                            <ResourceIcon name={res.icon} className="h-4 w-4" />
                          </span>
                          <span className="flex items-center gap-1 text-xs text-ink-2 group-hover:text-brand">
                            <span>เปิด</span>
                            <IconExternalLink width={13} height={13} />
                          </span>
                        </div>
                        <h3 className="mt-3 line-clamp-1 text-sm font-semibold group-hover:text-brand">
                          {res.title}
                        </h3>
                        {res.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-2">
                            {res.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-ink-2">
                        <span className="rounded bg-surface-2 px-2 py-0.5">
                          {CATEGORY_LABELS[res.category] ?? res.category}
                        </span>
                        {host && (
                          <span className="max-w-[120px] truncate font-mono text-[10px] text-ink-2/70">
                            {host}
                          </span>
                        )}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
