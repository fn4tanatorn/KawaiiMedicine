"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackMenuClick } from "@/lib/telemetry/client";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  exact?: boolean;
  trackKey?: string;
};

/** Pill navigation with the current route highlighted. */
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
        const active = n.exact
          ? pathname === n.href
          : pathname === n.href || pathname.startsWith(n.href + "/");
        const key = n.trackKey || n.href.replace(/^\//, "") || "home";
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            onClick={() => trackMenuClick(key, n.href, "nav")}
            className={`inline-flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-pill font-medium transition ${pad} ${
              active
                ? "bg-brand-soft text-brand"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {n.icon}
            <span className="shrink-0">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

