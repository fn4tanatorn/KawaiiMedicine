import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["user_role"];

export const ROLE_LABEL: Record<Role, string> = {
  student: "ผู้เรียน",
  instructor: "ผู้สอน",
  co_admin: "ผู้ช่วยแอดมิน",
  admin: "ผู้ดูแลระบบ",
};

export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  instructor: 1,
  co_admin: 2,
  admin: 3,
};

/**
 * Returns true if the user role is considered staff (instructor, co_admin, admin).
 * Mirrors Postgres public.is_staff().
 */
export function isStaffRole(role?: Role | null): boolean {
  return role === "instructor" || role === "co_admin" || role === "admin";
}

/**
 * Returns true if the user role can access senior / beta management features (co_admin, admin).
 * Unlocks Identify Beta and high-level platform tools for Co-admins.
 */
export function isCoAdminOrAdmin(role?: Role | null): boolean {
  return role === "co_admin" || role === "admin";
}

/**
 * Returns true if the role is the primary platform admin (admin).
 * Reserved for destructive operations (account deletion) and role mutations.
 */
export function isSuperAdmin(role?: Role | null): boolean {
  return role === "admin";
}
