import { IconSearch, IconSparkles } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";

export function AiSearchBar({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}) {
  return (
    <div className="relative group">
      <IconSparkles
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-2"
        aria-hidden="true"
      />
      <label htmlFor="discover-search" className="sr-only">
        Search salons, barbers, spas
      </label>
      <Input
        id="discover-search"
        placeholder="What are you looking for?"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoComplete="off"
        className="pl-10 h-14 rounded-2xl bg-card border-border/60 text-base placeholder:text-muted-foreground/40 shadow-sm transition-[border-color,box-shadow] focus-visible:ring-1 focus-visible:ring-accent-2 focus-visible:border-accent-2"
      />
      {searchQuery.length > 0 && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
