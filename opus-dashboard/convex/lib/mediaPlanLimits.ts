import type { Doc } from "../_generated/dataModel";

export function galleryPhotoLimit(org: Pick<Doc<"orgs">, "plan">): number {
  return org.plan === "paid" ? 15 : 3;
}
