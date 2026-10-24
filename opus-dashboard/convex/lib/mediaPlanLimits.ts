import { hasPaidAccess } from "./subscriptionAccess";
import type { Doc } from "../_generated/dataModel";

export function galleryPhotoLimit(
  org: Pick<Doc<"orgs">, "plan"> & Partial<Pick<Doc<"orgs">, "trial">>,
): number {
  return hasPaidAccess(org) ? 15 : 3;
}
