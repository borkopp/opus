import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";

interface DiscoverHeaderProps {
  city: string | null;
  isFallback: boolean;
}

export function DiscoverHeader({ city, isFallback }: DiscoverHeaderProps) {

  return (
    <header className="sticky top-0 z-50 border-b border-background/10 bg-ink-surface/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Logo className="text-base text-background/90" />
        <div className="flex items-center gap-3">
          {city && (
            <div className="flex items-center gap-1.5 rounded-full border border-background/10 bg-ink-surface/40 px-3 py-1.5 backdrop-blur-md">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--online)] shrink-0"
                style={{ boxShadow: "0 0 6px var(--online)" }}
              />
              <span className="text-xs text-background/85">
                {isFallback ? `Showing ${city}` : city}
              </span>
            </div>
          )}
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
