import { IconSearch } from "@tabler/icons-react";

export function EmptyState({ 
  searchQuery, 
  hasCategory 
}: { 
  searchQuery: string; 
  hasCategory: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <IconSearch size={24} className="text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground font-medium">No businesses found</p>
      <p className="text-sm text-muted-foreground/60 mt-1">
        {searchQuery
          ? "Try a different search term"
          : hasCategory
          ? "No listings in this category yet"
          : "Check back later"}
      </p>
    </div>
  );
}
