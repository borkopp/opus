import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";

export const setAvailabilityRule = mutation({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
        dayOfWeek: v.number(), // 0-6
        startTime: v.string(), // "09:00"
        endTime: v.string(),   // "17:00"
        breaks: v.optional(v.array(v.object({
            startTime: v.string(),
            endTime: v.string(),
        }))),
        isActive: v.boolean(),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
            throw new ConvexError("Invalid dayOfWeek (must be 0-6).");
        }

        const targetStaff = await ctx.db.get(args.staffId);
        if (!targetStaff || targetStaff.orgId !== args.orgId || targetStaff.isDeleted) {
            throw new ConvexError("Staff member not found or inactive.");
        }

        // Check if rule already exists for this day
        const existingRule = await ctx.db
            .query("availability_rules")
            .withIndex("by_staff_day", q => q.eq("staffId", args.staffId).eq("dayOfWeek", args.dayOfWeek))
            .first();

        const timestamp = Date.now();
        let ruleId;

        if (existingRule) {
            ruleId = existingRule._id;
            await ctx.db.patch(ruleId, {
                startTime: args.startTime,
                endTime: args.endTime,
                breaks: args.breaks,
                isActive: args.isActive,
                updatedAt: timestamp,
            });

            await ctx.db.insert("audit_log", {
                orgId: args.orgId,
                actorType: "staff",
                actorId: caller._id,
                action: "availability_rule.updated",
                resourceType: "availability_rules",
                resourceId: ruleId,
                before: existingRule,
                after: { ...existingRule, ...args, updatedAt: timestamp },
                createdAt: timestamp,
            });

        } else {
            ruleId = await ctx.db.insert("availability_rules", {
                orgId: args.orgId,
                staffId: args.staffId,
                dayOfWeek: args.dayOfWeek,
                startTime: args.startTime,
                endTime: args.endTime,
                breaks: args.breaks,
                isActive: args.isActive,
                createdAt: timestamp,
                updatedAt: timestamp,
            });

            await ctx.db.insert("audit_log", {
                orgId: args.orgId,
                actorType: "staff",
                actorId: caller._id,
                action: "availability_rule.created",
                resourceType: "availability_rules",
                resourceId: ruleId,
                after: { id: ruleId, staffId: args.staffId, dayOfWeek: args.dayOfWeek, isActive: args.isActive },
                createdAt: timestamp,
            });
        }

        return ruleId;
    },
});

export const deleteAvailabilityRule = mutation({
    args: {
        orgId: v.id("orgs"),
        ruleId: v.id("availability_rules"),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const existingRule = await ctx.db.get(args.ruleId);
        if (!existingRule || existingRule.orgId !== args.orgId) {
            throw new ConvexError("Rule not found.");
        }

        await ctx.db.patch(args.ruleId, {
            isActive: false,
            updatedAt: Date.now(),
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "availability_rule.deleted",
            resourceType: "availability_rules",
            resourceId: args.ruleId,
            before: existingRule,
            after: { ...existingRule, isActive: false },
            createdAt: Date.now(),
        });

        return null;
    }
});

export const copyScheduleToAllStaff = mutation({
    args: {
        orgId: v.id("orgs"),
        sourceStaffId: v.id("staff_members"),
    },
    handler: async (ctx, args) => {
        const { staffMember: caller } = await requireRole(ctx, args.orgId, "manager");

        const sourceStaff = await ctx.db.get(args.sourceStaffId);
        if (!sourceStaff || sourceStaff.orgId !== args.orgId || sourceStaff.isDeleted) {
            throw new ConvexError("Source staff member not found.");
        }

        // Fetch source rules
        const sourceRules = await ctx.db
            .query("availability_rules")
            .withIndex("by_staff", q => q.eq("staffId", args.sourceStaffId))
            .collect();

        if (sourceRules.length === 0) {
            throw new ConvexError("Source staff member has no availability rules to copy.");
        }

        // Target active staff
        const allStaff = await ctx.db
            .query("staff_members")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        const timestamp = Date.now();

        for (const target of allStaff) {
            if (target._id === args.sourceStaffId) continue;

            for (const sourceRule of sourceRules) {
                const existingTargetRule = await ctx.db
                    .query("availability_rules")
                    .withIndex("by_staff_day", q => q.eq("staffId", target._id).eq("dayOfWeek", sourceRule.dayOfWeek))
                    .first();

                if (existingTargetRule) {
                    await ctx.db.patch(existingTargetRule._id, {
                        startTime: sourceRule.startTime,
                        endTime: sourceRule.endTime,
                        breaks: sourceRule.breaks,
                        isActive: sourceRule.isActive,
                        updatedAt: timestamp,
                    });
                } else {
                    await ctx.db.insert("availability_rules", {
                        orgId: args.orgId,
                        staffId: target._id,
                        dayOfWeek: sourceRule.dayOfWeek,
                        startTime: sourceRule.startTime,
                        endTime: sourceRule.endTime,
                        breaks: sourceRule.breaks,
                        isActive: sourceRule.isActive,
                        createdAt: timestamp,
                        updatedAt: timestamp, // added to fix typescript error although not listed in schema snippet it's a good practice, actually let's double check schema
                    });
                }
            }
        }

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: caller._id,
            action: "availability_rule.copied",
            resourceType: "staff_members",
            resourceId: args.sourceStaffId, // Using source as the target resource anchor
            createdAt: Date.now(),
        });

        return null;
    }
});

export const listAvailabilityRules = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);
        const rules = await ctx.db
            .query("availability_rules")
            .withIndex("by_staff", q => q.eq("staffId", args.staffId))
            .collect();

        return rules.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }
});

export const getWeeklySchedule = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        const rules = await ctx.db
            .query("availability_rules")
            .withIndex("by_staff", q => q.eq("staffId", args.staffId))
            .collect();

        // Build a Map for fast lookup
        const rulesMap = new Map();
        rules.forEach(r => rulesMap.set(r.dayOfWeek, r));

        // Format an array of 0-6 days
        const schedule = [];
        for (let i = 0; i < 7; i++) {
            const rule = rulesMap.get(i);
            if (rule) {
                schedule.push({
                    dayOfWeek: i,
                    isActive: rule.isActive,
                    startTime: rule.startTime,
                    endTime: rule.endTime,
                    breaks: rule.breaks || [],
                    ruleId: rule._id,
                });
            } else {
                schedule.push({
                    dayOfWeek: i,
                    isActive: false,
                    startTime: "09:00",
                    endTime: "17:00",
                    breaks: [],
                    ruleId: null,
                });
            }
        }

        return schedule;
    }
});
