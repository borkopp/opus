import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

export const getOrgSettings = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return null;

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        const media = await ctx.db
            .query("org_media")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .collect();

        return {
            org,
            settings,
            media: media.sort((a, b) => a.sortOrder - b.sortOrder),
        };
    }
});

export const updateOrgSettings = mutation({
    args: {
        orgId: v.id("orgs"),
        timezone: v.string(),
        currency: v.string(),
        locale: v.string(),
        slotDurationMins: v.number(),
        bookingWindowDays: v.number(),
        cancellationWindowHours: v.number(),
        bufferTimeMins: v.number(),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!settings) throw new Error("Settings not found");

        await ctx.db.patch(settings._id, {
            timezone: args.timezone,
            currency: args.currency,
            locale: args.locale,
            slotDurationMins: args.slotDurationMins,
            bookingWindowDays: args.bookingWindowDays,
            cancellationWindowHours: args.cancellationWindowHours,
            bufferTimeMins: args.bufferTimeMins,
            updatedAt: Date.now(),
        });

        return true;
    }
});

export const updateDepositSettings = mutation({
    args: {
        orgId: v.id("orgs"),
        depositRequired: v.boolean(),
        depositType: v.union(v.literal("fixed"), v.literal("percentage")),
        depositValue: v.number(),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!settings) throw new Error("Settings not found");

        await ctx.db.patch(settings._id, {
            depositRequired: args.depositRequired,
            depositType: args.depositType,
            depositValue: args.depositValue,
            updatedAt: Date.now(),
        });

        return true;
    }
});

export const updateSurgePricingRules = mutation({
    args: {
        orgId: v.id("orgs"),
        surgePricingEnabled: v.boolean(),
        surgeRules: v.optional(v.array(v.object({
            dayOfWeek: v.number(),
            startTime: v.string(),
            endTime: v.string(),
            multiplierPct: v.number(),
        }))),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!settings) throw new Error("Settings not found");

        await ctx.db.patch(settings._id, {
            surgePricingEnabled: args.surgePricingEnabled,
            surgeRules: args.surgeRules,
            updatedAt: Date.now(),
        });

        return true;
    }
});

export const updateNotificationSettings = mutation({
    args: {
        orgId: v.id("orgs"),
        smsEnabled: v.boolean(),
        emailEnabled: v.boolean(),
        whatsappEnabled: v.boolean(),
        reminderHoursBefore: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!settings) throw new Error("Settings not found");

        await ctx.db.patch(settings._id, {
            smsEnabled: args.smsEnabled,
            emailEnabled: args.emailEnabled,
            whatsappEnabled: args.whatsappEnabled,
            reminderHoursBefore: args.reminderHoursBefore,
            updatedAt: Date.now(),
        });

        return true;
    }
});

export const updateAiSettings = mutation({
    args: {
        orgId: v.id("orgs"),
        aiEnabled: v.boolean(),
        aiPersonaName: v.string(),
        aiConfidenceThreshold: v.number(),
        aiHandoffPhoneNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!settings) throw new Error("Settings not found");

        await ctx.db.patch(settings._id, {
            aiEnabled: args.aiEnabled,
            aiPersonaName: args.aiPersonaName,
            aiConfidenceThreshold: args.aiConfidenceThreshold,
            aiHandoffPhoneNumber: args.aiHandoffPhoneNumber,
            updatedAt: Date.now(),
        });

        return true;
    }
});

export const updateOrgBranding = mutation({
    args: {
        orgId: v.id("orgs"),
        name: v.string(),
        logoUrl: v.optional(v.string()),
        tagline: v.optional(v.string()),
        bio: v.optional(v.string()),
        phone: v.optional(v.string()),
        instagramHandle: v.optional(v.string()),
        websiteUrl: v.optional(v.string()),
        brandColors: v.optional(v.object({
            primary: v.string(),
            secondary: v.string(),
            accent: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) throw new Error("Org not found");

        await ctx.db.patch(args.orgId, {
            name: args.name,
            logoUrl: args.logoUrl,
            tagline: args.tagline,
            bio: args.bio,
            phone: args.phone,
            instagramHandle: args.instagramHandle,
            websiteUrl: args.websiteUrl,
            brandColors: args.brandColors,
            updatedAt: Date.now()
        });

        return true;
    }
});

export const connectCustomDomain = mutation({
    args: {
        orgId: v.id("orgs"),
        customDomain: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) throw new Error("Org not found");

        // Here we could optionally make a fetch() call to Vercel API via an internal action 
        // to actually provision the domain via Vercel Domains API if we had the keys configured natively.
        // For the MVP data boundary, we just write the intended domain directly to the DB schema so edge middleware can pick it up.

        await ctx.db.patch(args.orgId, {
            customDomain: args.customDomain,
            updatedAt: Date.now()
        });

        return true;
    }
});
