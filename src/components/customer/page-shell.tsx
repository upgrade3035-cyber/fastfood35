import type { ReactNode } from "react";
import { BottomNav } from "@/components/customer/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 glass-strong">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-extrabold text-foreground">
              {title}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
