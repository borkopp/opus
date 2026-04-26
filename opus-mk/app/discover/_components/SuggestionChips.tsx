import { SUGGESTIONS } from "@/lib/discover-suggestions";

export function SuggestionChips({ onSelect }: { onSelect: (query: string) => void }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none md:mx-0 md:px-0">
      {SUGGESTIONS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onSelect(chip.query)}
          className="flex-none px-4 py-2 rounded-full text-sm font-medium border border-[var(--accent-soft)]/20 bg-[var(--accent-soft)]/10 text-[var(--accent-soft)] transition-colors hover:bg-[var(--accent-soft)]/20 active:scale-95 whitespace-nowrap"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
