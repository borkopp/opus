// Admin mutations for the Skopje scraper pipeline.
//
// All public functions require adminKey matching process.env.ADMIN_API_KEY.
// The standalone review app (opus-scraper-admin/) calls these directly via
// ConvexHttpClient using the deployment URL — no user session required.

import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

function assertAdmin(key: string) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) throw new Error("ADMIN_API_KEY not configured in Convex env");
  if (key !== expected) throw new ConvexError("Unauthorized");
}

// ── Upsert ─────────────────────────────────────────────────────────────────

const upsertPayload = {
  adminKey: v.string(),
  name: v.string(),
  slug: v.string(),
  industry: v.union(v.literal("beauty_wellness"), v.literal("hospitality")),
  venueType: v.optional(v.union(
    v.literal("restaurant"),
    v.literal("cafe"),
    v.literal("bar"),
    v.literal("club"),
    v.literal("hotel"),
  )),
  cuisine: v.optional(v.array(v.string())),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),
  coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  phone: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  instagramHandle: v.optional(v.string()),
  tagline: v.optional(v.string()),
  bio: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  priceRange: v.optional(v.union(
    v.literal("budget"),
    v.literal("mid"),
    v.literal("premium"),
  )),
  openingHours: v.optional(v.array(v.object({
    dayOfWeek: v.number(),
    open: v.string(),
    close: v.string(),
    isClosed: v.boolean(),
  }))),
  menuText: v.optional(v.string()),
  googlePlaceId: v.optional(v.string()),
  woltSlug: v.optional(v.string()),
  glovoSlug: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  photos: v.optional(v.array(v.object({
    url: v.string(),
    type: v.union(
      v.literal("cover"),
      v.literal("gallery"),
      v.literal("menu"),
    ),
    caption: v.optional(v.string()),
  }))),
};

export const upsertScrapedOrg = mutation({
  args: upsertPayload,
  returns: v.object({ id: v.id("orgs"), action: v.string() }),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const now = Date.now();

    // Dedup: prefer googlePlaceId, fall back to name match within the city.
    let existing = null;
    if (args.googlePlaceId) {
      existing = await ctx.db
        .query("orgs")
        .withIndex("by_google_place", (q) => q.eq("googlePlaceId", args.googlePlaceId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();
    }
    if (!existing && args.city) {
      existing = await ctx.db
        .query("orgs")
        .withIndex("by_source", (q) => q.eq("source", "scraped"))
        .filter((q) =>
          q.and(
            q.eq(q.field("isDeleted"), false),
            q.eq(q.field("name"), args.name),
            q.eq(q.field("city"), args.city),
          )
        )
        .first();
    }

    const orgData = {
      name: args.name,
      slug: args.slug,
      industry: args.industry,
      venueType: args.venueType,
      cuisine: args.cuisine,
      address: args.address,
      city: args.city,
      neighborhood: args.neighborhood,
      postalCode: args.postalCode,
      country: args.country,
      coordinates: args.coordinates,
      phone: args.phone,
      websiteUrl: args.websiteUrl,
      instagramHandle: args.instagramHandle,
      tagline: args.tagline,
      bio: args.bio,
      tags: args.tags,
      priceRange: args.priceRange,
      openingHours: args.openingHours,
      menuText: args.menuText,
      googlePlaceId: args.googlePlaceId,
      woltSlug: args.woltSlug,
      glovoSlug: args.glovoSlug,
      logoUrl: args.logoUrl,
      lastScrapedAt: now,
      updatedAt: now,
    };

    let orgId: Id<"orgs">;
    let action: string;

    if (existing) {
      await ctx.db.patch(existing._id, orgData);
      orgId = existing._id;
      action = "updated";
    } else {
      orgId = await ctx.db.insert("orgs", {
        ...orgData,
        source: "scraped",
        claimStatus: "unclaimed",
        reviewStatus: "needs_review",
        listingStatus: "unpublished",
        plan: "starter",
        planStatus: "canceled",
        reviewCount: 0,
        averageRating: 0,
        isDeleted: false,
        createdAt: now,
      });
      action = "inserted";
    }

    // Write photos to org_media (skip if no photos provided).
    if (args.photos && args.photos.length > 0) {
      const existingMedia = await ctx.db
        .query("org_media")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();

      // Only insert photos whose URL doesn't already exist.
      const existingUrls = new Set(existingMedia.map((m) => m.url));
      let sortOrder = existingMedia.length;
      for (const photo of args.photos) {
        if (!existingUrls.has(photo.url)) {
          await ctx.db.insert("org_media", {
            orgId,
            url: photo.url,
            type: photo.type,
            caption: photo.caption,
            sortOrder: sortOrder++,
            isDeleted: false,
            uploadedAt: now,
            updatedAt: now,
          });
        }
      }
    }

    await ctx.runMutation(internal.auditLog.insertAuditLog, {
      orgId,
      actorType: "system",
      actorId: "scraper",
      action: `scraped_org_${action}`,
      resourceType: "org",
      resourceId: orgId,
      after: { name: args.name, googlePlaceId: args.googlePlaceId },
    });

    return { id: orgId, action };
  },
});

// ── List (for review UI) ─────────────────────────────────────────────────────

export const listScrapedOrgs = query({
  args: {
    adminKey: v.string(),
    reviewStatus: v.optional(v.union(
      v.literal("needs_review"),
      v.literal("in_progress"),
      v.literal("ready"),
    )),
    missingField: v.optional(v.union(
      v.literal("openingHours"),
      v.literal("menuText"),
      v.literal("address"),
      v.literal("coordinates"),
      v.literal("phone"),
    )),
  },
  returns: v.array(v.object({
    _id: v.id("orgs"),
    name: v.string(),
    slug: v.string(),
    industry: v.union(v.literal("beauty_wellness"), v.literal("hospitality")),
    venueType: v.optional(v.union(
      v.literal("restaurant"),
      v.literal("cafe"),
      v.literal("bar"),
      v.literal("club"),
      v.literal("hotel"),
    )),
    cuisine: v.optional(v.array(v.string())),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    phone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    openingHours: v.optional(v.array(v.object({
      dayOfWeek: v.number(),
      open: v.string(),
      close: v.string(),
      isClosed: v.boolean(),
    }))),
    menuText: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    googlePlaceId: v.optional(v.string()),
    woltSlug: v.optional(v.string()),
    glovoSlug: v.optional(v.string()),
    listingStatus: v.union(
      v.literal("unpublished"),
      v.literal("published"),
      v.literal("suspended"),
    ),
    reviewStatus: v.optional(v.union(
      v.literal("needs_review"),
      v.literal("in_progress"),
      v.literal("ready"),
    )),
    reviewerNotes: v.optional(v.string()),
    lastScrapedAt: v.optional(v.number()),
    createdAt: v.number(),
    photoCount: v.number(),
    priceRange: v.optional(v.union(
      v.literal("budget"),
      v.literal("mid"),
      v.literal("premium"),
    )),
    tags: v.optional(v.array(v.string())),
  })),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    let orgs;
    if (args.reviewStatus) {
      orgs = await ctx.db
        .query("orgs")
        .withIndex("by_source_review", (q) =>
          q.eq("source", "scraped").eq("reviewStatus", args.reviewStatus)
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else {
      orgs = await ctx.db
        .query("orgs")
        .withIndex("by_source", (q) => q.eq("source", "scraped"))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    }

    if (args.missingField) {
      const f = args.missingField;
      orgs = orgs.filter((o) => {
        const val = o[f as keyof typeof o];
        return val === undefined || val === null || val === "";
      });
    }

    // Attach photo counts.
    const results = await Promise.all(
      orgs.map(async (org) => {
        const photos = await ctx.db
          .query("org_media")
          .withIndex("by_org", (q) => q.eq("orgId", org._id))
          .collect();
        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          industry: org.industry,
          venueType: org.venueType,
          cuisine: org.cuisine,
          address: org.address,
          city: org.city,
          neighborhood: org.neighborhood,
          phone: org.phone,
          websiteUrl: org.websiteUrl,
          coordinates: org.coordinates,
          openingHours: org.openingHours,
          menuText: org.menuText,
          logoUrl: org.logoUrl,
          googlePlaceId: org.googlePlaceId,
          woltSlug: org.woltSlug,
          glovoSlug: org.glovoSlug,
          listingStatus: org.listingStatus,
          reviewStatus: org.reviewStatus,
          reviewerNotes: org.reviewerNotes,
          lastScrapedAt: org.lastScrapedAt,
          createdAt: org.createdAt,
          priceRange: org.priceRange,
          tags: org.tags,
          photoCount: photos.length,
        };
      })
    );

    return results;
  },
});

// ── Update (inline edit from review UI) ─────────────────────────────────────

export const updateScrapedOrg = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("orgs"),
    patch: v.object({
      name: v.optional(v.string()),
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      neighborhood: v.optional(v.string()),
      phone: v.optional(v.string()),
      websiteUrl: v.optional(v.string()),
      tagline: v.optional(v.string()),
      bio: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      cuisine: v.optional(v.array(v.string())),
      priceRange: v.optional(v.union(
        v.literal("budget"),
        v.literal("mid"),
        v.literal("premium"),
      )),
      venueType: v.optional(v.union(
        v.literal("restaurant"),
        v.literal("cafe"),
        v.literal("bar"),
        v.literal("club"),
        v.literal("hotel"),
      )),
      openingHours: v.optional(v.array(v.object({
        dayOfWeek: v.number(),
        open: v.string(),
        close: v.string(),
        isClosed: v.boolean(),
      }))),
      menuText: v.optional(v.string()),
      reviewStatus: v.optional(v.union(
        v.literal("needs_review"),
        v.literal("in_progress"),
        v.literal("ready"),
      )),
      reviewerNotes: v.optional(v.string()),
      coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const org = await ctx.db.get(args.id);
    if (!org || org.isDeleted) throw new ConvexError("Not found");

    await ctx.db.patch(args.id, { ...args.patch, updatedAt: Date.now() });

    await ctx.runMutation(internal.auditLog.insertAuditLog, {
      orgId: args.id,
      actorType: "system",
      actorId: "scraper-admin",
      action: "scraped_org_edited",
      resourceType: "org",
      resourceId: args.id,
      after: args.patch,
    });

    return null;
  },
});

// ── Publish (sets listingStatus=published + schedules embedding) ─────────────

export const setScrapedOrgPublished = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("orgs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const org = await ctx.db.get(args.id);
    if (!org || org.isDeleted) throw new ConvexError("Not found");
    if (org.source !== "scraped") throw new ConvexError("Not a scraped org");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      listingStatus: "published",
      publishedAt: org.publishedAt ?? now,
      reviewStatus: "ready",
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
      entityType: "org",
      entityId: args.id,
    });

    await ctx.runMutation(internal.auditLog.insertAuditLog, {
      orgId: args.id,
      actorType: "system",
      actorId: "scraper-admin",
      action: "scraped_org_published",
      resourceType: "org",
      resourceId: args.id,
      after: { listingStatus: "published" },
    });

    return null;
  },
});

// ── Stats (dashboard summary) ────────────────────────────────────────────────

export const getScraperStats = query({
  args: { adminKey: v.string() },
  returns: v.object({
    total: v.number(),
    needs_review: v.number(),
    in_progress: v.number(),
    ready: v.number(),
    published: v.number(),
    missingHours: v.number(),
    missingMenu: v.number(),
    missingPhotos: v.number(),
    missingCoords: v.number(),
  }),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_source", (q) => q.eq("source", "scraped"))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    let needs_review = 0, in_progress = 0, ready = 0, published = 0;
    let missingHours = 0, missingMenu = 0, missingPhotos = 0, missingCoords = 0;

    const mediaCountMap = new Map<string, number>();
    const allMedia = await ctx.db.query("org_media").collect();
    for (const m of allMedia) {
      mediaCountMap.set(m.orgId, (mediaCountMap.get(m.orgId) ?? 0) + 1);
    }

    for (const org of orgs) {
      if (org.reviewStatus === "needs_review") needs_review++;
      else if (org.reviewStatus === "in_progress") in_progress++;
      else if (org.reviewStatus === "ready") ready++;
      if (org.listingStatus === "published") published++;
      if (!org.openingHours || org.openingHours.length === 0) missingHours++;
      if (!org.menuText) missingMenu++;
      if (!org.coordinates) missingCoords++;
      if ((mediaCountMap.get(org._id) ?? 0) === 0) missingPhotos++;
    }

    return {
      total: orgs.length,
      needs_review,
      in_progress,
      ready,
      published,
      missingHours,
      missingMenu,
      missingPhotos,
      missingCoords,
    };
  },
});

// ── Bulk: mark complete orgs as ready ────────────────────────────────────────
// "Complete" = has menuText + openingHours + coordinates + at least one photo.

export const bulkMarkReady = mutation({
  args: { adminKey: v.string() },
  returns: v.object({ marked: v.number() }),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_source", (q) => q.eq("source", "scraped"))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const now = Date.now();
    let marked = 0;

    for (const org of orgs) {
      if (org.reviewStatus === "ready" || org.listingStatus === "published") continue;

      const hasMenu = !!org.menuText;
      const hasHours = !!(org.openingHours && org.openingHours.length > 0);
      const hasCoords = !!org.coordinates;

      if (!hasMenu || !hasHours || !hasCoords) continue;

      const photoCount = await ctx.db
        .query("org_media")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect()
        .then((m) => m.length);

      if (photoCount === 0) continue;

      await ctx.db.patch(org._id, { reviewStatus: "ready", updatedAt: now });
      marked++;
    }

    return { marked };
  },
});

// ── Bulk: publish all ready orgs ──────────────────────────────────────────────

export const bulkPublishReady = mutation({
  args: { adminKey: v.string() },
  returns: v.object({ published: v.number() }),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_source_review", (q) =>
        q.eq("source", "scraped").eq("reviewStatus", "ready")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("listingStatus"), "published"),
        )
      )
      .collect();

    const now = Date.now();
    let published = 0;

    for (const org of orgs) {
      await ctx.db.patch(org._id, {
        listingStatus: "published",
        publishedAt: org.publishedAt ?? now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
        entityType: "org",
        entityId: org._id,
      });
      published++;
    }

    return { published };
  },
});

// ── Soft delete all scraped orgs (function name retained for API compatibility) ─

export const hardDeleteAllScraped = mutation({
  args: { adminKey: v.string() },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_source", (q) => q.eq("source", "scraped"))
      .collect();

    let deleted = 0;
    for (const org of orgs) {
      if (org.isDeleted) continue;
      const now = Date.now();

      const media = await ctx.db
        .query("org_media")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect();
      for (const item of media) {
        if (!item.isDeleted) {
          await ctx.db.patch(item._id, {
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          });
        }
      }

      const embeddings = await ctx.db
        .query("marketplace_embeddings")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect();
      for (const embedding of embeddings) {
        if (!embedding.isDeleted) {
          await ctx.db.patch(embedding._id, {
            isPublished: false,
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          });
        }
      }

      await ctx.db.patch(org._id, {
        listingStatus: "unpublished",
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("audit_log", {
        orgId: org._id,
        actorType: "system",
        action: "scraped_org.soft_deleted",
        resourceType: "orgs",
        resourceId: org._id,
        before: { listingStatus: org.listingStatus, isDeleted: org.isDeleted },
        after: { listingStatus: "unpublished", isDeleted: true },
        createdAt: now,
      });
      deleted++;
    }

    return { deleted };
  },
});

// ── Clear opening hours from all scraped orgs ────────────────────────────────

export const clearAllHours = mutation({
  args: { adminKey: v.string() },
  returns: v.object({ cleared: v.number() }),
  handler: async (ctx, args) => {
    assertAdmin(args.adminKey);

    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_source", (q) => q.eq("source", "scraped"))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const now = Date.now();
    let cleared = 0;

    for (const org of orgs) {
      if (!org.openingHours || org.openingHours.length === 0) continue;
      await ctx.db.patch(org._id, { openingHours: undefined, updatedAt: now });
      cleared++;
    }

    return { cleared };
  },
});

// ── Internal: slug uniqueness helper ─────────────────────────────────────────

export const isSlugAvailable = internalMutation({
  args: { slug: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return existing === null;
  },
});
