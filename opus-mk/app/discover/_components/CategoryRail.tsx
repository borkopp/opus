import { CATEGORIES, BeautyCategory } from "@/lib/beauty-categories";

export function CategoryRail({
  selectedCategory,
  onSelect,
  availableCategoryIds,
}: {
  selectedCategory: BeautyCategory | undefined;
  onSelect: (cat: BeautyCategory | undefined) => void;
  availableCategoryIds: Set<string>;
}) {
  const filteredCategories = CATEGORIES.filter(cat => availableCategoryIds.has(cat.id));

  if (filteredCategories.length === 0) return null;
  return (
    <div className="pb-5">
      {/* Mobile: horizontal scroll */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none md:hidden" role="group" aria-label="Filter by category">
        <button
          onClick={() => onSelect(undefined)}
          aria-pressed={!selectedCategory}
          className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 whitespace-nowrap ${
            !selectedCategory
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border/50 text-muted-foreground hover:border-border"
          }`}
        >
          All
        </button>
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(selectedCategory === cat.id ? undefined : cat.id)}
            aria-pressed={selectedCategory === cat.id}
            className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 whitespace-nowrap ${
              selectedCategory === cat.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border/50 text-muted-foreground hover:border-border"
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Desktop: flex-wrap text pill strip — no icon tiles */}
      <div className="hidden md:flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button
          onClick={() => onSelect(undefined)}
          aria-pressed={!selectedCategory}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 ${
            !selectedCategory
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border/50 text-muted-foreground hover:border-border"
          }`}
        >
          <span aria-hidden="true" className="text-xs">✦</span>
          All
        </button>
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(selectedCategory === cat.id ? undefined : cat.id)}
            aria-pressed={selectedCategory === cat.id}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-[border-color,background-color,color] duration-150 ${
              selectedCategory === cat.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border/50 text-muted-foreground hover:border-border"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
