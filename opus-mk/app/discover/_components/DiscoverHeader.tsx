import { Logo } from "@/components/Logo";
import { HeaderAuth } from "@/components/HeaderAuth";
import { useResolveCity } from "@/hooks/use-resolve-city";

export function DiscoverHeader() {
  const { displayCity } = useResolveCity();

  return (
    <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Logo className="text-base text-white/90" />
        <div className="flex items-center gap-3">
          {displayCity && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--online)] shrink-0"
                style={{ boxShadow: "0 0 6px var(--online)" }}
              />
              <span className="text-xs text-white/85">{displayCity}</span>
            </div>
          )}
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
