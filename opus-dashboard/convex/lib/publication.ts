import type { Doc } from "../_generated/dataModel";

export type PublicationStatus = "unpublished" | "published" | "suspended";

export function getWebsiteStatus(org: Doc<"orgs">): PublicationStatus {
  return org.websiteStatus ?? "unpublished";
}

export function isWebsitePublished(org: Doc<"orgs">): boolean {
  return getWebsiteStatus(org) === "published";
}

export function acceptsPublicBookings(org: Doc<"orgs">): boolean {
  return org.listingStatus === "published" || isWebsitePublished(org);
}
