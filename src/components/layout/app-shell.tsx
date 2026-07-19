import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <DesktopNav />
      <main className="app-main mx-auto w-full max-w-2xl flex-1 pb-[calc(var(--mobile-nav-h)+var(--safe-bottom)+5rem)] md:max-w-4xl md:pb-10">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
