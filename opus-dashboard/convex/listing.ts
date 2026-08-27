import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { getBeautyActivationState } from "./lib/activation";
import { requireActiveOrg, requireRole } from "./lib/auth";

export const getListingReadiness = query({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    const { orgId } = await requireActiveOrg(ctx, args.orgId);
    const state = await getBeautyActivationState(ctx, orgId);
    if (!state) return null;

    const blocking = Object.fromEntries(
      state.requirements.map((item) => [item.code, item.complete]),
    );
    const recommended = {
      tagline: Boolean(state.org.tagline?.trim()),
      bio: Boolean(state.org.bio?.trim()),
      phone: Boolean(state.org.phone?.trim()),
      gallery: state.media.some((item) => item.type === "gallery"),
    };

    return {
      listingStatus: state.org.listingStatus,
      publishedAt: state.org.publishedAt,
      requirements: state.requirements,
      blocking,
      recommended,
      allBlockingMet: state.allRequiredComplete,
      operationalSetupComplete: state.operationalSetupComplete,
      recommendedCount: Object.values(recommended).filter(Boolean).length,
      recommendedTotal: Object.keys(recommended).length,
      nextStep: state.nextStep,
    };
  },
});

export const publishOrg = mutation({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      args.orgId,
      "owner",
    );
    if (org.industry !== "beauty_wellness") {
      throw new ConvexError("Hospitality publishing is coming soon.");
    }

    const state = await getBeautyActivationState(ctx, orgId);
    if (!state) throw new ConvexError("Business not found.");
    const incomplete = state.requirements.filter((item) => !item.complete);
    if (incomplete.length > 0) {
      throw new ConvexError(
        `Cannot publish: ${incomplete.map((item) => item.label).join(", ")}.`,
      );
    }
    if (org.listingStatus === "published") return orgId;

    const now = Date.now();
    await ctx.db.patch(orgId, {
      listingStatus: "published",
      publishedAt: org.publishedAt ?? now,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org.published",
      resourceType: "orgs",
      resourceId: orgId,
      before: { listingStatus: org.listingStatus },
      after: { listingStatus: "published" },
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.marketplace.embeddings.embedEntity,
      { entityType: "org", entityId: orgId },
    );
    return orgId;
  },
});

export const unpublishOrg = mutation({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      args.orgId,
      "owner",
    );
    if (org.listingStatus === "unpublished") return orgId;

    const now = Date.now();
    await ctx.db.patch(orgId, {
      listingStatus: "unpublished",
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org.unpublished",
      resourceType: "orgs",
      resourceId: orgId,
      before: { listingStatus: org.listingStatus },
      after: { listingStatus: "unpublished" },
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.marketplace.embeddings.embedEntity,
      { entityType: "org", entityId: orgId },
    );
    return orgId;
  },
});

export const recomputeListingStatus = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const state = await getBeautyActivationState(ctx, args.orgId);
    if (!state) return;

    const currentStatus = state.org.listingStatus;
    let nextStatus = currentStatus;
    if (currentStatus === "published" && !state.allRequiredComplete) {
      nextStatus = "suspended";
    } else if (currentStatus === "suspended" && state.allRequiredComplete) {
      nextStatus = "published";
    }
    if (nextStatus === currentStatus) return;

    const now = Date.now();
    await ctx.db.patch(args.orgId, {
      listingStatus: nextStatus,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action: `org.listing_status.${nextStatus}`,
      resourceType: "orgs",
      resourceId: args.orgId,
      before: { listingStatus: currentStatus },
      after: {
        listingStatus: nextStatus,
        incompleteRequirements: state.requirements
          .filter((item) => !item.complete)
          .map((item) => item.code),
      },
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.marketplace.embeddings.embedEntity,
      { entityType: "org", entityId: args.orgId },
    );
  },
});
