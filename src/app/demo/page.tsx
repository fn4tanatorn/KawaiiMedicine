import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/mascot";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/icons";
import { badge, btn } from "@/components/ui";
import { REGISTRATION_FORM_URL } from "@/lib/demo-data";
import { DemoView } from "./demo-view";

export const metadata: Metadata = {
  title: "ทดลองเรียนฟรี (Interactive Demo) | KawaiiMedicine",
  description:
    "ทดลองสัมผัสประสบการณ์เรียนแพทย์ยุคใหม่กับ KawaiiMedicine — ลองพิมพ์ตอบ Identify Flashcards, ทำข้อสอบพร้อมเฉลยละเอียด และดูตัวอย่างบทเรียนก่อนสมัครเข้าคลาส",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-85">
            <Logo className="text-brand w-7 h-7" />
            <div className="leading-tight">
              <span className="font-extrabold tracking-tight text-base">
                <span className="text-pink">Kawaii</span>
                <span className="text-ink">Medicine</span>
              </span>
              <span className="ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                Demo
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle className="border border-line bg-surface shadow-soft" />
            <a
              href={REGISTRATION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.primary} text-xs sm:text-sm py-2 px-3.5`}
            >
              สมัครเข้าคลาส ➔
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative border-b border-line bg-gradient-to-b from-surface to-bg px-4 py-10 sm:py-14 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex justify-center">
            <Mascot mood="happy" className="w-20 h-20 animate-bounce duration-1000" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-pill bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
            <span>✨ ทดลองเรียนฟรี</span>
            <span className="text-muted">·</span>
            <span>ไม่ต้องเข้าสู่ระบบ</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            สัมผัสประสบการณ์เรียนแพทย์กับ <span className="text-pink">Kawaii</span>
            <span className="text-brand">Medicine</span>
          </h1>

          <p className="text-sm sm:text-base text-ink-2 max-w-xl mx-auto leading-relaxed">
            ทดลองเล่น 3 ระบบหลักที่ออกแบบมาเพื่อเสริมความจำและกระชับเวลาทบทวน
            ก่อนตัดสินใจกรอกแบบฟอร์มเพื่อเข้าสู่คลาสเรียนเต็ม
          </p>

          <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs text-ink-2">
            <span className={badge.gray}>✓ ระบบพิมพ์ตอบจำแนกภาพ Netter</span>
            <span className={badge.gray}>✓ ข้อสอบพร้อมเฉลยละเอียดทุกข้อ</span>
            <span className={badge.gray}>✓ วิดีโอกระชับ + สไลด์สรุป</span>
          </div>
        </div>
      </section>

      {/* Interactive Main Body */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <DemoView registrationUrl={REGISTRATION_FORM_URL} />
      </main>

      {/* Floating Bottom CTA */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur p-3 sm:p-4 shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-ink">
              ชอบระบบนี้ไหม? สมัครเข้าเรียนคลาสเต็มฟรีได้เลย
            </p>
            <p className="text-[11px] sm:text-xs text-ink-2">
              เข้าถึงวิดีโอครบทุกตอน คลังภาพ 220+ รูป และข้อสอบเสมือนจริง
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/login" className={`${btn.link} text-xs sm:text-sm`}>
              มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
            </Link>
            <a
              href={REGISTRATION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.primary} text-xs sm:text-sm py-2 px-4 shadow-soft`}
            >
              กรอก Google Forms เพื่อเข้าคลาส ➔
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
