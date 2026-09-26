"use client";

import { useState } from "react";
import Image from "next/image";
import { btn, card } from "@/components/ui";
import { DemoIdentify } from "./demo-identify";
import { DemoExam } from "./demo-exam";
import { DemoLearn } from "./demo-learn";
import { DemoCommunity } from "./demo-community";

type TabKey = "identify" | "exam" | "learn" | "community";

export function DemoView({ registrationUrl }: { registrationUrl: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("identify");

  const tabs: { key: TabKey; label: string; iconSrc: string; tag: string }[] = [
    {
      key: "identify",
      label: "Identify (ทายภาพพิมพ์ตอบ)",
      iconSrc: "/icons/microscope.png",
      tag: "แนะนำ",
    },
    {
      key: "exam",
      label: "Exam (ข้อสอบ+เฉลยละเอียด)",
      iconSrc: "/icons/clipboard.png",
      tag: "เข้มข้น",
    },
    {
      key: "learn",
      label: "Learn (วิดีโอ & สไลด์)",
      iconSrc: "/icons/books.png",
      tag: "กระชับ",
    },
    {
      key: "community",
      label: "บรรยากาศคลาส & มุมพักใจ",
      iconSrc: "/icons/heart.png",
      tag: "อบอุ่น",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex border-b border-line overflow-x-auto no-scrollbar gap-2 pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-semibold transition ${
                isActive
                  ? "border-brand text-brand bg-brand-soft/20 rounded-t-xl"
                  : "border-transparent text-ink-2 hover:border-line hover:text-ink"
              }`}
            >
              <Image
                src={tab.iconSrc}
                alt=""
                width={20}
                height={20}
                className="object-contain"
              />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] rounded-full px-1.5 py-0.2 font-normal ${
                  isActive ? "bg-brand text-brand-ink font-semibold" : "bg-surface-2 text-ink-2"
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <section className="transition-opacity duration-200">
        {activeTab === "identify" && <DemoIdentify />}
        {activeTab === "exam" && <DemoExam />}
        {activeTab === "learn" && <DemoLearn />}
        {activeTab === "community" && <DemoCommunity />}
      </section>

      {/* Comprehensive Conversion Banner */}
      <div className={`${card} border-2 border-brand/30 bg-gradient-to-r from-brand-soft/30 via-surface to-pink-soft/30 p-6 sm:p-8 text-center space-y-5 rounded-3xl shadow-soft`}>
        <div className="mx-auto max-w-xl space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            พร้อมเริ่มต้นเรียนรู้ไปด้วยกันแล้วหรือยัง?
          </p>
          <h3 className="text-2xl font-extrabold text-ink sm:text-3xl">
            สมัครเข้าสู่คลาสเรียนเต็มรูปแบบ
          </h3>
          <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
            คลาสเรียนจัดขึ้นเพื่อนิสิต/นักศึกษาแพทย์ทุกคนโดยไม่มีค่าใช้จ่าย
            เพียงกรอกข้อมูลพื้นฐานใน Google Form เพื่อให้ผู้สอนอนุมัติการเข้าถึง
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 max-w-lg mx-auto text-left text-xs text-ink-2">
          <div className="rounded-xl border border-line/80 bg-surface/90 p-3">
            <span className="font-bold text-ink block mb-0.5">🎬 คอร์สวิดีโอ</span>
            เข้าถึงบทเรียนทั้งหมด พร้อมเอกสารสไลด์ Handout
          </div>
          <div className="rounded-xl border border-line/80 bg-surface/90 p-3">
            <span className="font-bold text-ink block mb-0.5">🔬 Identify เต็ม</span>
            คลังภาพกว่า 220+ รูป และระบบทวนซ้ำ Spaced Repetition
          </div>
          <div className="rounded-xl border border-line/80 bg-surface/90 p-3">
            <span className="font-bold text-ink block mb-0.5">📝 คลังข้อสอบ</span>
            ฝึกทำข้อสอบเก็งบอร์ด พร้อมวัดสถิติและคะแนนย้อนหลัง
          </div>
        </div>

        <div className="pt-2">
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn.primary} text-sm sm:text-base py-3 px-8 shadow-soft`}
          >
            กรอกแบบฟอร์มสมัครเข้าเรียน (Google Forms) ➔
          </a>
        </div>
      </div>
    </div>
  );
}
