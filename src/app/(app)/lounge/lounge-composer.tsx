"use client";

import { useState, useTransition } from "react";
import { IconShuffle } from "@/components/icons";
import { btn } from "@/components/ui";
import { createLoungePost } from "./actions";
import {
  CUTE_ALIASES,
  MOOD_OPTIONS,
  type MoodType,
} from "./types";

function getRandomAlias() {
  const item = CUTE_ALIASES[Math.floor(Math.random() * CUTE_ALIASES.length)];
  return `${item.icon} ${item.name}`;
}

export function LoungeComposer({
  userName,
}: {
  userName?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<MoodType | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [alias, setAlias] = useState(() => getRandomAlias());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleShuffleAlias = () => {
    let next = getRandomAlias();
    while (next === alias && CUTE_ALIASES.length > 1) {
      next = getRandomAlias();
    }
    setAlias(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createLoungePost({
        content,
        mood,
        isAnonymous,
        alias: isAnonymous ? alias : undefined,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setContent("");
        setMood(null);
        setIsExpanded(false);
        setAlias(getRandomAlias());
      }
    });
  };

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft transition sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Mood Bar */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-2">
            <span>สถานะ / อารมณ์ช่วงนี้ (เลือกได้)</span>
            {mood && (
              <button
                type="button"
                onClick={() => setMood(null)}
                className="text-muted hover:text-ink-2"
              >
                ล้างที่เลือก
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((opt) => {
              const selected = mood === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMood(selected ? null : opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium transition ${
                    selected
                      ? `${opt.colorClass} ring-2 ring-brand/30 shadow-xs font-semibold`
                      : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink"
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (!isExpanded && e.target.value.length > 0) {
                setIsExpanded(true);
              }
            }}
            onFocus={() => setIsExpanded(true)}
            placeholder="แวะมาพัก เล่าเรื่องราว วันนี้เป็นไงบ้าง หรือส่งกำลังใจให้เพื่อนๆ..."
            rows={isExpanded ? 4 : 2}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm text-ink placeholder:text-muted outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/15"
          />
          <div className="mt-1 flex items-center justify-end text-xs text-muted">
            {content.length}/1,000
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2 text-xs font-medium text-danger">
            {errorMsg}
          </div>
        )}

        {/* Identity & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium transition border ${
                isAnonymous
                  ? "border-pink/30 bg-pink-soft text-pink font-semibold"
                  : "border-line bg-surface-2 text-ink-2"
              }`}
            >
              <span>{isAnonymous ? "🎭 ไม่ระบุตัวตน" : "👤 แสดงชื่อจริง"}</span>
            </button>

            {isAnonymous ? (
              <div className="inline-flex items-center gap-1.5 rounded-pill bg-surface-2 px-2.5 py-1 text-xs text-ink-2">
                <span className="font-medium text-ink">{alias}</span>
                <button
                  type="button"
                  onClick={handleShuffleAlias}
                  title="สุ่มชื่อใหม่"
                  className="rounded p-0.5 text-muted hover:text-ink transition"
                >
                  <IconShuffle width={14} height={14} />
                </button>
              </div>
            ) : (
              <span className="text-xs text-ink-2">
                โพสต์ในชื่อ: <span className="font-semibold text-ink">{userName || "คุณ"}</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className={btn.primary}
          >
            {isPending ? "กำลังส่ง..." : "แวะมาแชร์ 💌"}
          </button>
        </div>
      </form>
    </div>
  );
}
