"use client";

import { useRef, useState } from "react";
import { AnswerDiff } from "@/components/answer-diff";
import { badge, btn, card, input } from "@/components/ui";
import {
  DEMO_IDENTIFY_CARDS,
  type DemoIdentifyCard,
} from "@/lib/demo-data";
import {
  DemoHeartFigure,
  DemoOsteonFigure,
  DemoStomachFigure,
} from "@/components/demo-medical-figures";

export function DemoIdentify() {
  const [cardIndex, setCardIndex] = useState(0);
  const [labelIndex, setLabelIndex] = useState(0);
  const [value, setValue] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCard: DemoIdentifyCard = DEMO_IDENTIFY_CARDS[cardIndex];
  const currentLabel = currentCard.labels[labelIndex];

  function normalize(s: string) {
    return s.toLowerCase().trim().replace(/[-_\s]+/g, " ");
  }

  function checkAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (showResult) {
      // Move to next question or next card
      if (labelIndex + 1 < currentCard.labels.length) {
        setLabelIndex((idx) => idx + 1);
      } else {
        // Cycle card
        setCardIndex((idx) => (idx + 1) % DEMO_IDENTIFY_CARDS.length);
        setLabelIndex(0);
      }
      setValue("");
      setShowResult(false);
      setShowHint(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const givenNorm = normalize(value);
    if (!givenNorm) return;

    const accepted = [currentLabel.answer, ...currentLabel.synonyms].map(normalize);
    const correct = accepted.includes(givenNorm);

    setIsCorrect(correct);
    setShowResult(true);
    setAnsweredCount((c) => c + 1);
    if (correct) {
      setScore((s) => s + 1);
    }
  }

  function selectCard(idx: number) {
    setCardIndex(idx);
    setLabelIndex(0);
    setValue("");
    setShowResult(false);
    setShowHint(false);
  }

  return (
    <div className="space-y-6">
      {/* Subject & Card selector bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
            เลือกภาพตัวอย่าง:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_IDENTIFY_CARDS.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCard(idx)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  cardIndex === idx
                    ? "bg-brand text-brand-ink font-semibold shadow-soft"
                    : "bg-surface-2 text-ink-2 hover:bg-line"
                }`}
              >
                {c.title.split(" (")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={badge.blue}>
            คะแนนรอบนี้: {score}/{answeredCount}
          </span>
          <span className={badge.green}>Spaced Repetition Engine</span>
        </div>
      </div>

      {/* Main Runner Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Medical Diagram Card */}
        <div className={`${card} flex flex-col items-center justify-center p-4 bg-surface`}>
          <div className="w-full mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-brand uppercase tracking-wider">
                {currentCard.subject} · {currentCard.category}
              </p>
              <h3 className="text-base font-bold text-ink">{currentCard.title}</h3>
            </div>
            <span className={badge.gray}>
              ข้อ {labelIndex + 1}/{currentCard.labels.length}
            </span>
          </div>

          <div className="w-full relative flex items-center justify-center rounded-xl bg-white border border-line/60 p-2 overflow-hidden shadow-inner">
            {currentCard.svgType === "bone" && (
              <DemoOsteonFigure activeLabelNo={currentLabel.labelNo} />
            )}
            {currentCard.svgType === "stomach" && (
              <DemoStomachFigure activeLabelNo={currentLabel.labelNo} />
            )}
            {currentCard.svgType === "heart" && (
              <DemoHeartFigure activeLabelNo={currentLabel.labelNo} />
            )}
          </div>
          <p className="mt-3 text-center text-xs text-ink-2 italic">
            {currentCard.description}
          </p>
        </div>

        {/* Input & Instant Feedback Card */}
        <div className={`${card} flex flex-col justify-between space-y-5`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-sm font-semibold text-ink">
                ทายโครงสร้างหมายเลข{" "}
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-ink font-bold text-sm">
                  {currentLabel.labelNo}
                </span>
              </span>
              {currentLabel.hint && !showResult && (
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  {showHint ? "ซ่อนคำใบ้" : "💡 ขอคำใบ้"}
                </button>
              )}
            </div>

            {showHint && currentLabel.hint && !showResult && (
              <div className="rounded-xl border border-lemon/40 bg-lemon-soft p-3 text-xs text-ink">
                <span className="font-semibold text-lemon">คำใบ้: </span>
                {currentLabel.hint}
              </div>
            )}

            <form onSubmit={checkAnswer} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink-2">
                  พิมพ์ชื่อโครงสร้าง (ภาษาอังกฤษ หรือ คำทับศัพท์):
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  readOnly={showResult}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={`เช่น ${currentLabel.answer}...`}
                  className={`${input} ${
                    showResult
                      ? isCorrect
                        ? "border-mint bg-mint-soft text-mint font-semibold"
                        : "border-danger bg-danger-soft text-danger"
                      : ""
                  }`}
                  autoFocus
                />
              </label>

              {/* Instant Verification Display */}
              {showResult && (
                <div className="rounded-xl border p-3.5 text-sm space-y-2 bg-surface-2">
                  {isCorrect ? (
                    <div className="text-mint font-medium flex items-center gap-1.5">
                      <span>✓ ยอดเยี่ยม! ถูกต้อง</span>
                      <span className="text-xs text-ink-2 font-normal">
                        ({currentLabel.answer})
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-danger font-semibold text-xs">
                        ✗ ยังไม่เป๊ะ หรือมีตัวสะกดคลาดเคลื่อน:
                      </p>
                      <AnswerDiff answer={value} expected={currentLabel.answer} />
                      <p className="text-xs text-ink-2 pt-1">
                        คำตอบที่ยอมรับ: <span className="font-semibold text-ink">{currentLabel.answer}</span>
                        {currentLabel.synonyms.length > 0 && ` (${currentLabel.synonyms.join(", ")})`}
                      </p>
                    </div>
                  )}
                  {currentLabel.hint && (
                    <p className="text-xs text-ink-2 border-t border-line/50 pt-2">
                      <span className="font-medium text-ink">คำอธิบาย:</span> {currentLabel.hint}
                    </p>
                  )}
                </div>
              )}

              <button type="submit" className={`${btn.primary} w-full`}>
                {showResult
                  ? labelIndex + 1 < currentCard.labels.length
                    ? "ข้อต่อไป ➔"
                    : "ดูภาพถัดไป ➔"
                  : "ตรวจคำตอบ"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-line bg-surface/60 p-3.5 text-xs text-ink-2 space-y-1">
            <p className="font-semibold text-ink">💡 ฟีเจอร์พิเศษในคลาสจริง:</p>
            <p>
              • มีคลังภาพ Identify กว่า <strong>220+ ภาพ 1,300+ โครงสร้าง</strong> (Netter Histology & Anatomy)
            </p>
            <p>
              • มีระบบ <strong>Weighted Spaced Repetition (SRS)</strong> ดึงข้อที่คุณเคยตอบผิดกลับมาให้ฝึกซ้ำ 60% อัตโนมัติ เพื่อให้จำได้ติดตาไปจนถึงวันสอบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
