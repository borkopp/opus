import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

export const getById = internalQuery({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return null;
        return org;
    }
});

// Compatibility query for older clients. New onboarding uses activation.getState.
export const getOnboardingOrg = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "staff");
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return null;
        return {
            _id: org._id,
            name: org.name,
            industry: org.industry,
            address: org.address,
            city: org.city,
            neighborhood: org.neighborhood,
            postalCode: org.postalCode,
            country: org.country,
            coordinates: org.coordinates,
            beautyCategory: org.beautyCategory,
            venueType: org.venueType,
            cuisine: org.cuisine,
            openingHours: org.openingHours,
            tagline: org.tagline,
            bio: org.bio,
        };
    },
});

// ─────────────────────────────────────────────────────
// Existing lookup queries
// ─────────────────────────────────────────────────────
export const getBySlug = query({
    args: { slug: v.string() },
    returns: v.union(v.null(), v.id("orgs")),
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
        if (!org || org.isDeleted) return null;
        return org._id;
    },
});

export const getByCustomDomain = query({
    args: { customDomain: v.string() },
    returns: v.union(v.null(), v.id("orgs")),
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query("orgs")
            .withIndex("by_custom_domain", (q) => q.eq("customDomain", args.customDomain))
            .first();
        if (!org || org.isDeleted) return null;
        return org._id;
    },
});

// Public query for Instagram webhook — look up org by Meta page ID
// (instagramPageId is not a secret; it's the public Facebook page ID)
export const getByInstagramPageId = query({
    args: { instagramPageId: v.string() },
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query("orgs")
            .withIndex("by_instagram_page_id", q => q.eq("instagramPageId", args.instagramPageId))
            .first();
        if (!org || org.isDeleted) return null;
        return org._id;
    },
});
