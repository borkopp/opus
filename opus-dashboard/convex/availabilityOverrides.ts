import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";

export const createOverride = mutation({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
        date: v.string(), // "2026-08-25" ISO date
        type: v.union(v.literal("day_off"), v.literal("custom_hours")),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const targetStaff = await ctx.db.get(args.staffId);
        if (!targetStaff || targetStaff.orgId !== args.orgId || targetStaff.isDeleted) {
            throw new ConvexError("Staff member not found or inactive.");
        }

        // Check if an override already exists for this date, if so replace it
        const existingDateOverride = await ctx.db
            .query("availability_overrides")
            .withIndex("by_staff_date", q => q.eq("staffId", args.staffId).eq("date", args.date))
            .first();

        const timestamp = Date.now();
        let overrideId;

        if (existingDateOverride) {
            overrideId = existingDateOverride._id;
            await ctx.db.patch(overrideId, {
                type: args.type,
                startTime: args.type === "custom_hours" ? args.startTime : undefined,
                endTime: args.type === "custom_hours" ? args.endTime : undefined,
                note: args.note,
                isDeleted: false,
                deletedAt: undefined,
                updatedAt: timestamp,
            });

            await ctx.db.insert("audit_log", {
                orgId: args.orgId,
                actorType: "staff",
                actorId: caller._id,
                action: "availability_override.updated",
                resourceType: "availability_overrides",
                resourceId: overrideId,
                before: existingDateOverride,
                after: { ...existingDateOverride, ...args },
                createdAt: timestamp,
            });
        } else {
            overrideId = await ctx.db.insert("availability_overrides", {
                orgId: args.orgId,
                staffId: args.staffId,
                date: args.date,
                type: args.type,
                startTime: args.type === "custom_hours" ? args.startTime : undefined,
                endTime: args.type === "custom_hours" ? args.endTime : undefined,
                note: args.note,
                isDeleted: false,
                createdAt: timestamp,
                updatedAt: timestamp,
            });

            await ctx.db.insert("audit_log", {
                orgId: args.orgId,
                actorType: "staff",
                actorId: caller._id,
                action: "availability_override.created",
                resourceType: "availability_overrides",
                resourceId: overrideId,
                after: { id: overrideId, staffId: args.staffId, date: args.date, type: args.type },
                createdAt: timestamp,
            });
        }

        return overrideId;
    },
});

export const deleteOverride = mutation({
    args: {
        orgId: v.id("orgs"),
        overrideId: v.id("availability_overrides"),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const existingOverride = await ctx.db.get(args.overrideId);
        if (!existingOverride || existingOverride.orgId !== args.orgId) {
            throw new ConvexError("Override not found.");
        }

        const now = Date.now();
        await ctx.db.patch(args.overrideId, {
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "availability_override.deleted",
            resourceType: "availability_overrides",
            resourceId: args.overrideId,
            before: existingOverride,
            createdAt: now,
        });

        return null;
    }
});

export const listOverrides = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
        // optional date boundary constraints can be added here
        fromDate: v.optional(v.string()),
        toDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        // Because of index limitations, we might fetch all for staff then filter in memory if date boundary is strictly needed
        // Given reasonable sizes, this is fine. 
        // Optimization: In a huge enterprise app, we'd add "by_staff_date" index to filter ranges directly.
        // Thankfully we HAVE `by_staff_date`. Range filtering over string indexed keys in convex is possible with .gte .lte
        const q = ctx.db.query("availability_overrides")
            .withIndex("by_staff_date", q => q.eq("staffId", args.staffId));

        let overrides = (await q.collect()).filter((override) => !override.isDeleted);

        if (args.fromDate) {
            overrides = overrides.filter(o => o.date >= args.fromDate!);
        }
        if (args.toDate) {
            overrides = overrides.filter(o => o.date <= args.toDate!);
        }

        return overrides.sort((a, b) => a.date.localeCompare(b.date));
    }
});

export const listOrgOverrides = query({
    args: {
        orgId: v.id("orgs"),
        fromDate: v.optional(v.string()),
        toDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        let overrides = await ctx.db
            .query("availability_overrides")
            .withIndex("by_org_active", q =>
                q.eq("orgId", args.orgId).eq("isDeleted", false)
            )
            .collect();

        if (args.fromDate) {
            overrides = overrides.filter(o => o.date >= args.fromDate!);
        }
        if (args.toDate) {
            overrides = overrides.filter(o => o.date <= args.toDate!);
        }

        return overrides.sort((a, b) => a.date.localeCompare(b.date));
    }
});
