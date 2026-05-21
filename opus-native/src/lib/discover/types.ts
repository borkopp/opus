/** Public listing row from `public:listPublished` / `public:searchPublished`. */

export type OpeningHoursEntry = {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
};

export type PublishedListing = {
  _id: string;
  name: string;
  slug: string;
  industry?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  tagline?: string;
  city?: string;
  neighborhood?: string;
  tags?: string[];
  priceRange?: string;
  averageRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  beautyCategory?: string;
  cuisine?: string[];
  venueType?: string;
  coordinates?: { lat: number; lng: number };
  openingHours?: OpeningHoursEntry[];
};

export type DiscoverFeed = {
  featured: PublishedListing[];
  nearYou: PublishedListing[];
};
