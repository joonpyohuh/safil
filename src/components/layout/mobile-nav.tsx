"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Settings } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

const icons = { "/": Home, "/history": History, "/settings": Settings };

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-20 flex rounded-[1.4rem] border border-border bg-card/90 p-1.5 shadow-[0_12px_40px_rgb(36_31_27/.16)] backdrop-blur-xl md:hidden" aria-label="주요 메뉴">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = icons[item.href as keyof typeof icons];
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition-all duration-200 ${active ? "bg-foreground text-card" : "text-muted active:scale-95"}`}><Icon className="size-5" aria-hidden="true" />{item.label}</Link>;
      })}
    </nav>
  );
}
