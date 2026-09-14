export interface BusinessUsage {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  createdAt: number;
  plan: "free" | "paid";
  websiteStatus: "unpublished" | "published" | "suspended";
  services: number;
  staff: number;
  customers: number;
  bookings: number;
  bookings30d: number;
  cancelled30d: number;
  images: number;
  imageBytes: number;
  externalImages: number;
  missingImages: number;
}

export interface OwnerOverview {
  startedAt: number;
  completedAt: number;
  businesses: BusinessUsage[];
  totals: {
    businesses: number;
    newBusinesses30d: number;
    published: number;
    suspended: number;
    paid: number;
    services: number;
    staff: number;
    customers: number;
    bookings: number;
    bookings30d: number;
    cancelled30d: number;
    activeBusinesses30d: number;
    linkedImages: number;
    linkedImageBytes: number;
    externalImages: number;
    missingImages: number;
    storedFiles: number;
    storedBytes: number;
    storedImages: number;
    storedImageBytes: number;
  };
  signups: { month: string; count: number }[];
}
