import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime } from "@/lib/format";
import { badge, btn, input } from "@/components/ui";
import { Flash } from "@/components/flash";
import { getActiveClassCode } from "@/lib/auth/class-code";
import { deleteUser, toggleUserEnrolled, updateUserRole } from "../actions";

export const metadata: Metadata = { title: "ผู้ใช้" };

const ROLE_LABEL = {
  student: "ผู้เรียน",
  instructor: "ผู้สอน",
  admin: "ผู้ดูแลระบบ",
} as const;

const DEFAULT_INACTIVE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): number {
  return Date.now() - days * DAY_MS;
}

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const { supabase, role, user } = await requireStaff("/admin/users");
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, line_name, role, enrolled, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const activeClassCode = getActiveClassCode();
  const { data: activity } = await supabase.rpc("get_user_last_active");
  const lastActive = new Map(
    (activity ?? []).map((a) => [a.user_id, a.last_active_at]),
  );
  const isAdmin = role === "admin";

  // Display-only flag for following up with students. Never feeds pace or
  // class averages (see get_course_progress_pace).
  const parsedDays = Number(sp.days);
  const days =
    Number.isInteger(parsedDays) && parsedDays > 0
      ? parsedDays
      : DEFAULT_INACTIVE_DAYS;
  const onlyInactive = sp.only === "inactive";
  const cutoff = daysAgo(days);
  // Falls back to sign-up time so a brand-new account isn't flagged on day one.
  const isInactive = (u: { id: string; created_at: string }) =>
    new Date(lastActive.get(u.id) ?? u.created_at).getTime() < cutoff;
  const students = (users ?? []).filter((u) => u.role === "student");
  const inactiveCount = students.filter(isInactive).length;
  const shown = onlyInactive
    ? (users ?? []).filter((u) => u.role === "student" && isInactive(u))
    : users;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ผู้ใช้</h1>
        <p className="mt-1 text-sm text-ink-2">
          {isAdmin
            ? "ผู้ดูแลระบบสามารถเปลี่ยนบทบาทได้ ผู้สอนและผู้ดูแลระบบเข้าหน้าจัดการได้"
            : "เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนบทบาทได้"}
        </p>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      {/* Class Passcode Information Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft/20 p-4">
        <div className="space-y-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            🔒 รหัสเข้าคลาสปัจจุบัน (Class Passcode)
          </span>
          <p className="text-xs text-ink-2">
            แจกรหัสนี้ในโน้ตประกาศของกลุ่ม LINE OpenChat เท่านั้น เพื่อให้นักเรียนใหม่ใช้ปลดล็อกสิทธิ์เข้าเรียน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-2">รหัส:</span>
          <code className="rounded-xl border border-brand/40 bg-surface px-3 py-1.5 font-mono text-base font-bold text-brand shadow-soft">
            {activeClassCode}
          </code>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-2">ไม่ active เกิน</span>
        <input
          type="number"
          name="days"
          min={1}
          defaultValue={days}
          className={`${input} w-20 py-1`}
        />
        <span className="text-ink-2">วัน</span>
        <label className="ml-2 flex items-center gap-1.5">
          <input
            type="checkbox"
            name="only"
            value="inactive"
            defaultChecked={onlyInactive}
          />
          แสดงเฉพาะผู้เรียนที่ไม่ active
        </label>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-surface-2"
        >
          กรอง
        </button>
        <span className="text-ink-2">
          ผู้เรียนไม่ active {inactiveCount}/{students.length} คน
        </span>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-ink-2">
            <tr>
              <th className="px-4 py-2 font-medium">ชื่อ</th>
              <th className="px-4 py-2 font-medium">อีเมล</th>
              <th className="px-4 py-2 font-medium">LINE</th>
              <th className="px-4 py-2 font-medium">สถานะคลาส</th>
              <th className="px-4 py-2 font-medium">สมัครเมื่อ</th>
              <th className="px-4 py-2 font-medium">ใช้งานล่าสุด</th>
              <th className="px-4 py-2 font-medium">บทบาท</th>
              <th className="px-4 py-2 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 font-medium">
                  {u.full_name || <span className="text-muted">-</span>}
                  {u.id === user.id && (
                    <span className="ml-2 text-xs text-ink-2">(คุณ)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-ink-2">{u.email ?? "-"}</td>
                <td className="px-4 py-2">
                  {u.line_name || (
                    <span className="text-lemon">ยังไม่กรอก</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        u.enrolled || u.role !== "student"
                          ? badge.green
                          : badge.amber
                      }
                    >
                      {u.enrolled || u.role !== "student"
                        ? "เข้าคลาสแล้ว"
                        : "รอรหัสคลาส"}
                    </span>
                    {u.role === "student" && (
                      <form action={toggleUserEnrolled}>
                        <input type="hidden" name="id" value={u.id} />
                        <input
                          type="hidden"
                          name="enrolled"
                          value={String(u.enrolled)}
                        />
                        <button
                          type="submit"
                          title={
                            u.enrolled
                              ? "คลิกเพื่อระงับสิทธิ์เข้าคลาส"
                              : "คลิกเพื่ออนุมัติเข้าคลาสทันที"
                          }
                          className="text-[11px] text-ink-2 hover:text-brand underline ml-1"
                        >
                          {u.enrolled ? "ระงับ" : "อนุมัติ"}
                        </button>
                      </form>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-ink-2">
                  {formatDateTime(u.created_at)}
                </td>
                <td className="px-4 py-2 text-ink-2">
                  {formatDateTime(lastActive.get(u.id)) || (
                    <span className="text-muted">ยังไม่เคยเรียน</span>
                  )}
                  {u.role === "student" && isInactive(u) && (
                    <span className={`${badge.amber} ml-2`}>
                      ไม่ active {days}+ วัน
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isAdmin && u.id !== user.id ? (
                    <form
                      action={updateUserRole}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className={`${input} w-auto py-1`}
                      >
                        {(
                          Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]
                        ).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-surface-2"
                      >
                        บันทึก
                      </button>
                    </form>
                  ) : (
                    <span
                      className={
                        u.role === "admin"
                          ? badge.amber
                          : u.role === "instructor"
                            ? badge.green
                            : badge.gray
                      }
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isAdmin && u.id !== user.id && u.role !== "admin" ? (
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-medium text-danger underline-offset-4 hover:underline">
                        ลบบัญชี
                      </summary>
                      <form
                        action={deleteUser}
                        className="mt-2 w-64 space-y-2 rounded-xl border border-danger/30 bg-danger-soft p-3"
                      >
                        <input type="hidden" name="id" value={u.id} />
                        <p className="text-xs text-ink-2">
                          ลบถาวร กู้คืนไม่ได้ ข้อมูลการเรียน เวลาเรียน ผลสอบ และ
                          feedback ของคนนี้จะถูกลบออกจากสถิติทั้งหมด
                          พิมพ์อีเมลเพื่อยืนยัน
                        </p>
                        <input
                          name="confirm"
                          required
                          autoComplete="off"
                          placeholder={u.email ?? "อีเมล"}
                          className={`${input} py-1 text-xs`}
                        />
                        <button
                          type="submit"
                          className={`${btn.danger} w-full py-1.5 text-xs`}
                        >
                          ลบถาวร
                        </button>
                      </form>
                    </details>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
