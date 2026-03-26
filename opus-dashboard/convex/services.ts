import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

export const listServices = query({
    args: {
        orgId: v.id("orgs"),
        categoryId: v.optional(v.id("service_categories")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        let q = ctx.db.query("services").withIndex("by_org", (q) => q.eq("orgId", args.orgId));

        const services = await q.filter((q) => q.eq(q.field("isDeleted"), false)).collect();

        let filtered = services;
        if (args.categoryId !== undefined) {
            filtered = filtered.filter(s => s.categoryId === args.categoryId);
        }
        if (args.isActive !== undefined) {
            filtered = filtered.filter(s => s.isActive === args.isActive);
        }

        return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

export const getService = query({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);
        const service = await ctx.db.get(args.serviceId);
        if (!service || service.orgId !== args.orgId || service.isDeleted) {
            return null;
        }
        return service;
    }
});

export const createService = mutation({
    args: {
        orgId: v.id("orgs"),
        name: v.string(),
        description: v.optional(v.string()),
        // Consumer-facing copy (shown on opus.mk)
        consumerDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        photoUrl: v.optional(v.string()),
        durationMins: v.number(),
        priceMinorUnits: v.number(),
        currency: v.string(),
        categoryId: v.optional(v.id("service_categories")),
        staffIds: v.array(v.id("staff_members")),
        sortOrder: v.number(),
        isOpusVisible: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        // Validations
        if (!Number.isInteger(args.priceMinorUnits) || args.priceMinorUnits < 0) {
            throw new ConvexError("Price must be a positive integer in minor units.");
        }

        const orgSettings = await ctx.db.query("org_settings").withIndex("by_org", q => q.eq("orgId", args.orgId)).first();
        if (!orgSettings) throw new ConvexError("Org settings not found.");

        if (args.durationMins <= 0 || args.durationMins % orgSettings.slotDurationMins !== 0) {
            throw new ConvexError(`Duration must be a positive multiple of ${orgSettings.slotDurationMins} minutes.`);
        }

        if (args.categoryId) {
            const category = await ctx.db.get(args.categoryId);
            if (!category || category.orgId !== args.orgId || category.isDeleted) {
                throw new ConvexError("Invalid category.");
            }
        }

        // Verify all staff members belong to the org and are not deleted
        for (const staffId of args.staffIds) {
            const sm = await ctx.db.get(staffId);
            if (!sm || sm.orgId !== args.orgId || sm.isDeleted) {
                throw new ConvexError(`Invalid staff member ID: ${staffId}`);
            }
        }

        const serviceId = await ctx.db.insert("services", {
            orgId: args.orgId,
            name: args.name,
            description: args.description,
            consumerDescription: args.consumerDescription,
            highlights: args.highlights,
            photoUrl: args.photoUrl,
            durationMins: args.durationMins,
            priceMinorUnits: args.priceMinorUnits,
            currency: args.currency,
            categoryId: args.categoryId,
            staffIds: args.staffIds,
            isOpusVisible: args.isOpusVisible ?? true,
            popularityScore: 0,
            isActive: true,
            isDeleted: false,
            sortOrder: args.sortOrder,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service.created",
            resourceType: "services",
            resourceId: serviceId,
            after: {
                id: serviceId,
                name: args.name,
                duration: args.durationMins,
                price: args.priceMinorUnits,
            },
            createdAt: Date.now(),
        });

        return serviceId;
    },
});

export const updateService = mutation({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),

        name: v.optional(v.string()),
        description: v.optional(v.string()),
        // Consumer-facing copy
        consumerDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        photoUrl: v.optional(v.string()),
        durationMins: v.optional(v.number()),
        priceMinorUnits: v.optional(v.number()),
        currency: v.optional(v.string()),
        categoryId: v.optional(v.union(v.id("service_categories"), v.null())),
        staffIds: v.optional(v.array(v.id("staff_members"))),
        isActive: v.optional(v.boolean()),
        isOpusVisible: v.optional(v.boolean()),
        sortOrder: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const service = await ctx.db.get(args.serviceId);
        if (!service || service.orgId !== args.orgId || service.isDeleted) {
            throw new ConvexError("Service not found.");
        }

        const updates: Partial<typeof service> = { updatedAt: Date.now() };

        if (args.priceMinorUnits !== undefined) {
            if (!Number.isInteger(args.priceMinorUnits) || args.priceMinorUnits < 0) {
                throw new ConvexError("Price must be a positive integer in minor units.");
            }
            updates.priceMinorUnits = args.priceMinorUnits;
        }

        if (args.durationMins !== undefined) {
            const orgSettings = await ctx.db.query("org_settings").withIndex("by_org", q => q.eq("orgId", args.orgId)).first();
            if (args.durationMins <= 0 || (orgSettings && args.durationMins % orgSettings.slotDurationMins !== 0)) {
                throw new ConvexError(`Duration must be a positive multiple of ${orgSettings?.slotDurationMins || 15} minutes.`);
            }
            updates.durationMins = args.durationMins;
        }

        if (args.categoryId !== undefined) {
            if (args.categoryId === null) {
                updates.categoryId = undefined;
            } else {
                const category = await ctx.db.get(args.categoryId);
                if (!category || category.orgId !== args.orgId || category.isDeleted) {
                    throw new ConvexError("Invalid category.");
                }
                updates.categoryId = args.categoryId;
            }
        }

        if (args.staffIds !== undefined) {
            for (const staffId of args.staffIds) {
                const sm = await ctx.db.get(staffId);
                if (!sm || sm.orgId !== args.orgId || sm.isDeleted) {
                    throw new ConvexError(`Invalid staff member ID: ${staffId}`);
                }
            }
            updates.staffIds = args.staffIds;
        }

        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        if (args.consumerDescription !== undefined) updates.consumerDescription = args.consumerDescription;
        if (args.highlights !== undefined) updates.highlights = args.highlights;
        if (args.photoUrl !== undefined) updates.photoUrl = args.photoUrl;
        if (args.currency !== undefined) updates.currency = args.currency;
        if (args.isActive !== undefined) updates.isActive = args.isActive;
        if (args.isOpusVisible !== undefined) updates.isOpusVisible = args.isOpusVisible;
        if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

        await ctx.db.patch(args.serviceId, updates);

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service.updated",
            resourceType: "services",
            resourceId: args.serviceId,
            before: service,
            after: { ...service, ...updates },
            createdAt: Date.now(),
        });

        // Recompute listing status if isActive changed
        if (args.isActive !== undefined) {
            await ctx.runMutation(internal.listing.recomputeListingStatus, { orgId: args.orgId });
        }

        return args.serviceId;
    }
});

export const deactivateService = mutation({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const service = await ctx.db.get(args.serviceId);
        if (!service || service.orgId !== args.orgId || service.isDeleted) {
            throw new ConvexError("Service not found.");
        }

        const updates = {
            isActive: false,
            isDeleted: true,
            deletedAt: Date.now(),
            updatedAt: Date.now(),
        };

        await ctx.db.patch(args.serviceId, updates);

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service.deactivated",
            resourceType: "services",
            resourceId: args.serviceId,
            before: service,
            after: { ...service, ...updates },
            createdAt: Date.now(),
        });

        // Recompute listing status — a service was deactivated
        await ctx.runMutation(internal.listing.recomputeListingStatus, { orgId: args.orgId });

        return null;
    }
});

export const reorderServices = mutation({
    args: {
        orgId: v.id("orgs"),
        serviceIds: v.array(v.id("services")), // Array in the new desired order
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const timestamp = Date.now();
        for (let i = 0; i < args.serviceIds.length; i++) {
            const serviceId = args.serviceIds[i];
            const service = await ctx.db.get(serviceId);

            if (service && service.orgId === args.orgId && !service.isDeleted && service.sortOrder !== i) {
                await ctx.db.patch(serviceId, { sortOrder: i, updatedAt: timestamp });
            }
        }

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "service.reordered",
            resourceType: "services",
            resourceId: args.serviceIds[0], // Arbitrary ID, just to satisfy schema
            createdAt: timestamp,
        });

        return null;
    }
});

export const getOrgSettings = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();
        return settings;
    }
});
