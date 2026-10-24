import type { Doc } from "../_generated/dataModel";
import { isAppReviewOrg } from "./appReview";
import { isBookingAccessAllowed } from "./subscriptionAccess";

export type PublicationStatus = "unpublished" | "published" | "suspended";

export function getWebsiteStatus(org: Doc<"orgs">): PublicationStatus {
  if (isAppReviewOrg(org)) return "unpublished";
  return org.websiteStatus ?? "unpublished";
}

export function isWebsitePublished(org: Doc<"orgs">): boolean {
  return getWebsiteStatus(org) === "published";
}

export function acceptsPublicBookings(org: Doc<"orgs">): boolean {
  if (isAppReviewOrg(org) || !isBookingAccessAllowed(org)) return false;
  return org.listingStatus === "published" || isWebsitePublished(org);
}
