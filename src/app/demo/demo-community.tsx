"use client";

import { useState } from "react";
import Image from "next/image";
import { badge, card } from "@/components/ui";
import { DEMO_LOUNGE_POSTS } from "@/lib/demo-data";

export function DemoCommunity() {
  const [posts, setPosts] = useState(DEMO_LOUNGE_POSTS);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});

  function addReaction(postIndex: number, type: "love" | "hug" | "coffee" | "fight") {
    const key = `${postIndex}-${type}`;
    if (userReactions[key]) return; // 1 tap per reaction in demo

    setUserReactions((prev) => ({ ...prev, [key]: "true" }));
    setPosts((prev) =>
      prev.map((p, idx) => {
        if (idx !== postIndex) return p;
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [type]: p.reactions[type] + 1,
          },
        };
      }),
    );
  }

  return (
    <div className="space-y-6">
      {/* 60% Progress Pace Milestone Showcase */}
      <div className={`${card} bg-gradient-to-br from-surface to-mint-soft/30 border-mint/40 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/study.png"
              alt=""
              width={32}
              height={32}
              className="object-contain"
            />
            <div>
              <h4 className="font-bold text-sm text-ink">
                เป้าหมายการเรียนร่วมกัน: เกณฑ์ห้อง 60% ปลดล็อกคลิปใหม่
              </h4>
              <p className="text-xs text-ink-2">
                เพื่อนๆ ในคลาสจะร่วมกันผลักดันให้ไม่มีใครตกขบวน (Active Cohort Learning)
              </p>
            </div>
          </div>
          <span className={badge.green}>พร้อมลงคลิปใหม่ 🎉</span>
        </div>

        {/* Milestone Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-ink">ความคืบหน้าทั้งห้อง: 64%</span>
            <span className="text-mint">เป้าหมาย 60% (ผ่านแล้ว)</span>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-2 overflow-hidden border border-line relative">
            <div
              className="h-full bg-mint transition-all duration-1000 rounded-full"
              style={{ width: "64%" }}
            />
            {/* Target 60% marker pin */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-ink/70"
              style={{ left: "60%" }}
              title="เป้า 60%"
            />
          </div>
          <p className="text-[11px] text-ink-2">
            *ระบบคิดคำนวณเฉพาะผู้เรียนที่ Active ใน 14 วันล่าสุด เพื่อไม่ให้บัญชีที่ดองคลิปถ่วงเพื่อนๆ ในห้อง
          </p>
        </div>
      </div>

      {/* Lounge Semi-Private Anonymous Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">☕</span>
            <h4 className="font-bold text-sm text-ink">
              มุมพักใจ (Lounge) — พื้นที่ส่งพลังใจนิรนาม
            </h4>
          </div>
          <span className={badge.pink}>100% Student Anonymity</span>
        </div>

        <p className="text-xs text-ink-2">
          เรียนเหนื่อย เครียด หรืออยากเติมพลัง? โพสต์ระบายหรือส่งกำลังใจให้เพื่อนได้โดยไม่ต้องเปิดเผยตัวตน (สุ่มฉายาสัตว์น่ารักอัตโนมัติ)
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((post, idx) => (
            <div key={idx} className={`${card} space-y-3 bg-surface`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{post.avatar}</span>
                  <div>
                    <p className="text-xs font-bold text-ink">{post.alias}</p>
                    <span className="text-[10px] text-brand font-medium">
                      {post.mood}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted">2 ชม. ที่แล้ว</span>
              </div>

              <p className="text-xs leading-relaxed text-ink">{post.text}</p>

              {/* 1-Tap Reactions */}
              <div className="flex flex-wrap gap-1.5 border-t border-line/50 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => addReaction(idx, "love")}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-1 transition active:scale-95 ${
                    userReactions[`${idx}-love`]
                      ? "border-pink bg-pink-soft text-pink font-bold"
                      : "border-line bg-surface-2 text-ink-2 hover:bg-surface"
                  }`}
                >
                  🤍 <span>{post.reactions.love}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addReaction(idx, "hug")}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-1 transition active:scale-95 ${
                    userReactions[`${idx}-hug`]
                      ? "border-mint bg-mint-soft text-mint font-bold"
                      : "border-line bg-surface-2 text-ink-2 hover:bg-surface"
                  }`}
                >
                  🫂 <span>{post.reactions.hug}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addReaction(idx, "coffee")}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-1 transition active:scale-95 ${
                    userReactions[`${idx}-coffee`]
                      ? "border-lemon bg-lemon-soft text-lemon font-bold"
                      : "border-line bg-surface-2 text-ink-2 hover:bg-surface"
                  }`}
                >
                  ☕ <span>{post.reactions.coffee}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addReaction(idx, "fight")}
                  className={`rounded-lg border px-2 py-1 flex items-center gap-1 transition active:scale-95 ${
                    userReactions[`${idx}-fight`]
                      ? "border-brand bg-brand-soft text-brand font-bold"
                      : "border-line bg-surface-2 text-ink-2 hover:bg-surface"
                  }`}
                >
                  💪 <span>{post.reactions.fight}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
