import { v, ConvexError } from "convex/values";
import { internalQuery, internalMutation, query, mutation } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { requireAuth, requireRole } from "../lib/auth";

export const MIN_TOTAL_VISITS = 3;
export const RECENCY_WINDOW_DAYS = 180;
export const TOP_CANDIDATE_COUNT = 5;

export const rankCandidatesForGap = internalQuery({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
    },
    handler: async (ctx, args) => {
        const { orgId, staffId } = args;

        const allOrgCustomers = await ctx.db
            .query("customers")
            .withIndex("by_org", q => q.eq("orgId", orgId))
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        const funnel = {
            thresholds: {
                minTotalVisits: MIN_TOTAL_VISITS,
                recencyWindowDays: RECENCY_WINDOW_DAYS,
                topN: TOP_CANDIDATE_COUNT,
            },
            totalCustomers: allOrgCustomers.length,
            passedOptIn: 0,
            passedNotErased: 0,
            passedHasChannel: 0,
            passedRegular: 0,
            passedRecency: 0,
            finalCount: 0,
        };

        const now = Date.now();
        const maxAgeMs = RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

        const optedIn = allOrgCustomers.filter(c => c.marketingOptIn === true);
        funnel.passedOptIn = optedIn.length;

        const notErased = optedIn.filter(c => !c.gdprErasureRequestedAt);
        funnel.passedNotErased = notErased.length;

        const withChannel = notErased.filter(c => c.preferredChannel);
        funnel.passedHasChannel = withChannel.length;

        const regulars = withChannel.filter(c => c.totalVisits >= MIN_TOTAL_VISITS);
        funnel.passedRegular = regulars.length;

        const recent = regulars.filter(c => c.lastVisitAt && now - c.lastVisitAt <= maxAgeMs);
        funnel.passedRecency = recent.length;

        if (recent.length === 0) return { candidates: [], funnel };

        const maxVisits = Math.max(...recent.map(c => c.totalVisits));

        const scored = recent.map(c => {
            const normVisits = maxVisits > 0 ? c.totalVisits / maxVisits : 0;
            const daysSinceLastVisit = c.lastVisitAt ? (now - c.lastVisitAt) / (24 * 60 * 60 * 1000) : RECENCY_WINDOW_DAYS;
            const recencyScore = Math.max(0, 1 - daysSinceLastVisit / RECENCY_WINDOW_DAYS);
            const staffMatch = c.preferredStaffId === staffId ? 1 : 0;
            const risk = c.noShowRiskScore || 0;

            const score = 0.4 * normVisits + 0.3 * recencyScore + 0.2 * staffMatch + 0.1 * (1 - risk);

            let rationale = "Regular customer";
            if (staffMatch) rationale = "Prefers this staff member";
            else if (recencyScore > 0.8) rationale = "Visited recently";

            return { customerId: c._id, score, rationale, channel: c.preferredChannel!, name: c.name };
        });

        scored.sort((a, b) => b.score - a.score);
        const candidates = scored.slice(0, TOP_CANDIDATE_COUNT);
        funnel.finalCount = candidates.length;
        return { candidates, funnel };
    }
});

export function estimateGapRevenue(
    services: Array<Pick<Doc<"services">, "priceMinorUnits" | "durationMins">>,
    durationMins: number
): number {
    if (services.length === 0) return 0;
    const avgPrice = services.reduce((acc, s) => acc + s.priceMinorUnits, 0) / services.length;
    const avgDuration = services.reduce((acc, s) => acc + s.durationMins, 0) / services.length;
    
    if (avgDuration === 0) return 0;
    return Math.round(avgPrice * durationMins / avgDuration);
}

export const approveAndSendCandidate = mutation({
    args: {
        orgId: v.id("orgs"),
        candidateId: v.id("gap_outreach_candidates"),
    },
    handler: async (ctx, args) => {
        await requireRole(ctx, args.orgId, "manager");

        const candidate = await ctx.db.get(args.candidateId);
        if (!candidate) throw new ConvexError("Candidate not found");

        const gap = await ctx.db.get(candidate.gapSuggestionId);
        if (!gap) throw new ConvexError("Gap not found");

        const customer = await ctx.db.get(candidate.customerId);
        if (!customer) throw new ConvexError("Customer not found");

        const staff = await ctx.db.get(gap.staffId);
        const org = await ctx.db.get(args.orgId);
        if (!org || org.isDeleted) throw new ConvexError("Business not found");

        const bookingLink = `https://opus.mk/${org.slug}/book`;

        const notificationId = await ctx.db.insert("notifications", {
            orgId: args.orgId,
            customerId: customer._id,
            channel: candidate.channel,
            type: "gap_fill_offer",
            recipientAddress: candidate.channel === "email" ? customer.email! : customer.phone!,
            templateData: {
                customerName: customer.name,
                staffName: staff?.displayName || "Our staff",
                gapStartAt: gap.gapStartAt,
                gapEndAt: gap.gapEndAt,
                draftedMessage: candidate.draftedMessage,
                bookingLink
            },
            status: "pending",
            scheduledFor: Date.now(),
            createdAt: Date.now(),
        });

        await ctx.db.patch(args.candidateId, {
            status: "sent",
            sentNotificationId: notificationId,
            updatedAt: Date.now(),
        });

        if (gap.status === "open") {
            await ctx.db.patch(gap._id, {
                status: "outreach_sent",
                outreachSentAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            action: "gap_optimizer.outreach_approved",
            resourceType: "gap_outreach_candidates",
            resourceId: args.candidateId,
            createdAt: Date.now()
        });

        return { notificationId };
    }
});

export const dismissGap = mutation({
    args: {
        orgId: v.id("orgs"),
        gapId: v.id("gap_suggestions")
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);
        await ctx.db.patch(args.gapId, { status: "dismissed", updatedAt: Date.now() });
        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            action: "gap_optimizer.gap_dismissed",
            resourceType: "gap_suggestions",
            resourceId: args.gapId,
            createdAt: Date.now()
        });
    }
});

export const dismissCandidate = mutation({
    args: {
        orgId: v.id("orgs"),
        candidateId: v.id("gap_outreach_candidates")
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);
        await ctx.db.patch(args.candidateId, { status: "skipped", updatedAt: Date.now() });
        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "staff",
            action: "gap_optimizer.candidate_dismissed",
            resourceType: "gap_outreach_candidates",
            resourceId: args.candidateId,
            createdAt: Date.now()
        });
    }
});

export const getOpenGapsForOrg = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);
        
        const gaps = await ctx.db
            .query("gap_suggestions")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .filter(q => q.or(
                q.eq(q.field("status"), "open"),
                q.eq(q.field("status"), "outreach_sent")
            ))
            .collect();

        const result = [];
        for (const gap of gaps) {
            const staff = await ctx.db.get(gap.staffId);
            const candidates = await ctx.db
                .query("gap_outreach_candidates")
                .withIndex("by_gap_rank", q => q.eq("gapSuggestionId", gap._id))
                .collect();
            
            const activeCandidates = candidates.filter(c => c.status !== "skipped");
            
            const detailedCandidates = await Promise.all(activeCandidates.slice(0, 3).map(async c => {
                const cust = await ctx.db.get(c.customerId);
                return {
                    ...c,
                    customerName: cust?.name || "Unknown"
                };
            }));

            result.push({
                ...gap,
                staffName: staff?.displayName || "Unknown Staff",
                candidateCount: activeCandidates.length,
                topCandidates: detailedCandidates
            });
        }

        return result;
    }
});

export const getTodaySummary = query({
    args: { orgId: v.id("orgs") },
    handler: async (ctx, args) => {
        await requireAuth(ctx, args.orgId);
        
        // Find gaps for today
        const dateStr = new Date().toISOString().split("T")[0]; // Also rough

        const allGaps = await ctx.db
            .query("gap_suggestions")
            .withIndex("by_org_date", q => q.eq("orgId", args.orgId).eq("serviceDate", dateStr))
            .collect();

        let openCount = 0;
        let outreachSentCount = 0;
        let filledCount = 0;
        let totalEstimatedRevenueMinorUnits = 0;
        let currency = "MKD";

        for (const gap of allGaps) {
            if (gap.status === "open") openCount++;
            if (gap.status === "outreach_sent") outreachSentCount++;
            if (gap.status === "filled") filledCount++;
            
            if (gap.status === "open" || gap.status === "outreach_sent") {
                totalEstimatedRevenueMinorUnits += gap.estimatedRevenueMinorUnits;
                currency = gap.currency; // Assume homogeneous
            }
        }

        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        const enabled = settings?.gapOptimizerEnabled ?? false;

        return {
            enabled,
            openCount,
            outreachSentCount,
            filledCount,
            totalEstimatedRevenueMinorUnits,
            currency
        };
    }
});

export const getOrgSettingsAndStaff = internalQuery({
    args: { orgId: v.id("orgs"), staffIds: v.optional(v.array(v.id("staff_members"))) },
    handler: async (ctx, args) => {
        const orgSettings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();
            
        let activeStaff = [];
        if (args.staffIds && args.staffIds.length > 0) {
            for (const sid of args.staffIds) {
                const s = await ctx.db.get(sid);
                if (s && s.isActive && !s.isDeleted) activeStaff.push(s);
            }
        } else {
            activeStaff = await ctx.db
                .query("staff_members")
                .withIndex("by_org", q => q.eq("orgId", args.orgId))
                .filter(q => q.and(
                    q.eq(q.field("isActive"), true),
                    q.eq(q.field("isDeleted"), false)
                ))
                .collect();
        }

        // Also get services to estimate revenue
        const services = await ctx.db
            .query("services")
            .withIndex("by_org_active", q => q.eq("orgId", args.orgId).eq("isActive", true))
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        return { orgSettings, activeStaff, services };
    }
});

export const persistGapAndCandidates = internalMutation({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
        serviceDate: v.string(),
        gapStartAt: v.number(),
        gapEndAt: v.number(),
        durationMins: v.number(),
        estimatedRevenueMinorUnits: v.number(),
        currency: v.string(),
        detectedBy: v.union(v.literal("manual_scan"), v.literal("cancellation")),
        triggeredByBookingId: v.optional(v.id("bookings")),
        candidates: v.array(v.object({
            customerId: v.id("customers"),
            score: v.number(),
            rationale: v.string(),
            draftedMessage: v.string(),
            confidenceScore: v.number(),
            channel: v.union(v.literal("sms"), v.literal("email"), v.literal("whatsapp")),
        }))
    },
    handler: async (ctx, args) => {
        // Check for duplicates
        const existingGaps = await ctx.db
            .query("gap_suggestions")
            .withIndex("by_staff_start", q => q.eq("staffId", args.staffId).eq("gapStartAt", args.gapStartAt))
            .collect();
        
        const duplicate = existingGaps.find(
            g => g.gapEndAt === args.gapEndAt &&
                (g.status === "open" || g.status === "outreach_sent")
        );
        if (duplicate) return duplicate._id; // Skip

        const gapSuggestionId = await ctx.db.insert("gap_suggestions", {
            orgId: args.orgId,
            staffId: args.staffId,
            serviceDate: args.serviceDate,
            gapStartAt: args.gapStartAt,
            gapEndAt: args.gapEndAt,
            durationMins: args.durationMins,
            estimatedRevenueMinorUnits: args.estimatedRevenueMinorUnits,
            currency: args.currency,
            status: "open",
            detectedBy: args.detectedBy,
            triggeredByBookingId: args.triggeredByBookingId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        for (let i = 0; i < args.candidates.length; i++) {
            const c = args.candidates[i];
            await ctx.db.insert("gap_outreach_candidates", {
                orgId: args.orgId,
                gapSuggestionId,
                customerId: c.customerId,
                rank: i + 1,
                score: c.score,
                scoreRationale: c.rationale,
                draftedMessage: c.draftedMessage,
                confidenceScore: c.confidenceScore,
                channel: c.channel,
                status: "proposed",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
        
        return gapSuggestionId;
    }
});

export const logScanCompleted = internalMutation({
    args: {
        orgId: v.id("orgs"),
        gapsFound: v.number()
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "ai",
            action: "gap_optimizer.scan_completed",
            resourceType: "orgs",
            resourceId: args.orgId,
            after: { gapsFound: args.gapsFound },
            createdAt: Date.now()
        });
    }
});
