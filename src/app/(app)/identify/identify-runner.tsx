"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnswerDiff } from "@/components/answer-diff";
import { badge, btn, card, input } from "@/components/ui";
import {
  answerIdQuestion,
  nextIdQuestion,
  type IdAnswerResult,
} from "./actions";
import type { IdQuestion } from "./question";

/** One server-picked question at a time until the user stops or the quota ends. */
export function IdentifyRunner({
  initialQuestion,
  initialLimit,
  initialUsed,
}: {
  initialQuestion: IdQuestion;
  /** null = unlimited (staff). */
  initialLimit: number | null;
  initialUsed: number;
}) {
  const [q, setQ] = useState(initialQuestion);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<IdAnswerResult | null>(null);
  const [history, setHistory] = useState<IdAnswerResult[]>([]);
  const [used, setUsed] = useState(initialUsed);
  const [finished, setFinished] = useState<
    null | "limit" | "stopped" | "empty"
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining =
    initialLimit === null ? null : Math.max(initialLimit - used, 0);
  const score = history.filter((r) => r.is_correct).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    if (result) {
      if (remaining === 0) {
        setBusy(false);
        return setFinished("limit");
      }
      const next = await nextIdQuestion();
      setBusy(false);
      if (next.kind === "question") {
        setQ(next.question);
        setValue("");
        setResult(null);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (next.kind === "limit") setFinished("limit");
      else if (next.kind === "empty") setFinished("empty");
      else setError("โหลดข้อถัดไปไม่สำเร็จ");
      return;
    }
    const res = await answerIdQuestion(value);
    setBusy(false);
    if (!res.ok) {
      if (res.limitReached) setFinished("limit");
      return setError(res.error);
    }
    setResult(res.result);
    setUsed(res.result.used);
    setHistory((h) => [...h, res.result]);
  }

  if (finished) {
    return (
      <div className={`${card} mx-auto max-w-md space-y-4`}>
        <p className="text-2xl font-semibold">
          รอบนี้ได้ {score}/{history.length}
        </p>
        <ul className="space-y-1 text-sm">
          {history.map((r, i) => (
            <li key={i} className={r.is_correct ? "text-mint" : "text-danger"}>
              {r.is_correct ? "✓" : "✗"} {r.answer}
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-2">
          {finished === "limit"
            ? `วันนี้ทำครบ ${initialLimit} ข้อแล้ว กลับมาใหม่พรุ่งนี้นะ${
                initialLimit !== null && initialLimit < 10
                  ? " · ดูวิดีโอให้ครบทุกคลิปเพื่อได้ 10 ข้อ/วัน"
                  : ""
              }`
            : finished === "empty"
              ? "ยังไม่มีการ์ดให้ทำ"
              : "กลับมาทำต่อได้ทุกเมื่อ"}
        </p>
        {finished === "stopped" && (
          <Link href="/identify" className={`${btn.primary} w-full`}>
            กลับหน้า Identify
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className={`${card} p-2`}>
        {q.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.imageUrl}
            alt={q.title}
            className="mx-auto max-h-[75vh] w-auto rounded-xl bg-white object-contain"
          />
        ) : (
          <p className="p-6 text-ink-2">โหลดรูปไม่สำเร็จ</p>
        )}
      </div>

      <div className={`${card} h-fit space-y-4`}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span className="font-medium text-ink">{q.title}</span>
          <span className={badge.blue}>{q.subject}</span>
          {!q.isPublished && <span className={badge.gray}>ร่าง</span>}
        </div>
        <div className="flex items-center justify-between text-sm text-ink-2">
          <span>
            ถูก {score}/{history.length}
          </span>
          <span>
            {remaining === null ? "ไม่จำกัด" : `เหลือวันนี้ ${remaining} ข้อ`}
          </span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <p className="text-lg font-semibold">
            หมายเลข{" "}
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border-2 border-ink px-2 font-mono">
              {q.labelNo}
            </span>{" "}
            คืออะไร?
          </p>
          <input
            ref={inputRef}
            className={`${input} ${result ? (result.is_correct ? "border-mint bg-mint-soft" : "border-danger bg-danger-soft") : ""}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!!result}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
          />
          {result && (
            <div className="text-sm">
              {result.is_correct ? (
                <p className="text-mint">✓ ถูก — {result.answer}</p>
              ) : result.given.trim() ? (
                <AnswerDiff answer={result.given} expected={result.answer} />
              ) : (
                <p className="text-danger">เฉลย: {result.answer}</p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className={`${btn.primary} w-full`} disabled={busy}>
            {busy
              ? "กำลังโหลด…"
              : result
                ? remaining === 0
                  ? "ดูสรุป"
                  : "ข้อต่อไป →"
                : "ตรวจ"}
          </button>
        </form>
        {history.length > 0 && (
          <button
            type="button"
            className={`${btn.link} w-full`}
            onClick={() => setFinished("stopped")}
          >
            พอแค่นี้ ดูสรุป
          </button>
        )}
      </div>
    </div>
  );
}
