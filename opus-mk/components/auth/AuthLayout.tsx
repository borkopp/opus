import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-12 sm:px-8">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Logo className="text-2xl" />
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Your bookings
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
