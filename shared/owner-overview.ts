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

export type OwnerActivityKind = "bookings" | "audit" | "team";
export type OwnerBookingStatus =
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";
export interface OwnerBooking {
  id: string;
  customer: { name: string; email: string | null; phone: string | null };
  services: string[];
  staff: string;
  source: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  startAt: number;
  endAt: number;
  status: OwnerBookingStatus;
  priceMinorUnits: number;
  currency: string;
  cancellationReason: string | null;
  customerNote: string | null;
  staffNote: string | null;
  recoveryOffer: boolean;
}
export interface OwnerAuditEntry {
  id: string;
  createdAt: number;
  action: string;
  actor: string;
  actorType: string;
  resourceType: string;
  resourceId: string;
  changes: { field: string; before: string | null; after: string | null }[];
}
export interface OwnerTeamMember {
  id: string;
  name: string;
  email: string | null;
  role: "owner" | "manager" | "staff";
  active: boolean;
  linkedAccount: boolean;
  latestRetainedSignInAt: number | null;
  sessionExpiresAt: number | null;
}
export interface OwnerActivityPage {
  kind: OwnerActivityKind;
  collectedAt: number;
  bookings: OwnerBooking[];
  audit: OwnerAuditEntry[];
  team: OwnerTeamMember[];
  continueCursor: string;
  isDone: boolean;
}
