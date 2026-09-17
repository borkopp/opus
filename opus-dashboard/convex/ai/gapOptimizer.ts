"use node";

import { randomBytes, createHash } from "node:crypto";
import { v, ConvexError } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { RecoveryScanResult } from "../lib/gapRecoveryScan";

const scanArgs = {
  orgId: v.id("orgs"),
  serviceDate: v.optional(v.string()),
  staffIds: v.optional(v.array(v.id("staff_members"))),
  detectedBy: v.union(
    v.literal("manual_scan"),
    v.literal("cancellation"),
    v.literal("calendar_change"),
  ),
  triggeredByBookingId: v.optional(v.id("bookings")),
};

export const scanDayForOrg = action({
  args: scanArgs,
  handler: async (ctx, args): Promise<RecoveryScanResult> => {
    await ctx.runQuery(internal.auth.assertPaidOrgRole, {
      orgId: args.orgId,
      role: "manager",
      feature: "Gap optimizer",
    });
    const result: RecoveryScanResult | null = await ctx.runMutation(
      internal.ai.gapOptimizerHelpers.reconcileDay,
      { ...args, detectedBy: "manual_scan" },
    );
    if (!result)
      throw new ConvexError(
        "Enable recovery, publish your studio website, and choose a date within the next seven days.",
      );
    return result;
  },
});

// Retain the endpoint for cancellation jobs already in the scheduler.
export const scanDayAfterCancellation = internalAction({
  args: scanArgs,
  handler: async (ctx, args): Promise<RecoveryScanResult | null> =>
    await ctx.runMutation(internal.ai.gapOptimizerHelpers.reconcileDay, args),
});

export const approveAndSendCandidate = action({
  args: { orgId: v.id("orgs"), candidateId: v.id("gap_outreach_candidates") },
  handler: async (
    ctx,
    args,
  ): Promise<{ notificationId: Id<"notifications"> }> => {
    await ctx.runQuery(internal.auth.assertPaidOrgRole, {
      orgId: args.orgId,
      role: "manager",
      feature: "Gap optimizer",
    });
    const token = randomBytes(24).toString("base64url");
    return await ctx.runMutation(
      internal.ai.gapOptimizerHelpers.queueApprovedOffer,
      {
        ...args,
        token,
        tokenHash: createHash("sha256").update(token).digest("hex"),
      },
    );
  },
});
