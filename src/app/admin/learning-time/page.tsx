import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-user";
import { input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "เวลาเรียนต่อวิดีโอ" };

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

export default async function AdminLearningTimePage({
  searchParams,
}: PageProps<"/admin/learning-time">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("/admin/learning-time");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, videos(id, title, position, is_published)")
    .order("title");
  const courseId =
    typeof sp.course === "string" && courses?.some((c) => c.id === sp.course)
      ? sp.course
      : (courses?.[0]?.id ?? "");
  const course = courses?.find((c) => c.id === courseId);

  const { data: stats } = courseId
    ? await supabase.rpc("get_video_learning_time_stats", {
        p_course_id: courseId,
      })
    : { data: [] };
  const byVideo = new Map((stats ?? []).map((s) => [s.video_id, s]));
  const videos = [...(course?.videos ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">เวลาเรียนต่อวิดีโอ</h1>
        {courses && courses.length > 0 && (
          <form method="get" className="flex items-center gap-2 text-sm">
            <select name="course" defaultValue={courseId} className={input}>
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

      <div className="max-w-3xl space-y-1 text-sm text-ink-2">
        <p>
          <b className="text-ink">ช่วงเวลา</b> = วันที่ดูจบ −
          วันที่เปิดดูครั้งแรก + 1 (ดูจบวันเดียวกัน = 1 วัน) ·{" "}
          <b className="text-ink">วันที่เข้ามาดู</b> =
          จำนวนวันที่เข้ามาดูวิดีโอนี้จนถึงวันที่ดูจบ
        </p>
        <p>
          แสดงเป็น <b className="text-ink">มัธยฐาน</b> / เฉลี่ย (วัน, เวลาไทย)
          นับเฉพาะนักเรียน ไม่นับเจ้าหน้าที่ ·
          เริ่มเก็บข้อมูลตั้งแต่วันที่เปิดใช้ฟีเจอร์นี้
          คนที่ดูจบก่อนหน้านั้นจะไม่ถูกนับ
        </p>
      </div>

      {!course || videos.length === 0 ? (
        <EmptyState mood="sleepy" title="ยังไม่มีวิดีโอ" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-ink-2">
              <tr>
                <th className="px-4 py-2 font-medium">วิดีโอ</th>
                <th className="px-4 py-2 text-right font-medium">ดูจบ (คน)</th>
                <th className="px-4 py-2 text-right font-medium">
                  กำลังดู (คน)
                </th>
                <th className="px-4 py-2 text-right font-medium">ช่วงเวลา</th>
                <th className="px-4 py-2 text-right font-medium">
                  วันที่เข้ามาดู
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {videos.map((v, i) => {
                const s = byVideo.get(v.id);
                return (
                  <tr key={v.id} className="hover:bg-surface-2">
                    <td className="px-4 py-2">
                      <span className="text-ink-2">{i + 1}. </span>
                      {v.title}
                      {!v.is_published && (
                        <span className="text-xs text-muted"> (ฉบับร่าง)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {s?.completed_count ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {s?.in_progress_count ?? 0}
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
          </table>
        </div>
      )}
    </main>
  );
}
