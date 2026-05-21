import { beautyCategoryLabel } from '@/lib/discover/beauty-categories';
import type { PublishedListing } from '@/lib/discover/types';

export function venueLabel(listing: PublishedListing): string {
  if (listing.industry === 'hospitality') {
    const type =
      listing.venueType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ??
      'Restaurant';
    const cuisine = listing.cuisine?.[0];
    if (cuisine) return `${type} · ${cuisine}`;
    return type;
  }

  return (
    beautyCategoryLabel(listing.beautyCategory) ??
    listing.beautyCategory?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ??
    'Beauty'
  );
}
