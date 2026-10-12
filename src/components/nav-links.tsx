"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackMenuClick } from "@/lib/telemetry/client";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  exact?: boolean;
  trackKey?: string;
  matchPrefix?: string;
};

/** Pill navigation with the current route highlighted and instant optimistic feedback. */
export function NavLinks({
  items,
  size = "md",
  wrap = false,
}: {
  items: NavItem[];
  size?: "md" | "sm";
  wrap?: boolean;
}) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear optimistic active state whenever the route change commits (React recommended pattern)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setPendingHref(null);
  }

  const pad =
    size === "sm"
      ? "px-2 py-1 text-xs sm:px-2.5 sm:py-1 sm:text-xs md:text-sm"
      : "px-2 py-1 text-xs sm:px-2.5 sm:py-1.5 sm:text-xs md:px-3 md:text-sm lg:px-3.5 lg:py-2";

  return (
    <nav
      className={`flex items-center gap-1 ${
        wrap ? "flex-wrap" : "flex-nowrap overflow-x-auto no-scrollbar"
      }`}
    >
      {items.map((n) => {
        const realActive = n.matchPrefix
          ? pathname === n.matchPrefix || pathname.startsWith(n.matchPrefix + "/")
          : n.exact
          ? pathname === n.href
          : pathname === n.href || pathname.startsWith(n.href + "/");

        const targetHref = pendingHref ?? pathname;
        const active = n.matchPrefix
          ? targetHref === n.matchPrefix || targetHref.startsWith(n.matchPrefix + "/")
          : n.exact
          ? targetHref === n.href
          : targetHref === n.href || targetHref.startsWith(n.href + "/");

        const isPending = pendingHref === n.href && !realActive;
        const key = n.trackKey || n.href.replace(/^\//, "") || "home";

        return (
          <Link
            key={n.href}
            href={n.href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              trackMenuClick(key, n.href, "nav");
              if (!realActive) {
                setPendingHref(n.href);
              }
            }}
            className={`inline-flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-pill font-medium transition duration-150 ${pad} ${
              active
                ? "bg-brand-soft text-brand shadow-xs"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink active:scale-95"
            } ${isPending ? "opacity-90 animate-pulse" : ""}`}
          >
            {n.icon}
            <span className="shrink-0">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

