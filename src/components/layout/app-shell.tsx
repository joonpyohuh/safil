import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DesktopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-10 lg:px-10">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
