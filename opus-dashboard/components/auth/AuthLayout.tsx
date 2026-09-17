import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Separator } from "@/components/ui/separator";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex min-h-svh min-w-0 flex-col px-6 sm:px-12 lg:px-14 xl:px-20">
        <header className="flex items-center justify-between gap-4 py-7 sm:py-9">
          <a
            href="https://opus.mk"
            aria-label="Back to OPUS"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to OPUS</span>
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center py-12 sm:py-16">
          <div className="w-full max-w-[25rem]">
            <div className="mb-10 flex flex-col items-center gap-1">
              <Logo className="text-3xl" />
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Studio
              </p>
            </div>
            {children}
            <Separator className="mt-5" />
            <p className="mt-6 text-center text-sm leading-6 text-muted-foreground">
              A space for your studio, your team, and your clients.
            </p>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-7 text-xs text-muted-foreground sm:pb-9">
          <a
            className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://opus.mk/privacy"
          >
            Privacy policy
          </a>
          <a
            className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://opus.mk/terms"
          >
            Terms of service
          </a>
          <a
            className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://opus.mk/contact"
          >
            Need a hand?
          </a>
        </footer>
      </div>

      <aside
        className="relative hidden bg-ink-surface lg:block"
        aria-label="Made for beauty professionals"
      >
        <div className="sticky top-0 h-svh min-h-[40rem] overflow-hidden">
          <Image
            src="/images/auth/studio-team-blue.png"
            alt="Three beauty professionals together in a bright salon with cool blue interiors"
            fill
            quality={90}
            sizes="(min-width: 1024px) max(50vw, 66.67svh), 1px"
            className="object-cover object-[50%_30%]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink-surface/90 via-ink-surface/5 to-transparent" />
          <svg
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-px h-full w-16 fill-background xl:w-20"
          >
            <path d="M0 0H34C4 300 4 640 100 1000H0Z" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 px-14 pb-14 text-center text-white xl:pb-16">
            <Logo className="text-4xl text-white" />
            {/* <p className="max-w-xs text-balance font-display text-2xl font-medium leading-snug tracking-tight xl:text-3xl">
              More time for what you love.
            </p> */}
            <p className="text-sm text-white/75">Your studio. In good hands.</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
