import type { Doc } from "../_generated/dataModel";
import { isAppReviewOrg } from "./appReview";

export type PublicationStatus = "unpublished" | "published" | "suspended";

export function getWebsiteStatus(org: Doc<"orgs">): PublicationStatus {
  if (isAppReviewOrg(org)) return "unpublished";
  return org.websiteStatus ?? "unpublished";
}

export function isWebsitePublished(org: Doc<"orgs">): boolean {
  return getWebsiteStatus(org) === "published";
}

export function acceptsPublicBookings(org: Doc<"orgs">): boolean {
  if (isAppReviewOrg(org)) return false;
  return org.listingStatus === "published" || isWebsitePublished(org);
}
