import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSignedInUser } from "@/lib/auth/require-user";
import { safeNextPath } from "@/lib/auth/site-url";
import { REGISTRATION_FORM_URL } from "@/lib/demo-data";
import { alert, badge, btn, card, input, label } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import { ThemeToggle } from "@/components/theme-toggle";
import { enrollWithClassCode } from "./actions";

export const metadata: Metadata = {
  title: "ยืนยันรหัสเข้าคลาส | KawaiiMedicine",
};

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const sp = await searchParams;
  const { user, profile } = await requireSignedInUser("/join");

  // If already enrolled or is staff, redirect to app directly
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";
  if (isStaff || profile?.enrolled) {
    redirect("/learn");
  }

  const next = safeNextPath(typeof sp.next === "string" ? sp.next : "/learn");
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-14 sm:px-6">
      <ThemeToggle className="absolute top-4 right-4 border border-line bg-surface/80 shadow-soft backdrop-blur" />

      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <Mascot mood="happy" className="w-16 h-16" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-pink">
            KawaiiMedicine
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            ยืนยันรหัสเข้าคลาส
          </h1>
          <p className="text-xs sm:text-sm text-ink-2 max-w-sm mx-auto">
            คลาสนี้เปิดให้เฉพาะสมาชิกในกลุ่ม LINE OpenChat ที่ลงทะเบียนแล้วเท่านั้น
          </p>
        </div>

        {error && (
          <div role="alert" className={alert.error}>
            {error}
          </div>
        )}

        {/* Activation Form Card */}
        <div className={`${card} space-y-5 border-2 border-brand/20 shadow-soft`}>
          <div className="rounded-xl border border-line/80 bg-surface-2 p-3 text-xs text-ink-2 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <span className={badge.blue}>ตรวจสอบรหัส:</span>
            </div>
            <p>
              รหัสเข้าคลาสจะถูกปักหมุดไว้ใน{" "}
              <strong className="text-ink">&ldquo;โน้ตประกาศ (Note)&rdquo;</strong> ของกลุ่ม LINE OpenChat
            </p>
          </div>

          <form action={enrollWithClassCode} className="space-y-4">
            <input type="hidden" name="next" value={next} />

            <label className={label}>
              <span className="text-xs font-semibold text-ink flex items-center justify-between">
                <span>รหัสเข้าคลาส (Class Passcode) *</span>
                <span className="text-muted font-normal text-[11px]">ไม่แยกพิมพ์เล็ก-ใหญ่</span>
              </span>
              <input
                type="text"
                name="code"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="เช่น KAWAII2026"
                className={`${input} font-mono tracking-wider uppercase font-semibold`}
                autoFocus
              />
            </label>

            <label className={label}>
              <span className="text-xs font-semibold text-ink">
                ชื่อของคุณในกลุ่ม LINE OpenChat
              </span>
              <input
                type="text"
                name="line_name"
                defaultValue={profile?.line_name ?? ""}
                autoComplete="off"
                placeholder="เช่น หมอเนม, นศพ. ชัย..."
                className={input}
              />
              <span className="text-[11px] text-ink-2 block pt-0.5">
                เพื่อให้อาจารย์ผู้สอนตรวจสอบและจับคู่กับบัญชี ({user.email}) ได้
              </span>
            </label>

            <button type="submit" className={`${btn.primary} w-full py-2.5 shadow-soft`}>
              ยืนยันเพื่อเข้าสู่บทเรียน ➔
            </button>
          </form>

          {/* Links for outsiders or unapproved people */}
          <div className="border-t border-line/60 pt-4 text-center text-xs text-ink-2 space-y-3">
            <p className="font-medium text-ink">ยังไม่ได้เป็นสมาชิกในกลุ่ม LINE OpenChat?</p>
            <div className="flex flex-col gap-2">
              <a
                href={REGISTRATION_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn.secondary} text-xs py-2`}
              >
                📝 กรอกแบบฟอร์มสมัครเข้าเรียน (Google Forms)
              </a>
              <Link href="/demo" className={`${btn.link} text-xs`}>
                ✨ หรือ ทดลองเรียนฟรีผ่านระบบ Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Footer signout option */}
        <div className="flex items-center justify-between text-xs text-ink-2 px-2">
          <span>เข้าสู่ระบบด้วย: {user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-danger hover:underline">ออกจากระบบ</button>
          </form>
        </div>
      </div>
    </main>
  );
}
