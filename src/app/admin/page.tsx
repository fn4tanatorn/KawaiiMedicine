import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { card } from "@/components/ui";

export const metadata: Metadata = { title: "จัดการระบบ" };

export default async function AdminHome() {
  const { supabase, role } = await requireStaff("/admin");

  const [
    courses,
    videos,
    exams,
    attempts,
    students,
    examFeedback,
    courseFeedback,
    openReports,
    menuClicks,
    learningResources,
  ] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("videos").select("id", { count: "exact", head: true }),
    supabase.from("exams").select("id", { count: "exact", head: true }),
    supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .not("submitted_at", "is", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("exam_feedback").select("id", { count: "exact", head: true }),
    supabase
      .from("course_feedback")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("video_issue_reports")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
    supabase
      .from("menu_click_events")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("learning_resources")
      .select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "คอร์ส", value: courses.count ?? 0, href: "/admin/courses" },
    { label: "วิดีโอ", value: videos.count ?? 0, href: "/admin/courses" },
    {
      label: "ลิงก์เรียนรู้",
      value: learningResources.count ?? 0,
      href: "/admin/learning-links",
    },
    { label: "ข้อสอบ", value: exams.count ?? 0, href: "/admin/exams" },
    {
      label: "ครั้งที่ส่งสอบ",
      value: attempts.count ?? 0,
      href: "/admin/results",
    },
    { label: "ผู้ใช้", value: students.count ?? 0, href: "/admin/users" },
    {
      label: "Feedback",
      value: (examFeedback.count ?? 0) + (courseFeedback.count ?? 0),
      href: "/admin/feedback",
    },
    {
      label: "ปัญหาวิดีโอ",
      value: openReports.count ?? 0,
      href: "/admin/video-reports",
    },
    {
      label: "สถิติเมนู",
      value: menuClicks.count ?? 0,
      href: "/admin/menu-usage",
    },
  ];

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">ภาพรวม</h1>
        <p className="mt-1 text-sm text-ink-2">
          บทบาทของคุณ: {role === "admin" ? "ผู้ดูแลระบบ" : "ผู้สอน"}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`${card} block hover:border-brand/40`}
            >
              <p className="text-xs text-ink-2">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
