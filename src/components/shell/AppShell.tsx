import { useState } from "react";
import { RTHeader } from "@/components/shell/RTHeader";
import { RTBrand } from "@/components/shell/RTBrand";
import { RTNavigation, RTMobileNavigation } from "@/components/shell/RTNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric backdrop */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 rt-aurora opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 rt-grain opacity-[0.025]"
        aria-hidden
      />

      <RTHeader onOpenNav={() => setNavOpen((v) => !v)} />
      <RTMobileNavigation open={navOpen} />

      <div className="mx-auto flex max-w-[var(--shell-max)] px-4 sm:px-6">
        {/* Desktop rail */}
        <aside className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] w-[228px] shrink-0 lg:block">
          <div className="flex h-full flex-col py-6 pr-5">
            <div className="mb-5 px-1">
              <RTBrand />
            </div>
            <RTNavigation />
            <div className="mt-auto px-3 pt-6">
              <p className="text-[11px] leading-relaxed text-pearl-faint">
                A private AI system for{" "}
                <span className="text-pearl-muted">Ramakanth</span>.
              </p>
            </div>
          </div>
        </aside>

        {/* Brand on mobile (header doesn't render it on small screens) */}
        <div className="py-5 lg:hidden">
          <RTBrand />
        </div>

        <main className="min-w-0 flex-1 pb-24 pt-2 lg:pl-8 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
