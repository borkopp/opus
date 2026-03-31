import { v } from "convex/values";
import { query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC QUERIES — opus.mk
// ─────────────────────────────────────────────────────────────────────────────
//
// These queries require NO auth — they are called by the separate opus.mk
// Next.js project (and eventually the OPUS mobile app).
//
// All business data returned here is limited to published orgs (listingStatus: "published")
// and publicly-visible fields only. Internal ops data (payout splits, audit
// logs, noShowRiskScore etc.) is NEVER returned from these queries.
// ─────────────────────────────────────────────────────────────────────────────

// ─── List published orgs — paginated discovery feed ──────
// Filterable by city, industry, tags, priceRange.
// Results ordered by featured status → averageRating → reviewCount.
export const listPublished = query({
    args: {
        city: v.optional(v.string()),
        industry: v.optional(v.union(
            v.literal("beauty_wellness"),
            v.literal("hospitality"),
        )),
        beautyCategory: v.optional(v.union(
            v.literal("barbershop"),
            v.literal("hair_salon"),
            v.literal("nail_salon"),
            v.literal("spa"),
            v.literal("beauty_salon"),
            v.literal("lash_studio"),
            v.literal("brow_bar"),
            v.literal("tattoo_studio"),
            v.literal("massage_therapy"),
            v.literal("wellness_center"),
            v.literal("personal_trainer"),
        )),
        priceRange: v.optional(v.union(
            v.literal("budget"),
            v.literal("mid"),
            v.literal("premium"),
        )),
        // Paginate via cursor (Convex pagination)
        paginationOpts: v.optional(v.object({
            numItems: v.number(),
            cursor: v.union(v.string(), v.null()),
        })),
    },
    handler: async (ctx, args) => {
        // Base query: published + not deleted
        let orgsQuery = ctx.db
            .query("orgs")
            .withIndex("by_listing_status", (q) => q.eq("listingStatus", "published"))
            .filter((q) => q.eq(q.field("isDeleted"), false));

        const allOrgs = await orgsQuery.collect();

        // Filter in memory (Convex doesn't support multi-field index filtering on different fields)
        let filtered = allOrgs;

        if (args.city) {
            const cityLower = args.city.toLowerCase();
            filtered = filtered.filter(
                (o) => o.city?.toLowerCase() === cityLower
            );
        }

        if (args.industry) {
            filtered = filtered.filter((o) => o.industry === args.industry);
        }

        if (args.beautyCategory) {
            filtered = filtered.filter((o) => o.beautyCategory === args.beautyCategory);
        }

        if (args.priceRange) {
            filtered = filtered.filter((o) => o.priceRange === args.priceRange);
        }

        // Sort: featured first, then by rating, then by review count
        const now = Date.now();
        filtered.sort((a, b) => {
            const aFeatured = a.featuredUntil && a.featuredUntil > now ? 1 : 0;
            const bFeatured = b.featuredUntil && b.featuredUntil > now ? 1 : 0;
            if (bFeatured !== aFeatured) return bFeatured - aFeatured;
            if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
            return b.reviewCount - a.reviewCount;
        });

        // Simple manual pagination
        const numItems = args.paginationOpts?.numItems ?? 20;
        const cursor = args.paginationOpts?.cursor
            ? parseInt(args.paginationOpts.cursor, 10)
            : 0;
        const page = filtered.slice(cursor, cursor + numItems);
        const nextCursor = cursor + numItems < filtered.length
            ? String(cursor + numItems)
            : null;

        // Return only public-safe fields
        return {
            items: page.map((o) => ({
                _id: o._id,
                name: o.name,
                slug: o.slug,
                industry: o.industry,
                logoUrl: o.logoUrl,
                tagline: o.tagline,
                city: o.city,
                neighborhood: o.neighborhood,
                tags: o.tags,
                priceRange: o.priceRange,
                averageRating: o.averageRating,
                reviewCount: o.reviewCount,
                isFeatured: !!(o.featuredUntil && o.featuredUntil > now),
                beautyCategory: o.beautyCategory,
                cuisine: o.cuisine,
                venueType: o.venueType,
            })),
            nextCursor,
            totalCount: filtered.length,
        };
    },
});

// ─── Full public profile — for the listing/detail page ───
export const getPublicProfile = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!org || org.isDeleted || org.listingStatus !== "published") return null;

        // Fetch media
        const media = await ctx.db
            .query("org_media")
            .withIndex("by_org", (q) => q.eq("orgId", org._id))
            .collect();

        // Fetch published services
        const services = await ctx.db
            .query("services")
            .withIndex("by_org_active", (q) =>
                q.eq("orgId", org._id).eq("isActive", true)
            )
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isOpusVisible"), true))
            .collect();

        // Fetch service categories
        const categoryIds = [...new Set(services.map((s) => s.categoryId).filter(Boolean))];
        const categories = await Promise.all(
            categoryIds.map((id) => ctx.db.get(id!))
        );
        const categoryMap = Object.fromEntries(
            categories.filter(Boolean).map((c) => [c!._id, c!.name])
        );

        // Fetch staff with public bio (only those linked to a service)
        const staffIds = [...new Set(services.flatMap((s) => s.staffIds))];
        const staff = await Promise.all(
            staffIds.slice(0, 20).map((id) => ctx.db.get(id))
        );

        return {
            // Core identity
            _id: org._id,
            name: org.name,
            slug: org.slug,
            industry: org.industry,
            logoUrl: org.logoUrl,

            // Listing copy
            tagline: org.tagline,
            bio: org.bio,

            // Location
            address: org.address,
            city: org.city,
            neighborhood: org.neighborhood,
            coordinates: org.coordinates,

            // Contact & social
            phone: org.phone,
            instagramHandle: org.instagramHandle,
            websiteUrl: org.websiteUrl,

            // Hours
            openingHours: org.openingHours,

            // Discovery
            tags: org.tags,
            priceRange: org.priceRange,
            beautyCategory: org.beautyCategory,
            cuisine: org.cuisine,
            venueType: org.venueType,

            // Reviews summary
            averageRating: org.averageRating,
            reviewCount: org.reviewCount,

            // Media (sorted by sortOrder)
            media: media
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((m) => ({ _id: m._id, url: m.url, type: m.type, caption: m.caption })),

            // Services grouped by category
            services: services
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => ({
                    _id: s._id,
                    name: s.name,
                    consumerDescription: s.consumerDescription,
                    highlights: s.highlights,
                    photoUrl: s.photoUrl,
                    durationMins: s.durationMins,
                    priceMinorUnits: s.priceMinorUnits,
                    currency: s.currency,
                    categoryName: s.categoryId ? categoryMap[s.categoryId] : undefined,
                })),

            // Public staff profiles
            staff: staff
                .filter(Boolean)
                .filter((s) => s!.isActive && !s!.isDeleted)
                .map((s) => ({
                    _id: s!._id,
                    displayName: s!.displayName,
                    bio: s!.bio,
                    avatarUrl: s!.avatarUrl,
                    specialties: s!.specialties,
                })),
        };
    },
});

// ─── Public availability (no auth) ───────────────────
// Thin wrapper — the actual slot engine is in convex/slots.ts.
// This query forwards to it without auth checks so opus.mk can
// show availability to unauthenticated visitors.
export const getPublicAvailability = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.optional(v.id("staff_members")),
        serviceId: v.id("services"),
        date: v.string(),                // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        // Verify org is published
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted || org.listingStatus !== "published") return [];

        // Verify service is publicly visible
        const service = await ctx.db.get(args.serviceId);
        if (!service || service.isDeleted || !service.isActive || !service.isOpusVisible) return [];

        // Delegate to the existing slot computation (imported inline here
        // to avoid duplicating the availability logic — see convex/slots.ts)
        // For now return an empty array as a stub; the slots.ts function will
        // be refactored to share a `computeSlots` helper callable from both
        // staff-facing and public queries.
        return [];
    },
});

// ─── Text search across published orgs ───────────────
// Powers the opus.mk search bar. Returns lightweight cards.
export const searchPublished = query({
    args: {
        query: v.string(),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query("orgs")
            .withSearchIndex("search_by_name", (q) => {
                let search = q.search("name", args.query).eq("listingStatus", "published").eq("isDeleted", false);
                return search;
            })
            .take(20);

        const now = Date.now();
        const filtered = args.city
            ? results.filter((o) => o.city?.toLowerCase() === args.city!.toLowerCase())
            : results;

        return filtered.map((o) => ({
            _id: o._id,
            name: o.name,
            slug: o.slug,
            industry: o.industry,
            logoUrl: o.logoUrl,
            tagline: o.tagline,
            city: o.city,
            averageRating: o.averageRating,
            reviewCount: o.reviewCount,
            priceRange: o.priceRange,
            beautyCategory: o.beautyCategory,
        }));
    },
});
