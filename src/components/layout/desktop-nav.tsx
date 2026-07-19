"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, History, Home, Settings } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

const icons = { "/": Home, "/history": History, "/settings": Settings };

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 hidden border-b border-border/80 bg-background/85 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="SAFIL 홈">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-card shadow-sm transition-transform duration-300 group-hover:-rotate-6">
            <Coffee aria-hidden="true" className="size-5" />
          </span>
          <span><strong className="block text-base tracking-tight">SAFIL</strong><small className="block text-xs text-muted">카페 홍보 도우미</small></span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-1.5 shadow-sm" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = icons[item.href as keyof typeof icons];
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${active ? "bg-foreground text-card shadow-sm" : "text-muted hover:bg-primary-soft hover:text-foreground"}`}><Icon className="size-4" aria-hidden="true" />{item.label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
