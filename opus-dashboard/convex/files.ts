import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const generateUploadUrl = mutation({
    args: {
        orgId: v.id("orgs"),
    },
    returns: v.string(),
    handler: async (ctx, args) => {
        // Only authenticated members of the org can generate an upload URL
        await requireAuth(ctx, args.orgId);
        return await ctx.storage.generateUploadUrl();
    },
});

export const getFileUrl = query({
    args: { storageId: v.id("_storage") },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    }
});
