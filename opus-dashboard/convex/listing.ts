import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireRole, requireAuth } from "./lib/auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// LISTING READINESS — opus.mk Marketplace Publishing
// ─────────────────────────────────────────────────────────────────────────────
//
// Blocking conditions (ALL must be true to publish):
//   1. businessName    — org.name is non-empty
//   2. logoUploaded    — org.logoUrl is set
//   3. activeService   — at least one active, non-deleted service
//   4. activeStaff     — at least one active, non-deleted staff member
//   5. availabilitySet — at least one active availability rule for any day
//   6. locationSet     — org.city OR org.address is set
//
// Recommended (non-blocking, shown as tips):
//   1. coverPhoto      — org_media has a "cover" entry
//   2. tagline         — org.tagline is set
//   3. bio             — org.bio is set
//   4. threeServices   — at least 3 active services
//   5. phoneSet        — org.phone is set
//   6. paymentConnected — org.stripeAccountId is set
// ─────────────────────────────────────────────────────────────────────────────

export const getListingReadiness = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);

        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return null;

        // ── Fetch related data ──
        const activeServices = await ctx.db
            .query("services")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const activeStaff = await ctx.db
            .query("staff_members")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const availabilityRules = await ctx.db
            .query("availability_rules")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const coverMedia = await ctx.db
            .query("org_media")
            .withIndex("by_org_type", (q) =>
                q.eq("orgId", args.orgId).eq("type", "cover")
            )
            .first();

        // ── Blocking conditions ──
        const blocking = {
            businessName: !!(org.name && org.name.trim().length > 0),
            logoUploaded: !!(org.logoUrl && org.logoUrl.trim().length > 0),
            activeService: activeServices.length >= 1,
            activeStaff: activeStaff.length >= 1,
            availabilitySet: availabilityRules.length >= 1,
            locationSet: !!(
                (org.city && org.city.trim().length > 0) ||
                (org.address && org.address.trim().length > 0)
            ),
        };

        // ── Recommended conditions ──
        const recommended = {
            coverPhoto: !!coverMedia,
            tagline: !!(org.tagline && org.tagline.trim().length > 0),
            bio: !!(org.bio && org.bio.trim().length > 0),
            threeServices: activeServices.length >= 3,
            phoneSet: !!(org.phone && org.phone.trim().length > 0),
            paymentConnected: !!(org.stripeAccountId && org.stripeAccountId.trim().length > 0),
        };

        const allBlockingMet = Object.values(blocking).every(Boolean);
        const recommendedCount = Object.values(recommended).filter(Boolean).length;

        return {
            listingStatus: org.listingStatus ?? "unpublished",
            publishedAt: org.publishedAt,
            blocking,
            recommended,
            allBlockingMet,
            recommendedCount,
            recommendedTotal: Object.keys(recommended).length,
        };
    },
});


// ─────────────────────────────────────────────────────
// PUBLISH — Owner clicks the "Publish to opus.mk" button.
// Only succeeds if all blocking conditions are met.
// ─────────────────────────────────────────────────────
export const publishOrg = mutation({
    args: {
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        const { staffMember } = await requireRole(ctx, args.orgId, "owner");

        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) throw new ConvexError("Org not found.");

        if (org.listingStatus === "published") {
            return; // Already published
        }

        // ── Re-check all blocking conditions server-side ──
        const activeServices = await ctx.db
            .query("services")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const activeStaff = await ctx.db
            .query("staff_members")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const availabilityRules = await ctx.db
            .query("availability_rules")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const errors: string[] = [];
        if (!org.name || org.name.trim().length === 0) errors.push("Business name is required.");
        if (!org.logoUrl || org.logoUrl.trim().length === 0) errors.push("Logo must be uploaded.");
        if (activeServices.length < 1) errors.push("At least one active service is required.");
        if (activeStaff.length < 1) errors.push("At least one active staff member is required.");
        if (availabilityRules.length < 1) errors.push("At least one availability rule must be configured.");
        if (!(org.city?.trim() || org.address?.trim())) errors.push("City or address must be set.");

        if (errors.length > 0) {
            throw new ConvexError(`Cannot publish: ${errors.join(" ")}`);
        }

        const now = Date.now();
        await ctx.db.patch(args.orgId, {
            listingStatus: "published",
            publishedAt: org.publishedAt ?? now,
            updatedAt: now,
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: staffMember._id,
            action: "org.published",
            resourceType: "orgs",
            resourceId: args.orgId,
            before: { listingStatus: org.listingStatus },
            after: { listingStatus: "published" },
            createdAt: now,
        });

        await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
            entityType: "org",
            entityId: args.orgId,
        });
    },
});


// ─────────────────────────────────────────────────────
// UNPUBLISH — Owner manually takes the listing down.
// ─────────────────────────────────────────────────────
export const unpublishOrg = mutation({
    args: {
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        const { staffMember } = await requireRole(ctx, args.orgId, "owner");

        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) throw new ConvexError("Org not found.");

        if (org.listingStatus === "unpublished") return;

        const now = Date.now();
        await ctx.db.patch(args.orgId, {
            listingStatus: "unpublished",
            updatedAt: now,
        });

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            actorId: staffMember._id,
            action: "org.unpublished",
            resourceType: "orgs",
            resourceId: args.orgId,
            before: { listingStatus: org.listingStatus },
            after: { listingStatus: "unpublished" },
            createdAt: now,
        });

        await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
            entityType: "org",
            entityId: args.orgId,
        });
    },
});


// ─────────────────────────────────────────────────────────────────────────────
// RECOMPUTE LISTING STATUS — Internal mutation.
// Called whenever something relevant changes (service deleted, Stripe
// disconnected, staff deactivated, availability rule removed, etc.)
// so listingStatus always reflects reality.
//
// Logic:
//   • If currently "published" and a blocking condition breaks → "suspended"
//   • If currently "suspended" and all blocking conditions restored → "published" (auto-restore)
//   • If currently "unpublished" and all conditions met → "ready"
//   • If currently "ready" and a condition breaks → "unpublished"
// ─────────────────────────────────────────────────────────────────────────────
export const recomputeListingStatus = internalMutation({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) return;

        // ── Check all blocking conditions ──
        const activeServices = await ctx.db
            .query("services")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const activeStaff = await ctx.db
            .query("staff_members")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isDeleted"), false))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const availabilityRules = await ctx.db
            .query("availability_rules")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        const allMet =
            !!(org.name && org.name.trim().length > 0) &&
            !!(org.logoUrl && org.logoUrl.trim().length > 0) &&
            activeServices.length >= 1 &&
            activeStaff.length >= 1 &&
            availabilityRules.length >= 1 &&
            !!((org.city && org.city.trim().length > 0) || (org.address && org.address.trim().length > 0));

        const currentStatus = org.listingStatus ?? "unpublished";
        let newStatus = currentStatus;

        switch (currentStatus) {
            case "published":
                if (!allMet) newStatus = "suspended";
                break;
            case "suspended":
                if (allMet) newStatus = "published"; // auto-restore
                break;
            case "unpublished":
                if (allMet) newStatus = "ready";
                break;
            case "ready":
                if (!allMet) newStatus = "unpublished";
                break;
        }

        if (newStatus !== currentStatus) {
            const now = Date.now();
            await ctx.db.patch(args.orgId, {
                listingStatus: newStatus,
                updatedAt: now,
            });

            await ctx.db.insert("audit_log", {
                orgId: args.orgId,
                actorType: "system",
                action: `org.listingStatus.${newStatus}`,
                resourceType: "orgs",
                resourceId: args.orgId,
                before: { listingStatus: currentStatus },
                after: { listingStatus: newStatus, allBlockingMet: allMet },
                createdAt: now,
            });

            await ctx.scheduler.runAfter(0, internal.marketplace.embeddings.embedEntity, {
                entityType: "org",
                entityId: args.orgId,
            });
        }
    },
});
