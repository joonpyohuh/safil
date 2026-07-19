"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

const ICONS: Record<string, React.ReactNode> = {
  "/": (
    <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "/history": (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19 12a7 7 0 0 0-.1-1.2l1.9-1.5-2-3.4-2.2.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.2-.9-2 3.4L5.1 10.8A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-1.9 1.5 2 3.4 2.2-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.2.9 2-3.4-1.9-1.5A7 7 0 0 0 19 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-paper/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="주요 메뉴"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6875rem] font-semibold ${
              active ? "text-brand" : "text-ink-soft"
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.6}
              aria-hidden="true"
            >
              {ICONS[item.href]}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
