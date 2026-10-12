import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { LoungeComposer } from "./lounge-composer";
import { LoungePostCard } from "./lounge-post-card";
import type { LoungePostItem, MoodType, PostReactionSummary } from "./types";

export const metadata: Metadata = {
  title: "มุมพักใจ",
  description: "พื้นที่แวะพัก วางความเหนื่อยล้า เล่าเรื่องราว หรือส่งพลังใจให้เพื่อนๆ",
};

export default async function LoungePage() {
  const { supabase, user } = await requireUser("/lounge");
  const profile = await getProfile(user.id);
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";

  const [{ data: postsData }, { data: reactionsData }] = await Promise.all([
    supabase
      .from("lounge_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("lounge_post_reactions").select("*"),
  ]);

  // Group reactions by post_id
  const reactionsByPost = new Map<string, PostReactionSummary[]>();
  if (reactionsData) {
    for (const r of reactionsData) {
      if (!r.post_id || !r.emoji) continue;
      const list = reactionsByPost.get(r.post_id) ?? [];
      list.push({
        emoji: r.emoji,
        count: r.count ?? 0,
        hasReacted: Boolean(r.has_reacted),
      });
      reactionsByPost.set(r.post_id, list);
    }
  }

  const posts: LoungePostItem[] = (postsData ?? []).map((p) => ({
    id: p.id!,
    content: p.content || "",
    mood: (p.mood as MoodType) || null,
    isAnonymous: Boolean(p.is_anonymous),
    authorName: p.author_name || "นักศึกษาแพทย์ท่านหนึ่ง",
    isMine: Boolean(p.is_mine),
    createdAt: p.created_at || new Date().toISOString(),
    reactions: reactionsByPost.get(p.id!) ?? [],
  }));

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      {/* Header Banner */}
      <div className="rounded-card border border-line bg-gradient-to-br from-pink-soft/40 via-surface to-brand-soft/20 p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface shadow-xs text-2xl border border-line">
            ☕
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              มุมพักใจ
            </h1>
            <p className="text-sm text-ink-2 leading-relaxed">
              พื้นที่แวะพัก วางความเหนื่อยล้า เล่าเรื่องราว วันนี้เป็นไงบ้าง หรือแวะมาเติมพลังใจให้เพื่อนๆ ที่เรียนด้วยกันนะ 🌿
            </p>
          </div>
        </div>
      </div>

      {/* Composer */}
      <LoungeComposer userName={profile?.full_name || user.email} />

      {/* Posts Feed */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-ink">
            เรื่องราว & ข้อความล่าสุด
          </h2>
          <span className="text-xs text-muted">
            {posts.length > 0 ? `${posts.length} ข้อความ` : ""}
          </span>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            mood="cheer"
            title="ยังไม่มีข้อความในมุมพักใจ"
            description="เป็นคนแรกที่แวะมาแชร์ความรู้สึก หรือส่งกำลังใจให้เพื่อนๆ สิ"
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <LoungePostCard key={post.id} post={post} isStaff={isStaff} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
