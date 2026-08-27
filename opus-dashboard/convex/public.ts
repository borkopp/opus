import { v } from "convex/values";
import { query } from "./_generated/server";
import { buildPublicProfile } from "./lib/publicProfile";
import { ACTIVE_INDUSTRY, isActiveIndustry } from "./lib/productScope";

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
        const orgsQuery = ctx.db
            .query("orgs")
            .withIndex("by_listing_status_deleted", (q) =>
                q.eq("listingStatus", "published").eq("isDeleted", false)
            );

        const allOrgs = await orgsQuery.collect();

        // Filter in memory (Convex doesn't support multi-field index filtering on different fields)
        let filtered = allOrgs.filter((org) => isActiveIndustry(org.industry));

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

        // Fetch covers
        const covers = await Promise.all(page.map(o =>
            ctx.db
                .query("org_media")
                .withIndex("by_org_type_active", (q) =>
                    q.eq("orgId", o._id).eq("type", "cover").eq("isDeleted", false)
                )
                .order("asc")
                .first()
        ));

        // Return only public-safe fields
        return {
            items: page.map((o, i) => ({
                _id: o._id,
                name: o.name,
                slug: o.slug,
                industry: o.industry,
                logoUrl: o.logoUrl,
                coverImageUrl: covers[i]?.url,
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
                coordinates: o.coordinates,
                openingHours: o.openingHours,
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

        if (
            !org ||
            org.isDeleted ||
            org.listingStatus !== "published" ||
            !isActiveIndustry(org.industry)
        ) return null;

        return await buildPublicProfile(ctx, org);
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
                const search = q.search("name", args.query).eq("listingStatus", "published").eq("isDeleted", false);
                return search;
            })
            .take(20);

        const now = Date.now();
        const activeResults = results.filter((org) => org.industry === ACTIVE_INDUSTRY);
        const filtered = args.city
            ? activeResults.filter((o) => o.city?.toLowerCase() === args.city!.toLowerCase())
            : activeResults;

        const covers = await Promise.all(filtered.map(o =>
            ctx.db
                .query("org_media")
                .withIndex("by_org_type_active", (q) =>
                    q.eq("orgId", o._id).eq("type", "cover").eq("isDeleted", false)
                )
                .order("asc")
                .first()
        ));

        return filtered.map((o, i) => ({
            _id: o._id,
            name: o.name,
            slug: o.slug,
            industry: o.industry,
            logoUrl: o.logoUrl,
            coverImageUrl: covers[i]?.url,
            tagline: o.tagline,
            city: o.city,
            neighborhood: o.neighborhood,
            tags: o.tags,
            averageRating: o.averageRating,
            reviewCount: o.reviewCount,
            priceRange: o.priceRange,
            beautyCategory: o.beautyCategory,
            cuisine: o.cuisine,
            venueType: o.venueType,
            coordinates: o.coordinates,
            openingHours: o.openingHours,
            isFeatured: !!(o.featuredUntil && o.featuredUntil > now),
        }));
    },
});
