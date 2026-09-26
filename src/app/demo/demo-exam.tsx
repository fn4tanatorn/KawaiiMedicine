"use client";

import { useState } from "react";
import { badge, btn, card } from "@/components/ui";
import {
  DEMO_EXAM_QUESTIONS,
  type DemoExamQuestion,
} from "@/lib/demo-data";

export function DemoExam() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});

  const question: DemoExamQuestion = DEMO_EXAM_QUESTIONS[currentIdx];
  const selectedChoice = selectedChoices[question.id] ?? null;
  const isSubmitted = Boolean(submittedQuestions[question.id]);

  function handleSelect(choiceId: string) {
    if (isSubmitted) return;
    setSelectedChoices((prev) => ({ ...prev, [question.id]: choiceId }));
  }

  function handleSubmit() {
    if (!selectedChoice) return;
    setSubmittedQuestions((prev) => ({ ...prev, [question.id]: true }));
  }

  function handleReset() {
    setSelectedChoices((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
    setSubmittedQuestions((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
  }

  // Calculate total score
  const totalCorrect = DEMO_EXAM_QUESTIONS.filter((q) => {
    const userChoice = selectedChoices[q.id];
    const correctChoice = q.choices.find((c) => c.isCorrect)?.id;
    return submittedQuestions[q.id] && userChoice === correctChoice;
  }).length;

  const totalSubmitted = Object.keys(submittedQuestions).length;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
            เลือกข้อสอบตัวอย่าง:
          </span>
          <div className="flex gap-1.5">
            {DEMO_EXAM_QUESTIONS.map((q, idx) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  currentIdx === idx
                    ? "bg-brand text-brand-ink font-semibold shadow-soft"
                    : "bg-surface-2 text-ink-2 hover:bg-line"
                }`}
              >
                ข้อ {idx + 1} ({q.subject.split(" ")[0]})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={badge.blue}>
            คะแนนสอบ: {totalCorrect}/{totalSubmitted}
          </span>
          <span className={badge.pink}>National Board Standard</span>
        </div>
      </div>

      {/* Question Card */}
      <div className={`${card} space-y-6`}>
        {/* Header & Vignette */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={badge.gray}>ข้อที่ {currentIdx + 1} จาก {DEMO_EXAM_QUESTIONS.length}</span>
            <span className={badge.blue}>{question.subject}</span>
          </div>

          <p className="text-base font-medium leading-relaxed text-ink">
            {question.stem}
          </p>
        </div>

        {/* Choices List */}
        <div className="space-y-2.5">
          {question.choices.map((choice) => {
            const isSelected = selectedChoice === choice.id;
            let choiceStyle =
              "border-line bg-surface hover:border-brand/40 hover:bg-surface-2";

            if (isSubmitted) {
              if (choice.isCorrect) {
                choiceStyle = "border-mint bg-mint-soft text-ink font-medium ring-2 ring-mint/20";
              } else if (isSelected && !choice.isCorrect) {
                choiceStyle = "border-danger bg-danger-soft text-danger";
              } else {
                choiceStyle = "border-line bg-surface opacity-60";
              }
            } else if (isSelected) {
              choiceStyle = "border-brand bg-brand-soft ring-2 ring-brand/30 text-ink font-medium";
            }

            return (
              <div
                key={choice.id}
                onClick={() => handleSelect(choice.id)}
                className={`group flex cursor-pointer flex-col rounded-xl border p-4 transition ${choiceStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSubmitted && choice.isCorrect
                        ? "bg-mint text-white"
                        : isSubmitted && isSelected && !choice.isCorrect
                          ? "bg-danger text-white"
                          : isSelected
                            ? "bg-brand text-brand-ink"
                            : "bg-surface-2 text-ink-2 group-hover:bg-brand/20"
                    }`}
                  >
                    {isSubmitted && choice.isCorrect
                      ? "✓"
                      : isSubmitted && isSelected && !choice.isCorrect
                        ? "✗"
                        : choice.id}
                  </span>
                  <div className="flex-1 text-sm leading-normal">
                    <p>{choice.text}</p>
                  </div>
                </div>

                {/* Per-Choice Detailed Rationale */}
                {isSubmitted && (
                  <div className="mt-2.5 pl-9 text-xs leading-relaxed text-ink-2 border-t border-line/40 pt-2">
                    <span
                      className={`font-semibold ${
                        choice.isCorrect ? "text-mint" : "text-danger"
                      }`}
                    >
                      {choice.isCorrect ? "คำอธิบายตัวเลือกที่ถูกต้อง:" : "เหตุผลที่ตัวเลือกนี้ไม่ถูกต้อง:"}{" "}
                    </span>
                    {choice.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Clinical Pearl Box */}
        {isSubmitted && question.clinicalPearl && (
          <div className="rounded-xl border border-lemon/40 bg-lemon-soft p-4 text-xs leading-relaxed text-ink space-y-1">
            <p className="font-bold text-lemon flex items-center gap-1.5">
              <span>🌟 High-Yield Clinical Pearl</span>
            </p>
            <p>{question.clinicalPearl}</p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
          <div className="text-xs text-ink-2">
            {!selectedChoice
              ? "คลิกเลือกคำตอบ 1 ข้อเพื่อส่งตรวจ"
              : isSubmitted
                ? "ตรวจคำตอบเรียบร้อยแล้ว อ่านเหตุผลประกอบด้านบน"
                : "พร้อมส่งคำตอบแล้ว กดปุ่มตรวจข้อนี้"}
          </div>

          <div className="flex gap-2">
            {isSubmitted ? (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className={btn.secondary}
                >
                  ลองทำใหม่อีกครั้ง
                </button>
                {currentIdx + 1 < DEMO_EXAM_QUESTIONS.length && (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className={btn.primary}
                  >
                    ทำข้อถัดไป ➔
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedChoice}
                className={btn.primary}
              >
                ตรวจคำตอบทันที
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
