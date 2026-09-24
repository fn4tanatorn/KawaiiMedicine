"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnswerDiff } from "@/components/answer-diff";
import { btn, card, input } from "@/components/ui";
import { answerIdLabel, type IdAnswerResult } from "./actions";

/** One randomly ordered label at a time; order is shuffled by the server page. */
export function SingleRunner({
  cardId,
  imageUrl,
  title,
  order,
  nextHref,
  initialLimit,
  initialUsed,
}: {
  cardId: string;
  imageUrl: string | null;
  title: string;
  order: number[];
  nextHref: string;
  /** null = unlimited (staff). */
  initialLimit: number | null;
  initialUsed: number;
}) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<IdAnswerResult | null>(null);
  const [history, setHistory] = useState<IdAnswerResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(initialUsed);
  const [limitHit, setLimitHit] = useState(false);
  const remaining =
    initialLimit === null ? null : Math.max(initialLimit - used, 0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Out of quota ends the card early, but only after the current answer is shown.
  const done = step >= order.length || limitHit || (remaining === 0 && !result);
  const no = order[step];
  const score = history.filter((r) => r.is_correct).length;

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (result) return next();
    setBusy(true);
    setError(null);
    const res = await answerIdLabel(cardId, no, value);
    setBusy(false);
    if (!res.ok) {
      if (res.limitReached) setLimitHit(true);
      return setError(res.error);
    }
    setResult(res.result);
    setUsed(res.result.used);
    setHistory((h) => [...h, res.result]);
  }

  function next() {
    setStep((s) => s + 1);
    setValue("");
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className={`${card} p-2`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="mx-auto max-h-[75vh] w-auto rounded-xl bg-white object-contain"
          />
        ) : (
          <p className="p-6 text-ink-2">โหลดรูปไม่สำเร็จ</p>
        )}
      </div>

      <div className={`${card} h-fit space-y-4`}>
        <div className="flex items-center justify-between text-sm text-ink-2">
          <span>
            ข้อ {Math.min(step + 1, order.length)}/{order.length}
          </span>
          <span>
            ถูก {score}/{history.length}
            {remaining !== null && ` · เหลือวันนี้ ${remaining} ข้อ`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2">
          <div
            className="h-full bg-brand transition-all"
            style={{
              width: `${(history.length / (order.length || 1)) * 100}%`,
            }}
          />
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-2xl font-semibold">
              ได้ {score}/{history.length}
            </p>
            <ul className="space-y-1 text-sm">
              {[...history]
                .sort((a, b) => a.label_no - b.label_no)
                .map((r) => (
                  <li
                    key={r.label_no}
                    className={r.is_correct ? "text-mint" : "text-danger"}
                  >
                    {r.is_correct ? "✓" : "✗"} {r.label_no}. {r.answer}
                  </li>
                ))}
            </ul>
            {remaining === 0 || limitHit ? (
              <p className="text-sm text-ink-2">
                วันนี้ทำครบ {initialLimit} ข้อแล้ว กลับมาใหม่พรุ่งนี้นะ
                {initialLimit !== null &&
                  initialLimit < 10 &&
                  " · ดูวิดีโอให้ครบทุกคลิปเพื่อได้ 10 ข้อ/วัน"}
              </p>
            ) : (
              <Link href={nextHref} className={`${btn.primary} w-full`}>
                การ์ดถัดไป →
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={check} className="space-y-3">
            <p className="text-lg font-semibold">
              หมายเลข{" "}
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border-2 border-ink px-2 font-mono">
                {no}
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
                ? "กำลังตรวจ…"
                : result
                  ? step + 1 < order.length && remaining !== 0
                    ? "ข้อต่อไป →"
                    : "ดูสรุป"
                  : "ตรวจ"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
