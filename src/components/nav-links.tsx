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
}: {
  items: NavItem[];
  size?: "md" | "sm";
}) {
  const pathname = usePathname();
  const pad = size === "sm" ? "px-3 py-1.5 text-sm" : "px-3.5 py-2 text-sm";
  return (
    <nav className="flex flex-wrap items-center gap-1">
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
            className={`inline-flex items-center gap-2 rounded-pill font-medium transition ${pad} ${
              active
                ? "bg-brand-soft text-brand"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {n.icon}
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

