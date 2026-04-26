import { BusinessRow } from "@/components/discover/BusinessRow";
import { BusinessGridCard } from "@/components/discover/BusinessGridCard";
import { formatDistance } from "@/lib/format";
import { isOpenNow } from "@/lib/opening-hours";

export function NearYouList({ 
  orgs, 
  coords,
  isSearchActive = false,
  searchQuery = ""
}: { 
  orgs: any[]; 
  coords?: { lat: number; lng: number } | null;
  isSearchActive?: boolean;
  searchQuery?: string;
}) {
  if (!orgs || orgs.length === 0) return null;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        {isSearchActive ? (
          <h2 className="text-xl font-semibold tracking-tight">Results for "{searchQuery}"</h2>
        ) : (
          <h2 className="text-xl font-semibold tracking-tight">Near you</h2>
        )}
      </div>

      {/* Mobile/Tablet: Vertical List */}
      <div className="flex flex-col gap-3 lg:hidden">
        {orgs.map((org) => {
          const { isOpen } = isOpenNow(org.openingHours);
          const distanceLabel = org.coordinates && coords 
            ? formatDistance(org._distanceMeters) 
            : undefined;
            
          return (
            <BusinessRow 
              key={org._id} 
              org={org} 
              href={`/${org.slug}`}
              isOpenNow={isOpen}
              distanceLabel={distanceLabel}
              aiMatch={isSearchActive && org._rankScore > 5} // Simple threshold for AI badge
            />
          );
        })}
      </div>

      {/* Desktop: Grid */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4">
        {orgs.map((org) => {
          const { isOpen } = isOpenNow(org.openingHours);
          const distanceLabel = org.coordinates && coords 
            ? formatDistance(org._distanceMeters) 
            : undefined;

          return (
            <BusinessGridCard 
              key={org._id} 
              org={org} 
              href={`/${org.slug}`}
              isOpenNow={isOpen}
              distanceLabel={distanceLabel}
            />
          );
        })}
      </div>
    </div>
  );
}
