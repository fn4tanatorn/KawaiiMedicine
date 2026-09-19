import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-user";
import { card, input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { pct } from "@/lib/format";

export const metadata: Metadata = { title: "เวลาเรียนต่อวิดีโอ" };

const ALL = "all";

/** Stats columns are null when nobody has finished the video yet (the generated type says number). */
function days(median: number | null, avg: number | null) {
  if (median == null || avg == null)
    return <span className="text-muted">-</span>;
  return (
    <>
      <span className="font-medium">{median}</span>
      <span className="text-ink-2"> / {avg}</span>
    </>
  );
}

const bangkokDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
});
const shortDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Bangkok",
});

/** "17 ก.ย. · 3 วันก่อน", counted in Bangkok calendar days. */
function published(iso: string | null) {
  if (!iso) return <span className="text-muted">-</span>;
  const d = new Date(iso);
  const ago = Math.round(
    (Date.parse(bangkokDay.format(new Date())) -
      Date.parse(bangkokDay.format(d))) /
      86_400_000,
  );
  return (
    <>
      {shortDate.format(d)}
      <span className="text-ink-2">
        {" "}
        · {ago === 0 ? "วันนี้" : `${ago} วันก่อน`}
      </span>
    </>
  );
}

export default async function AdminLearningTimePage({
  searchParams,
}: PageProps<"/admin/learning-time">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("/admin/learning-time");

  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, title, videos(id, title, position, is_published, published_at)",
    )
    .order("title");
  const courseId =
    typeof sp.course === "string" && courses?.some((c) => c.id === sp.course)
      ? sp.course
      : ALL;
  const scope = courseId === ALL ? undefined : courseId;

  const [{ data: stats }, { data: summaryRows }] = await Promise.all([
    supabase.rpc("get_video_learning_time_stats", { p_course_id: scope }),
    supabase.rpc("get_video_progress_summary", { p_course_id: scope }),
  ]);
  const summary = summaryRows?.[0];
  const students = summary?.students ?? 0;
  const byVideo = new Map((stats ?? []).map((s) => [s.video_id, s]));

  // Videos in position order; in the all-courses view, courses are ordered by
  // when their first video went out so the list reads as a timeline.
  // Courses with nothing published yet go last.
  const firstPublished = (c: NonNullable<typeof courses>[number]) =>
    c.videos
      .map((v) => v.published_at)
      .filter((p): p is string => p != null)
      .sort()[0];
  const byFirstPublished = (
    a: NonNullable<typeof courses>[number],
    b: NonNullable<typeof courses>[number],
  ) => {
    const pa = firstPublished(a);
    const pb = firstPublished(b);
    if (!pa || !pb) return pa ? -1 : pb ? 1 : 0;
    return pa.localeCompare(pb);
  };
  const groups = (courses ?? [])
    .filter((c) => courseId === ALL || c.id === courseId)
    .sort(byFirstPublished)
    .map((c) => ({
      ...c,
      videos: [...c.videos].sort((a, b) => a.position - b.position),
    }))
    .filter((c) => c.videos.length > 0);

  const tiles = summary
    ? [
        { label: "วิดีโอที่ลงแล้ว", value: `${summary.published_videos}` },
        {
          label: "ดูจบเฉลี่ย (คลิป)",
          value: `${summary.avg_completed} / ${summary.published_videos}`,
          note: `${pct(summary.avg_completed, summary.published_videos)}%`,
        },
        {
          label: "ดูจบ มัธยฐาน (คลิป)",
          value: `${summary.median_completed} / ${summary.published_videos}`,
          note: `${pct(summary.median_completed, summary.published_videos)}%`,
        },
        {
          label: "ยังไม่เริ่มดูเลย (คน)",
          value: `${summary.not_started_students} / ${students}`,
          note: `${pct(summary.not_started_students, students)}%`,
        },
      ]
    : [];

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">เวลาเรียนต่อวิดีโอ</h1>
        {courses && courses.length > 0 && (
          <form method="get" className="flex items-center gap-2 text-sm">
            <select name="course" defaultValue={courseId} className={input}>
              <option value={ALL}>ทุกคอร์ส</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-2 hover:bg-surface-2"
            >
              ดู
            </button>
          </form>
        )}
      </div>

      {tiles.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.label} className={card}>
              <p className="text-xs text-ink-2">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold">
                {t.value}
                {t.note && (
                  <span className="ml-2 text-sm font-normal text-ink-2">
                    {t.note}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="max-w-3xl space-y-1 text-sm text-ink-2">
        <p>
          คิดจากนักเรียนทั้งหมด {students} คน (ไม่นับเจ้าหน้าที่)
          และวิดีโอที่นักเรียนเห็นได้ (วิดีโอและคอร์สเผยแพร่แล้ว) ·{" "}
          <b className="text-ink">ดูจบ</b>{" "}
          นับรวมคนที่ดูจบก่อนเปิดใช้สถิติเวลาเรียน
        </p>
        <p>
          <b className="text-ink">ช่วงเวลา</b> = วันที่ดูจบ −
          วันที่เปิดดูครั้งแรก + 1 (ดูจบวันเดียวกัน = 1 วัน) ·{" "}
          <b className="text-ink">วันที่เข้ามาดู</b> =
          จำนวนวันที่เข้ามาดูวิดีโอนี้จนถึงวันที่ดูจบ · แสดงเป็น{" "}
          <b className="text-ink">มัธยฐาน</b> / เฉลี่ย (วัน, เวลาไทย)
          นับเฉพาะคนที่ดูจบตั้งแต่ 17 ก.ย. 2569
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState mood="sleepy" title="ยังไม่มีวิดีโอ" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-ink-2">
              <tr>
                <th className="px-4 py-2 font-medium">วิดีโอ</th>
                <th className="px-4 py-2 font-medium whitespace-nowrap">
                  ลงเมื่อ
                </th>
                <th className="px-4 py-2 text-right font-medium">ดูจบ</th>
                <th className="px-4 py-2 text-right font-medium">
                  กำลังดู (คน)
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  ยังไม่เปิด (คน)
                </th>
                <th className="px-4 py-2 text-right font-medium">ช่วงเวลา</th>
                <th className="px-4 py-2 text-right font-medium">
                  วันที่เข้ามาดู
                </th>
              </tr>
            </thead>
            {groups.map((c) => (
              <tbody
                key={c.id}
                className="divide-y divide-line border-t border-line"
              >
                {courseId === ALL && (
                  <tr className="bg-surface-2/50">
                    <th
                      colSpan={7}
                      className="px-4 py-2 text-left text-xs font-semibold text-ink"
                    >
                      {c.title}
                    </th>
                  </tr>
                )}
                {c.videos.map((v, i) => {
                  const s = byVideo.get(v.id);
                  const finished = s?.finished_count ?? 0;
                  const inProgress = s?.in_progress_count ?? 0;
                  return (
                    <tr key={v.id} className="hover:bg-surface-2">
                      <td className="px-4 py-2">
                        <span className="text-ink-2">{i + 1}. </span>
                        {v.title}
                        {!v.is_published && (
                          <span className="text-xs text-muted">
                            {" "}
                            (ฉบับร่าง)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {published(v.published_at)}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <span className="font-medium">
                          {pct(finished, students)}%
                        </span>
                        <span className="text-ink-2">
                          {" "}
                          ({finished}/{students})
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{inProgress}</td>
                      <td className="px-4 py-2 text-right">
                        {Math.max(students - finished - inProgress, 0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {days(
                          s?.median_span_days ?? null,
                          s?.avg_span_days ?? null,
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {days(
                          s?.median_active_days ?? null,
                          s?.avg_active_days ?? null,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </main>
  );
}
