import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { requireRole } from "./lib/auth";

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
