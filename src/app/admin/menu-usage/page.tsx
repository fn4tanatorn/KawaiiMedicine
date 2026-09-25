import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatRelativeTime, pct } from "@/lib/format";
import { badge, card } from "@/components/ui";
import {
  IconChart,
  IconClock,
  IconCoffee,
  IconExam,
  IconPlay,
  IconPointer,
  IconSettings,
  IconTarget,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "สถิติการใช้งานเมนู (Menu Usage Tracking)",
};

type MenuMeta = {
  label: string;
  href: string;
  description: string;
  iconNode: React.ReactNode;
};

const KNOWN_MENUS: Record<string, MenuMeta> = {
  learn: {
    label: "บทเรียนวิดีโอ",
    href: "/learn",
    description: "คอร์สเรียนวิดีโอทางการแพทย์และระบบติดตามความคืบหน้า",
    iconNode: <IconPlay width={18} height={18} />,
  },
  exam: {
    label: "ข้อสอบ",
    href: "/exam",
    description: "ชุดข้อสอบทางการแพทย์ (MCQ) พร้อมเฉลยและเกรด",
    iconNode: <IconExam width={18} height={18} />,
  },
  identify: {
    label: "Identify",
    href: "/identify",
    description: "มินิเกมทายภาพกายวิภาคและพยาธิวิทยา (Netter Flashcards)",
    iconNode: <IconTarget width={18} height={18} />,
  },
  lounge: {
    label: "มุมพักใจ",
    href: "/lounge",
    description: "กระดานส่งกำลังใจแบบนิรนามและปุ่มกดส่งความรู้สึก",
    iconNode: <IconCoffee width={18} height={18} />,
  },
  admin: {
    label: "จัดการระบบ",
    href: "/admin",
    description: "แผงควบคุมระบบสำหรับผู้สอนและผู้ดูแลระบบ",
    iconNode: <IconSettings width={18} height={18} />,
  },
};

type PageProps = {
  searchParams: Promise<{ days?: string }>;
};

export default async function AdminMenuUsagePage({ searchParams }: PageProps) {
  const { supabase } = await requireStaff("/admin/menu-usage");
  const { days: daysParam } = await searchParams;

  const days =
    daysParam === "all"
      ? null
      : daysParam === "7"
        ? 7
        : daysParam === "14"
          ? 14
          : 30;

  const [
    statsRes,
    totalAllRes,
    recentRes,
    videoProgressRes,
    examAttemptsRes,
    identifyAnswersRes,
    loungePostsRes,
    loungeReactionsRes,
  ] = await Promise.all([
    supabase.rpc("get_menu_usage_stats", {
      p_days: days ?? undefined,
    }),
    supabase.from("menu_click_events").select("id", { count: "exact", head: true }),
    supabase
      .from("menu_click_events")
      .select(
        "id, menu_key, path, source, created_at, profiles(full_name, email, role, line_name)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("video_progress").select("id", { count: "exact", head: true }),
    supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .not("submitted_at", "is", null),
    supabase.from("id_answers").select("id", { count: "exact", head: true }),
    supabase.from("lounge_posts").select("id", { count: "exact", head: true }),
    supabase.from("lounge_reactions").select("id", { count: "exact", head: true }),
  ]);

  const stats = statsRes.data ?? [];
  const recentClicks = recentRes.data ?? [];

  // Total student clicks in this selected timeframe
  const totalStudentClicks = stats.reduce(
    (acc, row) => acc + (row.student_clicks ?? 0),
    0,
  );

  // Map known menus to ensure menus with 0 clicks are not omitted
  const menuMap = new Map<
    string,
    {
      menu_key: string;
      label: string;
      href: string;
      description: string;
      iconNode: React.ReactNode;
      total_clicks: number;
      student_clicks: number;
      unique_students: number;
      last_clicked_at: string | null;
    }
  >();

  // Initialize with known student-facing and admin menus
  for (const [key, meta] of Object.entries(KNOWN_MENUS)) {
    menuMap.set(key, {
      menu_key: key,
      label: meta.label,
      href: meta.href,
      description: meta.description,
      iconNode: meta.iconNode,
      total_clicks: 0,
      student_clicks: 0,
      unique_students: 0,
      last_clicked_at: null,
    });
  }

  // Merge database stats
  for (const row of stats) {
    const existing = menuMap.get(row.menu_key);
    if (existing) {
      existing.total_clicks = row.total_clicks;
      existing.student_clicks = row.student_clicks;
      existing.unique_students = row.unique_students;
      existing.last_clicked_at = row.last_clicked_at;
    } else {
      menuMap.set(row.menu_key, {
        menu_key: row.menu_key,
        label: row.menu_key,
        href: `/${row.menu_key}`,
        description: `เมนู /${row.menu_key}`,
        iconNode: <IconPointer width={18} height={18} />,
        total_clicks: row.total_clicks,
        student_clicks: row.student_clicks,
        unique_students: row.unique_students,
        last_clicked_at: row.last_clicked_at,
      });
    }
  }

  // Convert to array and sort by student clicks descending
  const sortedMenus = Array.from(menuMap.values()).sort(
    (a, b) => b.student_clicks - a.student_clicks,
  );

  // Identify top menu & least used student menu (excluding admin)
  const studentFacingMenus = sortedMenus.filter((m) => m.menu_key !== "admin");
  const topMenu = studentFacingMenus[0];
  const lowestMenu = studentFacingMenus[studentFacingMenus.length - 1];

  const timeLabel =
    days === null
      ? "ตลอดกาล (All-time)"
      : days === 7
        ? "7 วันล่าสุด"
        : days === 14
          ? "14 วันล่าสุด"
          : "30 วันล่าสุด";

  return (
    <main className="space-y-8">
      {/* Header and timeframe filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">สถิติการใช้งานเมนู (Menu Usage)</h1>
          <p className="mt-1 text-sm text-ink-2">
            วิเคราะห์ความถี่การคลิกและผู้ใช้งานจริง เพื่อประเมินว่าเมนูใดควรเก็บไว้หรือถอนออก ({timeLabel})
          </p>
        </div>

        {/* Filter pills */}
        <div className="inline-flex rounded-pill border border-line bg-surface/80 p-1 shadow-soft text-xs font-medium">
          <Link
            href="/admin/menu-usage?days=7"
            className={`rounded-pill px-3 py-1.5 transition ${
              days === 7
                ? "bg-brand text-brand-ink font-semibold"
                : "text-ink-2 hover:text-ink hover:bg-surface-2"
            }`}
          >
            7 วัน
          </Link>
          <Link
            href="/admin/menu-usage?days=14"
            className={`rounded-pill px-3 py-1.5 transition ${
              days === 14
                ? "bg-brand text-brand-ink font-semibold"
                : "text-ink-2 hover:text-ink hover:bg-surface-2"
            }`}
          >
            14 วัน
          </Link>
          <Link
            href="/admin/menu-usage?days=30"
            className={`rounded-pill px-3 py-1.5 transition ${
              days === 30
                ? "bg-brand text-brand-ink font-semibold"
                : "text-ink-2 hover:text-ink hover:bg-surface-2"
            }`}
          >
            30 วัน
          </Link>
          <Link
            href="/admin/menu-usage?days=all"
            className={`rounded-pill px-3 py-1.5 transition ${
              days === null
                ? "bg-brand text-brand-ink font-semibold"
                : "text-ink-2 hover:text-ink hover:bg-surface-2"
            }`}
          >
            ทั้งหมด
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={card}>
          <div className="flex items-center justify-between text-ink-2">
            <span className="text-xs">คลิกจากนักเรียน</span>
            <IconPointer width={16} height={16} />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{totalStudentClicks}</p>
          <p className="mt-1 text-xs text-ink-2">
            คลิกรวมทั้งหมด: {totalAllRes.count ?? 0} ครั้ง
          </p>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between text-ink-2">
            <span className="text-xs">เมนูที่ติดตาม</span>
            <IconChart width={16} height={16} />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{sortedMenus.length}</p>
          <p className="mt-1 text-xs text-ink-2">เมนูหลักในระบบ</p>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between text-ink-2">
            <span className="text-xs">เมนูยอดนิยม</span>
            <span className={badge.green}>อันดับ 1</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink truncate">
            {topMenu && topMenu.student_clicks > 0 ? topMenu.label : "-"}
          </p>
          <p className="mt-1 text-xs text-ink-2 truncate">
            {topMenu && topMenu.student_clicks > 0
              ? `${topMenu.student_clicks} คลิก (${pct(topMenu.student_clicks, totalStudentClicks)}%)`
              : "ยังไม่มีข้อมูลคลิก"}
          </p>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between text-ink-2">
            <span className="text-xs">ใช้น้อยที่สุด</span>
            <span className={lowestMenu && lowestMenu.student_clicks === 0 ? badge.red : badge.amber}>
              เฝ้าระวัง
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink truncate">
            {lowestMenu ? lowestMenu.label : "-"}
          </p>
          <p className="mt-1 text-xs text-ink-2 truncate">
            {lowestMenu
              ? `${lowestMenu.student_clicks} คลิก (${lowestMenu.unique_students} คน)`
              : "-"}
          </p>
        </div>
      </div>

      {/* Main Analysis Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">การจัดอันดับและประเมินสถานะของแต่ละเมนู</h2>
            <p className="text-xs text-ink-2">
              ประเมินจากสัดส่วนการคลิก (Click Share) และจำนวนนักเรียนที่เข้าใช้งานจริง (Unique Students)
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs font-medium text-ink-2">
                <tr>
                  <th className="px-4 py-3">เมนู</th>
                  <th className="px-4 py-3 text-right">ยอดคลิกนักเรียน</th>
                  <th className="px-4 py-3">สัดส่วนการคลิก</th>
                  <th className="px-4 py-3 text-right">จำนวนนักเรียน (Unique)</th>
                  <th className="px-4 py-3">สถานะประเมิน</th>
                  <th className="px-4 py-3">ใช้งานล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sortedMenus.map((menu) => {
                  const share = pct(menu.student_clicks, totalStudentClicks);

                  // Evaluation status
                  let statusBadge = (
                    <span className={badge.green}>🟢 ยอดนิยม</span>
                  );
                  let statusDesc = "มีการเข้าถึงสม่ำเสมอ";

                  if (menu.menu_key === "admin") {
                    statusBadge = <span className={badge.gray}>Staff Only</span>;
                    statusDesc = "เฉพาะทีมงาน";
                  } else if (menu.student_clicks === 0) {
                    statusBadge = (
                      <span className={badge.red}>🔴 เสี่ยงถูกถอน</span>
                    );
                    statusDesc = "ไม่มีนักเรียนกดในรอบนี้";
                  } else if (share < 10 || menu.unique_students <= 1) {
                    statusBadge = (
                      <span className={badge.amber}>🟡 การใช้งานต่ำ</span>
                    );
                    statusDesc = "ควรติดตามหรือรวมกลุ่ม";
                  } else if (share < 25) {
                    statusBadge = (
                      <span className={badge.blue}>🔵 ปานกลาง</span>
                    );
                    statusDesc = "มีผู้ใช้ประจำกลุ่มหนึ่ง";
                  }

                  return (
                    <tr key={menu.menu_key} className="hover:bg-surface-2/60 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
                            {menu.iconNode}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">
                                {menu.label}
                              </span>
                              <Link
                                href={menu.href}
                                target="_blank"
                                className="text-xs text-ink-2 hover:text-brand hover:underline"
                              >
                                {menu.href}
                              </Link>
                            </div>
                            <p className="text-xs text-ink-2">{menu.description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-ink">
                        {menu.student_clicks} ครั้ง
                        {menu.total_clicks > menu.student_clicks && (
                          <span className="block text-xs font-normal text-ink-2">
                            (+{menu.total_clicks - menu.student_clicks} จาก Staff)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink">{share}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                            <div
                              className="h-full rounded-full bg-brand transition-all duration-500"
                              style={{ width: `${Math.max(share, 3)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-ink">
                        {menu.unique_students} คน
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {statusBadge}
                          <p className="text-xs text-ink-2">{statusDesc}</p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-ink-2 whitespace-nowrap">
                        {menu.last_clicked_at
                          ? formatRelativeTime(menu.last_clicked_at)
                          : "ยังไม่มีประวัติ"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Feature Conversion Comparison: Clicks vs In-depth usage */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            การใช้งานจริงเชิงลึกในแต่ละฟีเจอร์ (Feature Conversion)
          </h2>
          <p className="text-xs text-ink-2">
            เปรียบเทียบการคลิกเข้าเมนูกับการมีส่วนร่วมจริงภายในฟีเจอร์นั้น เพื่อแยกว่าคนแค่กดสำรวจ หรือใช้งานต่อเนื่อง
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={card}>
            <div className="flex items-center gap-2 text-ink font-semibold">
              <IconPlay width={18} height={18} className="text-brand" />
              <span>บทเรียนวิดีโอ</span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>ยอดคลิกเข้าเมนู:</span>
                <span className="font-medium text-ink">
                  {menuMap.get("learn")?.student_clicks ?? 0} ครั้ง
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>บันทึกการเรียนวิดีโอ:</span>
                <span className="font-semibold text-mint">
                  {videoProgressRes.count ?? 0} ครั้ง
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-2 border-t border-line pt-2">
              สะท้อนการเรียนจริงจากตาราง video_progress
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center gap-2 text-ink font-semibold">
              <IconExam width={18} height={18} className="text-pink" />
              <span>ข้อสอบ (MCQ)</span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>ยอดคลิกเข้าเมนู:</span>
                <span className="font-medium text-ink">
                  {menuMap.get("exam")?.student_clicks ?? 0} ครั้ง
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>การส่งข้อสอบสำเร็จ:</span>
                <span className="font-semibold text-pink">
                  {examAttemptsRes.count ?? 0} ครั้ง
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-2 border-t border-line pt-2">
              จำนวนครั้งที่มีการทำข้อสอบและกดส่งตรวจ
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center gap-2 text-ink font-semibold">
              <IconTarget width={18} height={18} className="text-lemon" />
              <span>Identify</span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>ยอดคลิกเข้าเมนู:</span>
                <span className="font-medium text-ink">
                  {menuMap.get("identify")?.student_clicks ?? 0} ครั้ง
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>จำนวนข้อที่ตอบจริง:</span>
                <span className="font-semibold text-lemon">
                  {identifyAnswersRes.count ?? 0} ข้อ
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-2 border-t border-line pt-2">
              ประเมินว่านักเรียนเข้าฝึกตอบภาพ Flashcards มากน้อยเพียงใด
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center gap-2 text-ink font-semibold">
              <IconCoffee width={18} height={18} className="text-lavender" />
              <span>มุมพักใจ</span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>ยอดคลิกเข้าเมนู:</span>
                <span className="font-medium text-ink">
                  {menuMap.get("lounge")?.student_clicks ?? 0} ครั้ง
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>โพสต์ / ส่งความรู้สึก:</span>
                <span className="font-semibold text-ink">
                  {(loungePostsRes.count ?? 0) + (loungeReactionsRes.count ?? 0)} ครั้ง
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-2 border-t border-line pt-2">
              มีส่วนร่วมส่งกำลังใจและกด Reaction นิรนาม
            </p>
          </div>
        </div>
      </section>

      {/* Decision Guide: When and how to retire a menu */}
      <section className="rounded-xl border border-line bg-surface-2/40 p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-ink">
          💡 เกณฑ์แนะนำในการพิจารณา &quot;ถอนเมนูออก&quot;
        </h3>
        <ul className="text-xs text-ink-2 space-y-1.5 list-disc pl-5 leading-relaxed">
          <li>
            <strong className="text-ink">ดูจำนวนคน (Unique Students) เป็นหลัก:</strong> หลีกเลี่ยงการดูเฉพาะยอดคลิกรวม เพราะอาจเกิดจากนักเรียนคนเดียวคลิกซ้ำหลายครั้ง
          </li>
          <li>
            <strong className="text-ink">ตรวจวัด Conversion ภายใน:</strong> หากมียอดคลิกเข้าสูง แต่ตัวเลขกิจกรรมจริงภายในต่ำมาก (เช่น คลิก Identify แต่ไม่มีการกดตอบ) อาจเป็นเพราะผู้ใช้สับสนชื่อเมนู หรือรูปแบบยังไม่ตอบโจทย์
          </li>
          <li>
            <strong className="text-ink">แนวทางลดทอนอย่างนุ่มนวล:</strong> ก่อนถอดเมนูทิ้งอย่างถาวร แนะนำให้ลองย้ายไปอยู่ในเมนูย่อย หรือรวมหมวดหมู่เข้ากับเมนูที่เกี่ยวข้องก่อน 2–4 สัปดาห์
          </li>
          <li>
            <strong className="text-ink">ให้เวลาประเมินอย่างน้อย 14–30 วัน:</strong> ฟีเจอร์ที่เพิ่งเปิดตัวอาจต้องใช้เวลาในการสร้างการรับรู้จากผู้เรียน
          </li>
        </ul>
      </section>

      {/* Live Recent Clicks Stream */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
            <IconClock width={16} height={16} />
            <span>ประวัติการคลิกเมนูล่าสุด (20 รายการ)</span>
          </h2>
          <span className="text-xs text-ink-2">อัปเดตแบบเรียลไทม์</span>
        </div>

        {recentClicks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-ink-2">
            ยังไม่มีประวัติการคลิกเมนูบันทึกเข้ามาในระบบ (จะเริ่มบันทึกทันทีเมื่อมีผู้ใช้คลิกเมนูในแถบด้านบน)
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface text-xs shadow-soft">
            <table className="w-full text-left">
              <thead className="border-b border-line bg-surface-2 font-medium text-ink-2">
                <tr>
                  <th className="px-4 py-2.5">ผู้ใช้งาน</th>
                  <th className="px-4 py-2.5">บทบาท</th>
                  <th className="px-4 py-2.5">เมนูที่กด</th>
                  <th className="px-4 py-2.5">Path</th>
                  <th className="px-4 py-2.5 text-right">เวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentClicks.map((click) => {
                  const prof = click.profiles;
                  const name =
                    prof?.full_name || prof?.line_name || prof?.email || "ผู้ใช้";
                  const isStudent = prof?.role === "student";

                  return (
                    <tr key={click.id} className="hover:bg-surface-2/50 transition">
                      <td className="px-4 py-2.5 font-medium text-ink truncate max-w-[200px]">
                        {name}
                        {prof?.line_name && prof.full_name && (
                          <span className="text-ink-2 text-[11px] block truncate">
                            LINE: {prof.line_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={isStudent ? badge.blue : badge.gray}>
                          {isStudent ? "นักเรียน" : "Staff"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-ink">
                        {KNOWN_MENUS[click.menu_key]?.label || click.menu_key}
                      </td>
                      <td className="px-4 py-2.5 text-ink-2 font-mono text-[11px]">
                        {click.path}
                      </td>
                      <td className="px-4 py-2.5 text-right text-ink-2 whitespace-nowrap">
                        {formatDateTime(click.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
