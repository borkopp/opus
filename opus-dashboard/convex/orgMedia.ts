import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

// ─────────────────────────────────────────────────────
// List all media for an org, ordered by type then sortOrder.
// ─────────────────────────────────────────────────────
export const listByOrg = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const media = await ctx.db
            .query("org_media")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();
        return media.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
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

        const mediaId = await ctx.db.insert("org_media", {
            orgId: args.orgId,
            url: finalUrl,
            type: args.type,
            caption: args.caption,
            sortOrder: args.sortOrder,
            uploadedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: staffMember._id,
            action: "org_media.added",
            resourceType: "org_media",
            resourceId: mediaId,
            after: { type: args.type, url: finalUrl },
            createdAt: Date.now(),
        });

        return mediaId;
    },
});

// ─────────────────────────────────────────────────────
// Remove a media item (hard delete — media is replaceable,
// not a business record requiring soft-delete audit trail).
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

        await ctx.db.delete(args.mediaId);

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: staffMember._id,
            action: "org_media.removed",
            resourceType: "org_media",
            resourceId: args.mediaId,
            before: { type: media.type, url: media.url },
            createdAt: Date.now(),
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
            if (item && item.orgId === args.orgId && item.sortOrder !== i) {
                await ctx.db.patch(args.mediaIds[i], { sortOrder: i });
            }
        }
        return null;
    },
});
