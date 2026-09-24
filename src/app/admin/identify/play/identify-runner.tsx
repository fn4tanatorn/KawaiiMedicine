"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnswerDiff } from "@/components/answer-diff";
import { btn, card, input } from "@/components/ui";
import { checkIdCard, type IdCheckResult } from "../actions";

export function IdentifyRunner({
  cardId,
  imageUrl,
  title,
  labelNos,
  nextHref,
}: {
  cardId: string;
  imageUrl: string | null;
  title: string;
  labelNos: number[];
  nextHref: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<IdCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const byNo = new Map(results?.map((r) => [r.label_no, r]));
  const score = results?.filter((r) => r.is_correct).length ?? 0;

  async function check(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const res = await checkIdCard(cardId, answers);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setResults(res.results);
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

      <form onSubmit={check} className={`${card} h-fit space-y-3`}>
        <h2 className="font-semibold">พิมพ์ชื่อโครงสร้าง</h2>
        {labelNos.map((no, i) => {
          const r = byNo.get(no);
          return (
            <div key={no} className="space-y-1">
              <label className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-right font-mono font-semibold">
                  {no}.
                </span>
                <input
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className={`${input} ${r ? (r.is_correct ? "border-mint bg-mint-soft" : "border-danger bg-danger-soft") : ""}`}
                  value={answers[no] ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [no]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && i < labelNos.length - 1) {
                      e.preventDefault();
                      refs.current[i + 1]?.focus();
                    }
                  }}
                  readOnly={!!results}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus={i === 0}
                />
              </label>
              {r && !r.is_correct && (
                <div className="pl-9 text-xs">
                  {r.given.trim() ? (
                    <AnswerDiff answer={r.given} expected={r.answer} />
                  ) : (
                    <span className="text-mint">{r.answer}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {error && <p className="text-sm text-danger">{error}</p>}

        {results ? (
          <div className="space-y-3 pt-2">
            <p className="text-lg font-semibold">
              ได้ {score}/{results.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={btn.secondary}
                onClick={() => {
                  setResults(null);
                  setAnswers({});
                  refs.current[0]?.focus();
                }}
              >
                ลองใหม่
              </button>
              <Link href={nextHref} className={`${btn.primary} flex-1`}>
                การ์ดถัดไป →
              </Link>
            </div>
          </div>
        ) : (
          <button className={`${btn.primary} w-full`} disabled={busy}>
            {busy ? "กำลังตรวจ…" : "ตรวจคำตอบ"}
          </button>
        )}
      </form>
    </div>
  );
}
