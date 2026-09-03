import { ConvexError, v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { requirePaidPlan, requireRole } from "./lib/auth";

const paidFeature = v.union(
  v.literal("Gap optimizer"),
  v.literal("AI front desk"),
);

export const assertOrgRole = internalQuery({
  args: {
    orgId: v.id("orgs"),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("staff"),
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, args.role);
    return true;
  },
});

/** Authenticated plan check for actions invoked directly by dashboard staff. */
export const assertPaidOrgRole = internalQuery({
  args: {
    orgId: v.id("orgs"),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
    feature: paidFeature,
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, args.orgId, args.role);
    requirePaidPlan(org, args.feature);
    return true;
  },
});

/** Plan check for provider webhooks and scheduled/internal work without a user. */
export const assertPaidOrg = internalQuery({
  args: {
    orgId: v.id("orgs"),
    feature: paidFeature,
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) {
      throw new ConvexError("Business not found");
    }
    requirePaidPlan(org, args.feature);
    return true;
  },
});
