import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireActiveOrg } from "./auth";

/** Supported reservation businesses; publication and data readiness are checked separately. */
export function isHospitalityOrg(org: Doc<"orgs"> | null | undefined) {
  return Boolean(
    org &&
    !org.isDeleted &&
    org.industry === "hospitality" &&
    (org.venueType === "restaurant" || org.venueType === "cafe"),
  );
}

export async function requireHospitality(
  ctx: QueryCtx,
  minimumRole: "staff" | "manager" | "owner" = "staff",
  expectedOrgId?: Id<"orgs">,
) {
  const auth = await requireActiveOrg(ctx, expectedOrgId);
  if (!isHospitalityOrg(auth.org))
    throw new ConvexError("Restaurant reservations are unavailable.");
  const weight = { staff: 1, manager: 2, owner: 3 };
  if (weight[auth.staffMember.role] < weight[minimumRole])
    throw new ConvexError("Unauthorised");
  return auth;
}

export async function publicHospitalityOrg(
  ctx: Pick<QueryCtx, "db">,
  slug: string,
  { manageExisting = false }: { manageExisting?: boolean } = {},
) {
  const org = await ctx.db
    .query("orgs")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (
    !org ||
    !isHospitalityOrg(org) ||
    (!manageExisting && org.websiteStatus !== "published")
  )
    throw new ConvexError("Restaurant reservations are unavailable.");
  return org;
}
