import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getBeautyActivationState } from "./lib/activation";
import { getWebsiteStatus } from "./lib/publication";
import { requireActiveOrg, requireRole } from "./lib/auth";
import { ensurePublishableTenantSlug } from "./lib/tenantSlug";

export const getReadiness = query({
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
      slug: state.org.slug,
      websiteStatus: getWebsiteStatus(state.org),
      websitePublishedAt: state.org.websitePublishedAt,
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

export const publish = mutation({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      args.orgId,
      "owner",
    );
    if (org.industry !== "beauty_wellness") {
      throw new ConvexError("Hospitality websites are coming soon.");
    }

    const state = await getBeautyActivationState(ctx, orgId);
    if (!state) throw new ConvexError("Business not found.");
    const incomplete = state.requirements.filter((item) => !item.complete);
    if (incomplete.length > 0) {
      throw new ConvexError(
        `Cannot publish website: ${incomplete.map((item) => item.label).join(", ")}.`,
      );
    }
    const slug = await ensurePublishableTenantSlug(ctx, org);
    const previousStatus = getWebsiteStatus(org);
    if (previousStatus === "published" && slug === org.slug) return orgId;

    const now = Date.now();
    await ctx.db.patch(orgId, {
      slug,
      websiteStatus: "published",
      websitePublishedAt: org.websitePublishedAt ?? now,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action:
        previousStatus === "published"
          ? "org.website.slug_repaired"
          : "org.website.published",
      resourceType: "orgs",
      resourceId: orgId,
      before: { websiteStatus: previousStatus, slug: org.slug },
      after: { websiteStatus: "published", slug },
      createdAt: now,
    });
    return orgId;
  },
});

export const unpublish = mutation({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    const { org, orgId, staffMember } = await requireRole(
      ctx,
      args.orgId,
      "owner",
    );
    if (getWebsiteStatus(org) === "unpublished") return orgId;

    const now = Date.now();
    await ctx.db.patch(orgId, {
      websiteStatus: "unpublished",
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org.website.unpublished",
      resourceType: "orgs",
      resourceId: orgId,
      before: { websiteStatus: getWebsiteStatus(org) },
      after: { websiteStatus: "unpublished" },
      createdAt: now,
    });
    return orgId;
  },
});
