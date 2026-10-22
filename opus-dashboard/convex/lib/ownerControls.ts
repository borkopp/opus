import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requirePlatformOwner } from "./ownerAuth";

/** The selector grants no authority: persisted platform-owner access is mandatory. */
export async function ownerBusiness(ctx: QueryCtx, orgId: Id<"orgs">) {
  const owner = await requirePlatformOwner(ctx);
  const org = await ctx.db.get(orgId);
  if (
    !org ||
    org.isDeleted ||
    org.industry !== "beauty_wellness" ||
    (org.source === "scraped" && org.claimStatus !== "claimed")
  ) {
    throw new ConvexError("Business not available in the owner overview.");
  }
  return { owner, org };
}
