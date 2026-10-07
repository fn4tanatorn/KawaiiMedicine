import Link from "next/link";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LineNameModal, SNOOZE_COOKIE } from "./line-name-modal";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import {
  IconExam,
  IconTarget,
  IconPlay,
  IconSettings,
  IconCoffee,
  IconLogOut,
  Logo,
} from "./icons";

type Role = Database["public"]["Enums"]["user_role"];

export async function AppHeader({
  user,
  role,
  fullName,
  lineName,
}: {
  user: User;
  role: Role;
  fullName?: string | null;
  /** undefined = unknown (don't prompt); null = missing (prompt) */
  lineName?: string | null;
}) {
  const isStaff = role === "instructor" || role === "admin";
  const snoozed =
    lineName === null && (await cookies()).get(SNOOZE_COOKIE)?.value === "1";
  const display = fullName || user.email || "";
  const initial = (fullName || user.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const items = [
    {
      href: "/learn",
      label: "บทเรียน",
      icon: <IconPlay width={17} height={17} />,
    },
    {
      href: "/exam",
      label: "ข้อสอบ",
      icon: <IconExam width={17} height={17} />,
    },
    {
      href: "/identify",
      label: "Identify",
      icon: <IconTarget width={17} height={17} />,
    },
    {
      href: "/lounge",
      label: "มุมพักใจ",
      icon: <IconCoffee width={17} height={17} />,
    },
    ...(isStaff
      ? [
          {
            href: "/admin/courses",
            matchPrefix: "/admin",
            trackKey: "admin",
            label: "จัดการ",
            icon: <IconSettings width={17} height={17} />,
          },
        ]
      : []),
  ];

  return (
    <>
      {lineName === null && !snoozed && (
        <LineNameModal email={user.email ?? ""} />
      )}
      <header className="sticky top-0 z-30 px-2.5 pt-2.5 sm:px-4 sm:pt-3 lg:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-1.5 rounded-pill border border-line bg-surface/85 px-2.5 py-1.5 shadow-soft backdrop-blur sm:gap-2.5 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2 lg:gap-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 pl-0.5 text-base font-bold tracking-tight sm:pl-1"
            >
              <Logo className="text-brand h-6 w-6 sm:h-7 sm:w-7" />
              <span className="hidden xl:inline">
                <span className="text-pink">Kawaii</span>
                <span className="text-ink">Medicine</span>
              </span>
            </Link>
            <NavLinks items={items} />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 text-sm">
            <ThemeToggle />
            <span className="hidden h-5 w-px bg-line xl:block" />
            <Link
              href="/profile"
              className="flex items-center gap-1.5 rounded-pill py-1 pl-1 pr-1.5 xl:pr-3 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
              title={user.email ?? ""}
            >
              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-pink-soft text-xs sm:text-sm font-bold text-pink">
                {initial}
              </span>
              <span className="hidden max-w-[8rem] truncate font-medium xl:inline">
                {display}
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-line xl:block" />
            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                className="flex items-center gap-1 rounded-pill px-2 py-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:px-3"
                title="ออกจากระบบ"
              >
                <IconLogOut width={16} height={16} className="xl:hidden" />
                <span className="hidden xl:inline">ออกจากระบบ</span>
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
