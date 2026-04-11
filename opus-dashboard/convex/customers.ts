import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";

export const findOrCreateCustomer = mutation({
    args: {
        orgId: v.id("orgs"),
        name: v.string(), // Need name to create
        email: v.optional(v.string()),
        phone: v.optional(v.string()), // E.164
    },
    handler: async (ctx, args) => {
        // Basic verification - this could be called publicly during booking, 
        // but in many platforms the staff might call it. We'll leave it without requireRole for now, 
        // but ideally, we ensure it's called via secure routes (like the public booking flow or staff dashboard).
        // The public booking flow would use an org token or similar. For now, no strict auth check here
        // since 'customers' represents the end-user.

        if (!args.email && !args.phone) {
            throw new ConvexError("Must provide either email or phone to identify customer.");
        }

        let existingCustomer = null;

        if (args.phone) {
            existingCustomer = await ctx.db
                .query("customers")
                .withIndex("by_org_phone", q => q.eq("orgId", args.orgId).eq("phone", args.phone))
                .first();
        }

        if (!existingCustomer && args.email) {
            existingCustomer = await ctx.db
                .query("customers")
                .withIndex("by_org_email", q => q.eq("orgId", args.orgId).eq("email", args.email))
                .first();
        }

        if (existingCustomer) {
            // Option to update name if it changed? For now, just return
            return existingCustomer._id;
        }

        // Create
        const customerId = await ctx.db.insert("customers", {
            orgId: args.orgId,
            name: args.name,
            email: args.email,
            phone: args.phone,
            totalVisits: 0,
            totalSpendMinorUnits: 0,
            noShowCount: 0,
            noShowRiskScore: 0,
            requiresFullDeposit: false,
            whatsappOptIn: false,
            marketingOptIn: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return customerId;
    },
});

// Internal variant used by the AI action (no Clerk auth required)
export const findOrCreateCustomerForAI = internalMutation({
    args: {
        orgId: v.id("orgs"),
        name: v.string(),
        phone: v.string(), // E.164 — required for AI bookings
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("customers")
            .withIndex("by_org_phone", q => q.eq("orgId", args.orgId).eq("phone", args.phone))
            .first();

        if (existing) return existing._id;

        return await ctx.db.insert("customers", {
            orgId: args.orgId,
            name: args.name,
            phone: args.phone,
            totalVisits: 0,
            totalSpendMinorUnits: 0,
            noShowCount: 0,
            noShowRiskScore: 0,
            requiresFullDeposit: false,
            whatsappOptIn: false,
            marketingOptIn: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const getCustomerByPhoneForAI = internalQuery({
    args: {
        orgId: v.id("orgs"),
        phone: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("customers")
            .withIndex("by_org_phone", q => q.eq("orgId", args.orgId).eq("phone", args.phone))
            .first();
    },
});

export const updateCustomer = mutation({
    args: {
        orgId: v.id("orgs"),
        customerId: v.id("customers"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        preferredChannel: v.optional(v.union(
            v.literal("whatsapp"),
            v.literal("sms"),
            v.literal("email"),
        )),
        whatsappOptIn: v.optional(v.boolean()),
        marketingOptIn: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { orgId, customerId, ...updates } = args;

        await requireRole(ctx, orgId, "staff");

        const customer = await ctx.db.get(customerId);
        if (!customer || customer.orgId !== orgId || customer.isDeleted) {
            throw new ConvexError("Customer not found.");
        }

        await ctx.db.patch(customerId, {
            ...updates,
            updatedAt: Date.now()
        });

        return customerId;
    }
});

export const recordGdprConsent = mutation({
    args: {
        orgId: v.id("orgs"),
        customerId: v.id("customers"),
    },
    handler: async (ctx, args) => {
        // Could be called from public flow, so we skip auth if needed, but safe to verify org
        const customer = await ctx.db.get(args.customerId);
        if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
            throw new ConvexError("Customer not found.");
        }

        await ctx.db.patch(args.customerId, {
            gdprConsentAt: Date.now(),
            updatedAt: Date.now(),
        });
        return true;
    }
});

export const requestGdprErasure = mutation({
    args: {
        orgId: v.id("orgs"),
        customerId: v.id("customers"),
    },
    handler: async (ctx, args) => {
        // Usually called by staff on behalf of customer, or customer portal
        const customer = await ctx.db.get(args.customerId);
        if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
            throw new ConvexError("Customer not found.");
        }

        // Soft delete & anonymise
        await ctx.db.patch(args.customerId, {
            name: "Anonymised User",
            email: undefined,
            phone: undefined,
            avatarUrl: undefined,
            gdprErasureRequestedAt: Date.now(),
            isDeleted: true,
            deletedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return true;
    }
});

export const getCustomer = query({
    args: {
        orgId: v.id("orgs"),
        customerId: v.id("customers"),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        const customer = await ctx.db.get(args.customerId);
        if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
            return null;
        }

        return customer;
    }
});

export const searchCustomers = query({
    args: {
        orgId: v.id("orgs"),
        query: v.string(), // search text
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        if (!args.query) {
            return [];
        }

        // 1. Try search index on name first (Convex text search)
        const nameMatches = await ctx.db
            .query("customers")
            .withSearchIndex("search_by_name", q =>
                q.search("name", args.query).eq("orgId", args.orgId)
            )
            .take(20);

        // Client-side filtering fallback for exact email/phone since Convex text search is just on name field
        // In a real sophisticated layout we would index phone/email differently, 
        // but for MVP we fetch up to 20 by name, or fallback to exact phone/email match.

        let results = nameMatches;

        if (results.length === 0) {
            // Check exact email
            const emailMatch = await ctx.db.query("customers")
                .withIndex("by_org_email", q => q.eq("orgId", args.orgId).eq("email", args.query))
                .first();
            if (emailMatch) results.push(emailMatch);

            // Check exact phone
            const phoneMatch = await ctx.db.query("customers")
                .withIndex("by_org_phone", q => q.eq("orgId", args.orgId).eq("phone", args.query))
                .first();
            if (phoneMatch && phoneMatch._id !== emailMatch?._id) results.push(phoneMatch);
        }

        return results.filter(c => !c.isDeleted);
    }
});

export const listRecentCustomers = query({
    args: {
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        // Get recent active customers, ordered by creation (or last visit if populated)
        // Order desc takes the latest createdAt ones but if we need lastVisitAt we should sort in memory

        const recent = await ctx.db
            .query("customers")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .collect();

        return recent
            .filter(c => !c.isDeleted)
            .sort((a, b) => {
                const visitA = a.lastVisitAt || a.createdAt;
                const visitB = b.lastVisitAt || b.createdAt;
                return visitB - visitA;
            })
            .slice(0, 15);
    }
});
