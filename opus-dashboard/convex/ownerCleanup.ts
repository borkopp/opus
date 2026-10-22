import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requirePlatformOwner } from "./lib/ownerAuth";
import { ownerBusiness } from "./lib/ownerControls";
import { cleanupPlan } from "./lib/ownerCleanup";
import { cancelBookingCompletion } from "./lib/bookingCompletion";
import {
  OWNER_DELETE_HOLD_MS,
  type OrganizationCleanupPreview,
} from "../../shared/owner-controls";

export const prepare = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }): Promise<OrganizationCleanupPreview> => {
    const { owner, org } = await ownerBusiness(ctx, orgId);
    const identity = await ctx.auth.getUserIdentity();
    if (typeof identity?.sessionId !== "string")
      throw new ConvexError("Please sign in again.");
    const plan = await cleanupPlan(ctx, org);
    const expiresAt = Date.now() + 10 * 60_000;
    const confirmationId = await ctx.db.insert("owner_cleanup_confirmations", {
      orgId,
      authUserId: owner._id,
      sessionId: identity.sessionId,
      fingerprint: plan.fingerprint,
      createdAt: Date.now(),
      expiresAt,
    });
    return {
      confirmationId,
      orgId,
      name: org.name,
      slug: org.slug,
      expiresAt,
      remove: plan.remove,
      retain: plan.retain,
      blockers: plan.blockers,
      notes: plan.notes,
    };
  },
});

/** Explicitly authorized exception to normal soft deletion. Never an account-erasure API. */
export const execute = mutation({
  args: {
    orgId: v.id("orgs"),
    confirmationId: v.id("owner_cleanup_confirmations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await requirePlatformOwner(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const confirmation = await ctx.db.get(args.confirmationId);
    if (
      !confirmation ||
      confirmation.orgId !== args.orgId ||
      confirmation.authUserId !== owner._id ||
      confirmation.sessionId !== identity?.sessionId
    )
      throw new ConvexError(
        "This confirmation is invalid. Open a fresh deletion preview.",
      );
    const org = await ctx.db.get(args.orgId);
    if (!org || args.slug !== org.slug)
      throw new ConvexError("Type the exact studio slug to confirm deletion.");
    if (confirmation.completedAt !== undefined) return { deleted: true };
    const now = Date.now();
    if (
      confirmation.expiresAt <= now ||
      now - confirmation.createdAt < OWNER_DELETE_HOLD_MS
    )
      throw new ConvexError(
        "The confirmation expired or was submitted too soon. Review it again and hold for five seconds.",
      );
    await ownerBusiness(ctx, args.orgId);
    const plan = await cleanupPlan(ctx, org);
    if (plan.blockers.length) throw new ConvexError(plan.blockers.join(" "));
    if (plan.fingerprint !== confirmation.fingerprint)
      throw new ConvexError(
        "Studio data changed since this preview. Refresh it and review the new counts before deleting.",
      );

    for (const booking of plan.records.bookings) {
      await cancelBookingCompletion(ctx, booking);
      if (!plan.keep.has(booking._id)) continue;
      const cancel =
        booking.status === "confirmed" || booking.status === "checked_in";
      await ctx.db.patch(booking._id, {
        status: cancel ? "cancelled" : booking.status,
        ...(cancel
          ? {
              cancelledAt: now,
              cancelledBy: "platform-owner-cleanup",
              cancellationReason: "Studio removed by OPUS owner",
            }
          : {}),
        customerNote: undefined,
        staffNote: undefined,
        clientClaimTokenHash: undefined,
        clientClaimTokenExpiresAt: undefined,
        clientVerifiedEmail: undefined,
        aiConversationId: undefined,
        gapRecoveryCandidateId: undefined,
        updatedAt: now,
      });
      if (cancel)
        await ctx.db.insert("audit_log", {
          orgId: org._id,
          actorType: "user",
          actorId: owner._id,
          action: "booking.cancelled",
          resourceType: "bookings",
          resourceId: booking._id,
          before: { status: booking.status },
          after: { status: "cancelled", reason: "owner.organization_deleted" },
          createdAt: now,
        });
    }
    for (const staff of plan.records.staff_members)
      if (plan.keep.has(staff._id)) {
        await ctx.db.replace(staff._id, {
          orgId: org._id,
          displayName: staff.displayName,
          specialties: [],
          role: staff.role,
          isActive: false,
          isDeleted: true,
          deletedAt: now,
          createdAt: staff.createdAt,
          updatedAt: now,
        });
      }
    for (const service of plan.records.services)
      if (plan.keep.has(service._id)) {
        await ctx.db.replace(service._id, {
          orgId: org._id,
          name: service.name,
          durationMins: service.durationMins,
          priceMinorUnits: service.priceMinorUnits,
          currency: service.currency,
          staffIds: [],
          isOpusVisible: false,
          popularityScore: 0,
          isActive: false,
          isDeleted: true,
          deletedAt: now,
          sortOrder: 0,
          createdAt: service.createdAt,
          updatedAt: now,
        });
      }
    for (const customer of plan.records.customers)
      if (plan.keep.has(customer._id)) {
        await ctx.db.replace(customer._id, {
          orgId: org._id,
          name: customer.name,
          opusUserId: customer.opusUserId,
          totalVisits: customer.totalVisits,
          totalSpendMinorUnits: customer.totalSpendMinorUnits,
          noShowCount: customer.noShowCount,
          noShowRiskScore: customer.noShowRiskScore,
          whatsappOptIn: false,
          marketingOptIn: false,
          gapRecoveryEmailOptIn: false,
          isDeleted: customer.isDeleted,
          createdAt: customer.createdAt,
          updatedAt: now,
        });
      }
    // Every row was read through the selected studio's by_org index. The client
    // supplies neither a table nor a document list, and audit rows never enter this loop.
    for (const rows of Object.values(plan.records))
      for (const row of rows) {
        if (!plan.keep.has(row._id)) await ctx.db.delete(row._id);
      }
    for (const user of plan.users)
      await ctx.db.patch(user._id, { activeOrgId: undefined, updatedAt: now });
    for (const id of plan.files.remove) await ctx.storage.delete(id);
    await ctx.db.replace(org._id, {
      name: org.name,
      slug: org.slug,
      industry: "beauty_wellness",
      plan: org.plan,
      listingStatus: "unpublished",
      websiteStatus: "unpublished",
      reviewCount: 0,
      averageRating: 0,
      isDeleted: true,
      deletedAt: now,
      ownerCleanupAt: now,
      createdAt: org.createdAt,
      updatedAt: now,
    });
    await ctx.db.patch(confirmation._id, { completedAt: now });
    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "user",
      actorId: owner._id,
      action: "owner.organization_deleted",
      resourceType: "orgs",
      resourceId: org._id,
      before: { name: org.name, slug: org.slug },
      after: { removed: plan.remove, retained: plan.retain, deletedAt: now },
      createdAt: now,
    });
    return { deleted: true };
  },
});
