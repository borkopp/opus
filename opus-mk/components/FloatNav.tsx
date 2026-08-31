"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome2, IconCompass, IconCalendar } from "@tabler/icons-react";

const TABS = [
  { id: "home", label: "Home", Icon: IconHome2, href: "/" },
  { id: "explore", label: "Explore", Icon: IconCompass, href: "/discover" },
  {
    id: "bookings",
    label: "Bookings",
    Icon: IconCalendar,
    href: "/my-bookings",
  },
];

export function FloatNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null;
  }

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full px-2 md:px-2.5 py-1.5"
      style={{
        background: "color-mix(in srgb, var(--ink-surface) 93%, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
        boxShadow:
          "0 8px 32px color-mix(in srgb, var(--ink-surface) 75%, transparent), 0 2px 8px color-mix(in srgb, var(--ink-surface) 50%, transparent)",
      }}
    >
      {TABS.map(({ id, label, Icon, href }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex items-center rounded-full transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              gap: active ? 6 : 0,
              padding: active ? "8px 16px" : "8px 12px",
              background: active ? "var(--primary)" : "transparent",
              color: active
                ? "var(--primary-foreground)"
                : "var(--muted-foreground)",
              boxShadow: active
                ? "0 2px 8px color-mix(in srgb, var(--primary) 35%, transparent)"
                : "none",
            }}
          >
            <Icon size={18} />
            <span
              className="text-[13px] font-medium whitespace-nowrap leading-none"
              style={{
                maxWidth: active ? 72 : 0,
                opacity: active ? 1 : 0,
                overflow: "hidden",
                transition:
                  "max-width 250ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
