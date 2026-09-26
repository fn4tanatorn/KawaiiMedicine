"use client";

import { useState } from "react";
import Image from "next/image";
import { badge, btn, card } from "@/components/ui";
import { IconPlay } from "@/components/icons";

export function DemoLearn() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState("1.25x");
  const [activeSlide, setActiveSlide] = useState(0);

  const sampleSlides = [
    {
      title: "1. Normal Gastric Mucosa Architecture",
      subtitle: "ชั้นเยื่อบุกระเพาะอาหารและเซลล์สำคัญ",
      points: [
        "Foveolar cells (Surface mucous): หลั่งเมือกเคลือบป้องกันกรด",
        "Parietal cells (Oxyntic): หลั่ง HCl และ Intrinsic factor (ดูดซึม B12)",
        "Chief cells (Peptic): บริเวณก้นต่อม หลั่ง Pepsinogen ย่อยโปรตีน",
      ],
      pearl: "Tip: Intrinsic factor ขาดจะนำไปสู่ Pernicious anemia & Neuropathy",
    },
    {
      title: "2. Peptic Ulcer vs Gastric Malignancy",
      subtitle: "ข้อแตกต่างสำคัญในการวินิจฉัยแยกโรค",
      points: [
        "Benign Ulcer: ขอบเรียบ (Punched-out), ก้นแผลสะอาด ไม่ยกนูน",
        "Malignant Ulcer: ขอบหยักหนา ยกนูน (Heaped-up margins), ก้นแผลเนื้อตาย",
        "Rule of thumb: ทุกแผลในกระเพาะอาหารต้องส่องกล้องตัดชิ้นเนื้อ (Biopsy) เสมอ",
      ],
      pearl: "High-Yield: Gastric ulcer มีโอกาสเป็นมะเร็งแฝง ต่างจาก Duodenal ulcer ที่มักเป็น Benign",
    },
    {
      title: "3. Lauren Classification: Intestinal vs Diffuse",
      subtitle: "รูปแบบทางพยาธิวิทยาของมะเร็งกระเพาะอาหาร",
      points: [
        "Intestinal type: สัมพันธ์กับ H. pylori, การกินอาหารหมักดองเค็ม, ก่อเป็น Gland",
        "Diffuse type: สัมพันธ์กับการกลายพันธุ์ CDH1 (E-cadherin), ไม่เกาะกลุ่ม",
        "Signet ring cell: นิวเคลียสถูก Mucin ดันชิดขอบ คล้ายแหวนหัวพลอย",
      ],
      pearl: "Pathognomonic: Krukenberg tumor คือการกระจายของ Diffuse gastric cancer ไปรังไข่สองข้าง",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-brand uppercase tracking-wider">
            คอร์สตัวอย่าง: Gastrointestinal Pathology
          </span>
          <h3 className="text-lg font-bold text-ink">
            EP 04: Gastric Pathology & Mucosal Biopsy Interpretation
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={badge.blue}>ความยาว: 14 นาที</span>
          <span className={badge.green}>มีเอกสารสไลด์ PDF</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Video Player Simulator */}
        <div className={`${card} p-0 overflow-hidden bg-slate-950 text-white flex flex-col justify-between aspect-video relative rounded-2xl shadow-soft`}>
          {/* Simulated Video Canvas */}
          <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-brand-ink">
            <div className="relative z-10 space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/90 text-brand-ink shadow-lg transition hover:scale-105 cursor-pointer"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <span className="text-2xl font-bold">⏸</span>
                ) : (
                  <IconPlay className="w-8 h-8 ml-1" />
                )}
              </div>
              <p className="text-sm font-semibold tracking-wide text-white">
                {isPlaying ? "กำลังเล่นวิดีโอตัวอย่าง..." : "คลิกเพื่อดูตัวอย่างเครื่องเล่นวิดีโอ"}
              </p>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                ระบบวิดีโอของ KawaiiMedicine บันทึกเวลาเรียนอัตโนมัติ ปรับสปีดได้ลื่นไหล พร้อมระบบจำจุดที่ค้างไว้
              </p>
            </div>

            {/* Video overlay badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                1080p HD
              </span>
              <span className="rounded-md bg-brand/80 text-brand-ink px-2 py-0.5 text-[11px] font-bold">
                MedEd Pure
              </span>
            </div>
          </div>

          {/* Bottom Player Controls */}
          <div className="bg-slate-900/90 border-t border-slate-800 p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-brand transition font-bold"
              >
                {isPlaying ? "พัก" : "เล่น"}
              </button>
              <span className="text-slate-400 font-mono">03:45 / 14:20</span>
            </div>

            {/* Speed Toggles */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">ความเร็ว:</span>
              {["1x", "1.25x", "1.5x", "2x"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`rounded px-1.5 py-0.5 font-semibold transition ${
                    speed === s
                      ? "bg-brand text-brand-ink"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slide Deck & Handout Preview */}
        <div className={`${card} flex flex-col justify-between space-y-4`}>
          <div>
            <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/icons/clipboard.png"
                  alt=""
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <h4 className="font-bold text-sm text-ink">
                  สไลด์ประกอบการสอน (Slide Handout)
                </h4>
              </div>
              <span className={badge.gray}>หน้า {activeSlide + 1}/3</span>
            </div>

            {/* Interactive Slide Viewer */}
            <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-3">
              <h5 className="font-bold text-sm text-ink">
                {sampleSlides[activeSlide].title}
              </h5>
              <p className="text-xs text-brand font-semibold">
                {sampleSlides[activeSlide].subtitle}
              </p>
              <ul className="space-y-1.5 text-xs text-ink-2 pl-4 list-disc">
                {sampleSlides[activeSlide].points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
              <div className="rounded-lg bg-lemon-soft/80 border border-lemon/30 p-2.5 text-[11px] text-ink">
                <span className="font-bold text-lemon">⚡ Key Takeaway: </span>
                {sampleSlides[activeSlide].pearl}
              </div>
            </div>

            {/* Slide Navigation Dots */}
            <div className="flex justify-center gap-1.5 mt-3">
              {sampleSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === i ? "w-6 bg-brand" : "w-2 bg-line hover:bg-muted"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface/50 p-3 text-xs text-ink-2 flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">ดาวน์โหลดสไลด์ PDF ฉบับเต็ม</p>
              <p className="text-[11px]">สไลด์ 16:9 สวยงาม ละเอียด คัดเฉพาะจุดออกสอบ</p>
            </div>
            <button
              type="button"
              onClick={() => alert("ในคลาสเรียนจริง สมาชิกสามารถดาวน์โหลดเอกสาร PDF ได้ฟรีทุกตอนครับ")}
              className={`${btn.secondary} text-xs py-1.5 px-3`}
            >
              📥 ดูตัวอย่าง PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
