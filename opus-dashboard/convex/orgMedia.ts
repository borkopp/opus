import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────
// List all media for an org, ordered by type then sortOrder.
// ─────────────────────────────────────────────────────
export const listByOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "staff");
    const media = await ctx.db
      .query("org_media")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();
    return media.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireRole(ctx, undefined, "staff");
    return await ctx.storage.generateUploadUrl();
  },
});

// ─────────────────────────────────────────────────────
// Add a media item.
// ─────────────────────────────────────────────────────
export const addMedia = mutation({
  args: {
    orgId: v.id("orgs"),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    type: v.union(
      v.literal("cover"),
      v.literal("gallery"),
      v.literal("menu"),
      v.literal("team"),
    ),
    caption: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    let finalUrl = args.url;
    if (args.storageId) {
      finalUrl = (await ctx.storage.getUrl(args.storageId)) ?? undefined;
    }

    if (!finalUrl) {
      throw new ConvexError("Must provide either a valid url or storageId");
    }

    const now = Date.now();
    if (args.type === "cover") {
      const covers = await ctx.db
        .query("org_media")
        .withIndex("by_org_type_active", (q) =>
          q.eq("orgId", args.orgId).eq("type", "cover").eq("isDeleted", false),
        )
        .collect();
      for (const cover of covers) {
        await ctx.db.patch(cover._id, {
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        });
      }
    }

    if (args.type === "gallery") {
      const activeGallery = await ctx.db
        .query("org_media")
        .withIndex("by_org_type_active", (q) =>
          q.eq("orgId", args.orgId).eq("type", "gallery").eq("isDeleted", false),
        )
        .collect();
      if (activeGallery.length >= 3) {
        throw new ConvexError("Maximum of 3 gallery photos allowed.");
      }
    }

    const mediaId = await ctx.db.insert("org_media", {
      orgId: args.orgId,
      url: finalUrl,
      type: args.type,
      caption: args.caption,
      sortOrder: args.sortOrder,
      isDeleted: false,
      uploadedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org_media.added",
      resourceType: "org_media",
      resourceId: mediaId,
      after: { type: args.type, url: finalUrl },
      createdAt: now,
    });

    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });
    return mediaId;
  },
});

// ─────────────────────────────────────────────────────
// Remove a media item using the same soft-delete policy as other org records.
// ─────────────────────────────────────────────────────
export const removeMedia = mutation({
  args: {
    orgId: v.id("orgs"),
    mediaId: v.id("org_media"),
  },
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "manager");

    const media = await ctx.db.get(args.mediaId);
    if (!media || media.orgId !== args.orgId) {
      throw new ConvexError("Media not found.");
    }

    const now = Date.now();
    await ctx.db.patch(args.mediaId, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org_media.removed",
      resourceType: "org_media",
      resourceId: args.mediaId,
      before: { type: media.type, url: media.url },
      createdAt: now,
    });

    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });
  },
});

// ─────────────────────────────────────────────────────
// Reorder media. Accepts an ordered array of IDs and
// patches sortOrder to match.
// ─────────────────────────────────────────────────────
export const reorderMedia = mutation({
  args: {
    orgId: v.id("orgs"),
    mediaIds: v.array(v.id("org_media")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "manager");

    const timestamp = Date.now();
    for (let i = 0; i < args.mediaIds.length; i++) {
      const item = await ctx.db.get(args.mediaIds[i]);
      if (
        item &&
        item.orgId === args.orgId &&
        !item.isDeleted &&
        item.sortOrder !== i
      ) {
        await ctx.db.patch(args.mediaIds[i], {
          sortOrder: i,
          updatedAt: timestamp,
        });
      }
    }

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      action: "org_media.reordered",
      resourceType: "org_media",
      resourceId: args.orgId,
      after: { mediaIds: args.mediaIds },
      createdAt: timestamp,
    });
    return null;
  },
});
