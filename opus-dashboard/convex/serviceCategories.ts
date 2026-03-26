import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";

export const listCategories = query({
    args: { orgId: v.id("orgs") },
    returns: v.array(v.any()), // Can be refined to Document<"service_categories">
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        const categories = await ctx.db
            .query("service_categories")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .collect();

        return categories.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

export const createCategory = mutation({
    args: {
        orgId: v.id("orgs"),
        name: v.string(),
        sortOrder: v.number(),
    },
    returns: v.id("service_categories"),
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const categoryId = await ctx.db.insert("service_categories", {
            orgId: args.orgId,
            name: args.name,
            sortOrder: args.sortOrder,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service_category.created",
            resourceType: "service_categories",
            resourceId: categoryId,
            after: { id: categoryId, name: args.name, sortOrder: args.sortOrder },
            createdAt: Date.now(),
        });

        return categoryId;
    },
});

export const updateCategory = mutation({
    args: {
        orgId: v.id("orgs"),
        categoryId: v.id("service_categories"),
        name: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const category = await ctx.db.get(args.categoryId);
        if (!category || category.orgId !== args.orgId || category.isDeleted) {
            throw new ConvexError("Category not found");
        }

        const updates: Partial<typeof category> = { updatedAt: Date.now() };
        if (args.name !== undefined) updates.name = args.name;
        if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

        await ctx.db.patch(args.categoryId, updates);

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service_category.updated",
            resourceType: "service_categories",
            resourceId: args.categoryId,
            before: category,
            after: { ...category, ...updates },
            createdAt: Date.now(),
        });

        return null;
    }
});

export const deleteCategory = mutation({
    args: {
        orgId: v.id("orgs"),
        categoryId: v.id("service_categories"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const category = await ctx.db.get(args.categoryId);
        if (!category || category.orgId !== args.orgId || category.isDeleted) {
            throw new ConvexError("Category not found");
        }

        // Unlink or delete child services. For a soft delete, we'll unlink them (set categoryId to undefined).
        // Or we require the UI to clear them first. The prompt says: "soft delete; reassign or delete child services first"
        const childServices = await ctx.db
            .query("services")
            .withIndex("by_org_category", q => q.eq("orgId", args.orgId).eq("categoryId", args.categoryId))
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        if (childServices.length > 0) {
            throw new ConvexError("Cannot delete category with active services. Please reassign or delete the services first.");
        }

        const updates = {
            isDeleted: true,
            deletedAt: Date.now(),
            updatedAt: Date.now(),
        };

        await ctx.db.patch(args.categoryId, updates);

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service_category.deleted",
            resourceType: "service_categories",
            resourceId: args.categoryId,
            before: category,
            after: { ...category, ...updates },
            createdAt: Date.now(),
        });

        return null;
    }
});

export const reorderCategories = mutation({
    args: {
        orgId: v.id("orgs"),
        categoryIds: v.array(v.id("service_categories")), // Array in the new desired order
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const timestamp = Date.now();
        for (let i = 0; i < args.categoryIds.length; i++) {
            const catId = args.categoryIds[i];
            const category = await ctx.db.get(catId);

            if (category && category.orgId === args.orgId && !category.isDeleted && category.sortOrder !== i) {
                await ctx.db.patch(catId, { sortOrder: i, updatedAt: timestamp });

                // Reordering triggers many updates, maybe optional audit log for each, or omit for performance
                // We'll log it just in case
                await ctx.db.insert("audit_log", {
                    orgId: args.orgId,
                    actorType: "staff",
                    actorId: caller._id,
                    action: "service_category.reordered",
                    resourceType: "service_categories",
                    resourceId: catId,
                    before: { sortOrder: category.sortOrder },
                    after: { sortOrder: i },
                    createdAt: timestamp,
                });
            }
        }
        return null;
    }
});
