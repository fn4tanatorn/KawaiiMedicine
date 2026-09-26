import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * One Supabase client + one getUser() per request, shared by layout and page
 * (React cache() dedupes within a single server render).
 */
const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Profile row for the signed-in user, fetched at most once per request. */
export const getProfile = cache(async (userId: string) => {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name, line_name, enrolled")
    .eq("id", userId)
    .single();
  return data;
});

/**
 * For pages that require an authenticated user, but do NOT gate on class enrollment
 * (e.g. /join where the user inputs the passcode to enroll).
 */
export async function requireSignedInUser(nextPath?: string) {
  const { supabase, user } = await getSession();
  if (!user) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${q}`);
  }
  const profile = await getProfile(user.id);
  return { supabase, user, profile };
}

/**
 * For Server Components / Server Functions on protected pages.
 * Enforces that user is signed in AND enrolled in the class (or is staff).
 * Unenrolled users are safely redirected to /join to enter the class passcode.
 */
export async function requireUser(nextPath?: string) {
  const { supabase, user, profile } = await requireSignedInUser(nextPath);
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";
  if (!isStaff && profile && !profile.enrolled) {
    const q = nextPath && nextPath !== "/join" ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/join${q}`);
  }
  return { supabase, user, profile };
}

/**
 * Same as requireUser, but also requires role instructor or admin.
 * Non-staff users are sent back to /learn. RLS still enforces every
 * query; this is the UI-level gate.
 */
export async function requireStaff(nextPath?: string) {
  const { supabase, user } = await requireUser(nextPath);
  const profile = await getProfile(user.id);
  const role = profile?.role ?? "student";
  if (role !== "instructor" && role !== "admin") {
    redirect("/learn?error=forbidden");
  }
  return {
    supabase,
    user,
    role,
    fullName: profile?.full_name ?? "",
    lineName: profile ? profile.line_name : undefined,
  };
}

/** Admin-only gate (e.g. beta features instructors shouldn't see yet). */
export async function requireAdmin(nextPath?: string) {
  const ctx = await requireStaff(nextPath);
  if (ctx.role !== "admin") {
    redirect(
      "/admin?error=" +
        encodeURIComponent("เมนูนี้เปิดให้ admin ทดสอบเท่านั้น"),
    );
  }
  return ctx;
}
