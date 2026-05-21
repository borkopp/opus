import { isOpenNow } from '@/lib/discover/opening-hours';
import type { DiscoverFeed, PublishedListing } from '@/lib/discover/types';

/** Mirrors opus-mk-ios `DiscoverFeedBuilder` / web `DiscoverClient`. */
export function buildDiscoverFeed(
  items: PublishedListing[],
  isSearchActive: boolean,
): DiscoverFeed {
  if (isSearchActive) {
    return { featured: [], nearYou: items };
  }

  const featuredCandidates = items.filter((o) => o.isFeatured === true);
  const openCandidates = items.filter(
    (o) => o.isFeatured !== true && isOpenNow(o.openingHours),
  );

  let featured = [...featuredCandidates];
  if (featured.length < 3) {
    const topUp = openCandidates.filter(
      (o) => !featured.some((f) => f._id === o._id),
    );
    featured = [...featured, ...topUp].slice(0, 5);
  } else {
    featured = featured.slice(0, 5);
  }

  const featuredIds = new Set(featured.map((o) => o._id));
  const nearYou = items.filter((o) => !featuredIds.has(o._id));

  return { featured, nearYou };
}

export function priceRangeSymbol(priceRange: string | undefined): string | undefined {
  switch (priceRange) {
    case 'budget':
      return '€';
    case 'mid':
      return '€€';
    case 'premium':
      return '€€€';
    default:
      return undefined;
  }
}
