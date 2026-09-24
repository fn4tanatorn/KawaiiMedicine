import type { createClient } from "./supabase/server";
import { pct } from "./format";

/** The pace, informally agreed with students, at which a new video goes
 *  out once the class-wide average completion for the course reaches it. */
export const PACE_TARGET_PCT = 60;

type PaceRow = {
  published_videos: number;
  avg_completed: number;
  active_students: number;
};

export type CoursePace = PaceRow & { pct: number; ready: boolean };

/**
 * The pace exactly as students see it on /learn/[slug], rounded the same
 * way, so staff are told a course hit the target at the moment students'
 * card says it did. Null until a student has started the course
 * (avg_completed is null then).
 */
export function coursePace(
  rows: PaceRow[] | null | undefined,
): CoursePace | null {
  const p = rows?.[0];
  if (!p || p.published_videos <= 0 || p.active_students <= 0) return null;
  const value = pct(p.avg_completed, p.published_videos);
  return { ...p, pct: value, ready: value >= PACE_TARGET_PCT };
}

/** Pace for each course id; unpublished courses get no entry. */
export async function coursePaces(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseIds: string[],
): Promise<Map<string, CoursePace>> {
  const entries = await Promise.all(
    courseIds.map(async (id) => {
      const { data } = await supabase.rpc("get_course_progress_pace", {
        p_course_id: id,
      });
      return [id, coursePace(data)] as const;
    }),
  );
  return new Map(
    entries.filter((e): e is [string, CoursePace] => e[1] !== null),
  );
}
