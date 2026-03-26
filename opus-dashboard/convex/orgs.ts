import { query, mutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./lib/auth";

export const getById = internalQuery({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return null;
        return org;
    }
});

// Public client query — used by onboarding to resume progress after a refresh.
export const getOnboardingOrg = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return null;
        // Return only what the onboarding wizard needs
        return {
            _id: org._id,
            name: org.name,
            industry: org.industry,
            onboardingStep: org.onboardingStep,
            isOnboardingComplete: org.isOnboardingComplete,
        };
    },
});

export const createOrg = mutation({
    args: {
        name: v.string(),
        industry: v.union(v.literal("beauty_wellness"), v.literal("hospitality")),
    },
    returns: v.id("orgs"),
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user || user.isDeleted) {
            throw new ConvexError("User not found or deleted");
        }

        // Prevent duplicate orgs — if the user already owns an org, return it
        const existingStaffMembership = await ctx.db
            .query("staff_members")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("role"), "owner"))
            .first();

        if (existingStaffMembership) {
            const ownedOrg = await ctx.db.get(existingStaffMembership.orgId);
            if (ownedOrg && !ownedOrg.isDeleted) {
                return ownedOrg._id;
            }
        }

        const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const existingOrg = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        if (existingOrg) {
            throw new ConvexError("An organisation with this name already exists.");
        }

        const orgId = await ctx.db.insert("orgs", {
            name: args.name,
            slug,
            industry: args.industry,
            plan: "starter",
            planStatus: "trialing",
            // Marketplace defaults
            isPublished: false,
            reviewCount: 0,
            averageRating: 0,
            // Onboarding
            onboardingStep: 1,
            isOnboardingComplete: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("org_settings", {
            orgId,
            // MKD / Macedonia defaults
            timezone: "Europe/Belgrade",
            currency: "MKD",
            locale: "mk-MK",
            slotDurationMins: 15,
            bookingWindowDays: 60,
            cancellationWindowHours: 24,
            bufferTimeMins: 0,
            depositRequired: false,
            depositType: "fixed",
            depositValue: 0,
            surgePricingEnabled: false,
            reminderHoursBefore: [24, 2],
            smsEnabled: false,
            emailEnabled: true,
            whatsappEnabled: false,
            aiEnabled: false,
            aiPersonaName: "Assistant",
            aiConfidenceThreshold: 0.7,
            updatedAt: Date.now(),
        });

        await ctx.db.insert("staff_members", {
            orgId,
            userId: user._id,
            displayName: user.name ?? "Owner",
            avatarUrl: user.avatarUrl,
            specialties: [],
            role: "owner",
            isActive: true,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId,
            actorType: "user",
            actorId: user._id,
            action: "org.created",
            resourceType: "orgs",
            resourceId: orgId,
            after: { orgId, name: args.name, slug, industry: args.industry },
            createdAt: Date.now(),
        });

        return orgId;
    },
});

// ─────────────────────────────────────────────────────
// Update profile — location, bio, tags, opening hours,
// contact, branding, hospitality-specific fields.
// Called by the onboarding wizard and settings pages.
// ─────────────────────────────────────────────────────
export const updateProfile = mutation({
    args: {
        orgId: v.id("orgs"),

        // Core
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        brandColors: v.optional(v.object({
            primary: v.string(),
            secondary: v.string(),
            accent: v.string(),
        })),

        // Location
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        neighborhood: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
        coordinates: v.optional(v.object({
            lat: v.number(),
            lng: v.number(),
        })),

        // Listing copy
        tagline: v.optional(v.string()),
        bio: v.optional(v.string()),

        // Discovery
        tags: v.optional(v.array(v.string())),
        priceRange: v.optional(v.union(
            v.literal("budget"),
            v.literal("mid"),
            v.literal("premium"),
        )),

        // Contact & social
        phone: v.optional(v.string()),
        instagramHandle: v.optional(v.string()),
        websiteUrl: v.optional(v.string()),

        // Opening hours
        openingHours: v.optional(v.array(v.object({
            dayOfWeek: v.number(),
            open: v.string(),
            close: v.string(),
            isClosed: v.boolean(),
        }))),

        // Hospitality-specific
        cuisine: v.optional(v.array(v.string())),
        venueType: v.optional(v.union(
            v.literal("restaurant"),
            v.literal("cafe"),
            v.literal("bar"),
            v.literal("club"),
            v.literal("hotel"),
        )),

        // Onboarding step progress
        onboardingStep: v.optional(v.number()),
        isOnboardingComplete: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { orgId, ...fields } = args;
        await requireRole(ctx, orgId, "manager");

        const org = await ctx.db.get(orgId);
        if (!org || org.isDeleted) throw new ConvexError("Org not found.");

        const updates: Record<string, unknown> = { updatedAt: Date.now() };

        // Apply only defined fields
        const optionalFields = [
            "name", "logoUrl", "brandColors",
            "address", "city", "neighborhood", "postalCode", "country", "coordinates",
            "tagline", "bio",
            "tags", "priceRange",
            "phone", "instagramHandle", "websiteUrl",
            "openingHours",
            "cuisine", "venueType",
            "onboardingStep", "isOnboardingComplete",
        ] as const;

        for (const key of optionalFields) {
            if (fields[key] !== undefined) {
                updates[key] = fields[key];
            }
        }

        await ctx.db.patch(orgId, updates);

        await ctx.db.insert("audit_log", {
            orgId,
            actorType: "staff",
            action: "org.profileUpdated",
            resourceType: "orgs",
            resourceId: orgId,
            before: org,
            after: { ...org, ...updates },
            createdAt: Date.now(),
        });
    },
});

// ─────────────────────────────────────────────────────
// Publish / unpublish to opus.mk
// ─────────────────────────────────────────────────────
export const updatePublishStatus = mutation({
    args: {
        orgId: v.id("orgs"),
        isPublished: v.boolean(),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "owner");

        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) throw new ConvexError("Org not found.");

        // Require onboarding to be complete before publishing
        if (args.isPublished && !org.isOnboardingComplete) {
            throw new ConvexError("Complete onboarding before publishing to opus.mk.");
        }

        const now = Date.now();
        await ctx.db.patch(args.orgId, {
            isPublished: args.isPublished,
            publishedAt: args.isPublished ? (org.publishedAt ?? now) : undefined,
            updatedAt: now,
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            action: args.isPublished ? "org.published" : "org.unpublished",
            resourceType: "orgs",
            resourceId: args.orgId,
            before: { isPublished: org.isPublished },
            after: { isPublished: args.isPublished },
            createdAt: now,
        });
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
