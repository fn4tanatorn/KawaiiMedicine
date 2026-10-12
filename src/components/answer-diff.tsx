/**
 * Friendly, minimal comparison between a student's typed answer and the
 * expected correct answer. Clean, legible, and gentle on the eyes.
 */
const clean = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ");

export function AnswerDiff({
  answer,
  expected,
}: {
  answer: string;
  expected: string;
}) {
  const normA = clean(answer).toLowerCase();
  const normB = clean(expected).toLowerCase();
  const isMatch = normA === normB;

  if (isMatch) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-mint-soft px-3 py-1 text-xs font-semibold text-mint">
        <span>✓</span>
        <span>{expected}</span>
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1.5 rounded-2xl bg-surface-2/70 p-2.5 text-xs sm:text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex shrink-0 rounded-pill bg-pink-soft px-2 py-0.5 text-[11px] font-bold text-pink">
          คุณตอบ
        </span>
        <span className="font-medium text-ink-2 line-through decoration-pink/50">
          {answer || "(เว้นว่าง)"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex shrink-0 rounded-pill bg-mint-soft px-2 py-0.5 text-[11px] font-bold text-mint">
          เฉลย
        </span>
        <span className="font-semibold text-mint">
          {expected}
        </span>
      </div>
    </div>
  );
}

