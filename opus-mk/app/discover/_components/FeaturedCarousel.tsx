import { BusinessCoverCard } from "@/components/discover/BusinessCoverCard";
import { IconChevronRight } from "@tabler/icons-react";

export function FeaturedCarousel({ orgs }: { orgs: any[] }) {
  if (!orgs || orgs.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-4 md:px-0 mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Featured</h2>
        <button className="text-sm font-medium text-cta flex items-center hover:opacity-80 transition-opacity">
          See all <IconChevronRight size={14} className="ml-0.5" />
        </button>
      </div>

      {/* Mobile/Tablet: Horizontal Scroll */}
      <div className="lg:hidden">
        <div className="flex overflow-x-auto pb-4 scrollbar-none">
          <div className="w-4 flex-none" /> {/* Left Spacer */}
          <div className="flex gap-4">
            {orgs.map((org) => (
              <BusinessCoverCard key={org._id} org={org} />
            ))}
          </div>
          <div className="w-4 flex-none" /> {/* Right Spacer */}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden lg:grid grid-cols-4 xl:grid-cols-5 gap-4">
        {orgs.map((org) => (
          <div key={org._id} className="w-full">
            <BusinessCoverCard org={org} />
          </div>
        ))}
      </div>
    </div>
  );
}
