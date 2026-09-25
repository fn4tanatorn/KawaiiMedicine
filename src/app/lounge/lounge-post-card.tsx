"use client";

import { useState, useTransition } from "react";
import { IconTrash } from "@/components/icons";
import { formatRelativeTime } from "@/lib/format";
import { deleteLoungePost, toggleReaction } from "./actions";
import {
  MOOD_OPTIONS,
  REACTION_EMOJIS,
  type LoungePostItem,
} from "./types";

export function LoungePostCard({
  post,
  isStaff,
}: {
  post: LoungePostItem;
  isStaff: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Local optimistic reactions state
  const [reactions, setReactions] = useState(post.reactions);

  const moodMeta = MOOD_OPTIONS.find((m) => m.key === post.mood);

  const handleToggleReaction = (emoji: string) => {
    // Optimistic update
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.hasReacted) {
          // Untoggle
          return prev
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: Math.max(0, r.count - 1), hasReacted: false }
                : r,
            )
            .filter((r) => r.count > 0 || r.hasReacted);
        } else {
          // Toggle on
          return prev.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, hasReacted: true }
              : r,
          );
        }
      } else {
        // New reaction
        return [...prev, { emoji, count: 1, hasReacted: true }];
      }
    });

    startTransition(async () => {
      await toggleReaction(post.id, emoji);
    });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    startTransition(async () => {
      await deleteLoungePost(post.id);
    });
  };

  const canDelete = post.isMine || isStaff;

  return (
    <article className="rounded-card border border-line bg-surface p-4 shadow-soft transition hover:border-line-2 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-soft text-base shadow-xs">
            {post.isAnonymous ? "🌱" : "🩺"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">
                {post.authorName}
              </span>
              {post.isAnonymous && (
                <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                  นิรนาม
                </span>
              )}
              {post.isMine && (
                <span className="rounded-pill bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                  คุณ
                </span>
              )}
            </div>
            <time className="text-xs text-muted" dateTime={post.createdAt}>
              {formatRelativeTime(post.createdAt)}
            </time>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {moodMeta && (
            <span
              className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-medium ${moodMeta.colorClass}`}
            >
              <span>{moodMeta.emoji}</span>
              <span>{moodMeta.label}</span>
            </span>
          )}

          {canDelete && !showConfirmDelete && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="rounded-lg p-1 text-muted transition hover:bg-danger-soft hover:text-danger"
              title="ลบข้อความนี้"
            >
              <IconTrash width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation box */}
      {showConfirmDelete && (
        <div className="my-3 flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger-soft p-2.5 text-xs text-danger">
          <span>ต้องการลบข้อความนี้ใช่ไหม?</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="rounded-lg bg-danger px-2.5 py-1 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmDelete(false)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 font-medium text-ink transition hover:bg-surface-2"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="my-3.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
        {post.content}
      </div>

      {/* Reactions Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
        {REACTION_EMOJIS.map((item) => {
          const found = reactions.find((r) => r.emoji === item.emoji);
          const count = found?.count ?? 0;
          const hasReacted = found?.hasReacted ?? false;

          return (
            <button
              key={item.emoji}
              type="button"
              onClick={() => handleToggleReaction(item.emoji)}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                hasReacted
                  ? "bg-pink-soft text-pink border border-pink/30 font-semibold shadow-xs"
                  : "bg-surface-2/80 text-ink-2 hover:bg-surface-3 hover:text-ink border border-transparent"
              }`}
              title={`${item.label} (${count})`}
            >
              <span className="text-sm">{item.emoji}</span>
              <span className="tabular-nums">{count > 0 ? count : ""}</span>
              <span className="hidden sm:inline text-[11px] opacity-80">
                {count === 0 ? item.label : ""}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
