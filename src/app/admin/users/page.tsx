import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime } from "@/lib/format";
import { badge, btn, input } from "@/components/ui";
import { Flash } from "@/components/flash";
import { deleteUser, updateUserRole } from "../actions";

export const metadata: Metadata = { title: "ผู้ใช้" };

const ROLE_LABEL = {
  student: "ผู้เรียน",
  instructor: "ผู้สอน",
  admin: "ผู้ดูแลระบบ",
} as const;

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const { supabase, role, user } = await requireStaff("/admin/users");
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, line_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const isAdmin = role === "admin";

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

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-ink-2">
            <tr>
              <th className="px-4 py-2 font-medium">ชื่อ</th>
              <th className="px-4 py-2 font-medium">อีเมล</th>
              <th className="px-4 py-2 font-medium">LINE</th>
              <th className="px-4 py-2 font-medium">สมัครเมื่อ</th>
              <th className="px-4 py-2 font-medium">บทบาท</th>
              <th className="px-4 py-2 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users?.map((u) => (
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
                <td className="px-4 py-2 text-ink-2">
                  {formatDateTime(u.created_at)}
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
