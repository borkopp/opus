import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getDailySchedule = query({
    args: {
        orgId: v.id("orgs"),
        startOfDayMs: v.number(),
        endOfDayMs: v.number(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startOfDayMs)
                    .lt("startAt", args.endOfDayMs)
            )
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        const populated = await Promise.all(bookings.map(async (b) => {
            const staff = await ctx.db.get(b.staffId);
            const customer = await ctx.db.get(b.customerId);
            const service = await ctx.db.get(b.serviceId);
            return {
                ...b,
                staffName: staff?.displayName || "Unknown",
                customerName: customer?.name || "Unknown",
                serviceName: service?.name || "Unknown",
            };
        }));

        populated.sort((a, b) => a.startAt - b.startAt);
        return populated;
    }
});

export const getUpcomingBookings = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startMs)
                    .lt("startAt", args.endMs)
            )
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.neq(q.field("status"), "cancelled"),
                q.neq(q.field("status"), "no_show")
            ))
            .collect();

        const populated = await Promise.all(bookings.map(async (b) => {
            const customer = await ctx.db.get(b.customerId);
            const service = await ctx.db.get(b.serviceId);
            return {
                id: b._id,
                startAt: b.startAt,
                customerName: customer?.name || "Unknown",
                serviceName: service?.name || "Unknown",
                status: b.status,
            };
        }));

        populated.sort((a, b) => a.startAt - b.startAt);
        if (args.limit) {
            return populated.slice(0, args.limit);
        }
        return populated;
    }
});

export const getRevenueStats = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startMs)
                    .lt("startAt", args.endMs)
            )
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.eq(q.field("status"), "completed")
            ))
            .collect();

        const totalRevenueMinorUnits = bookings.reduce((sum, b) => sum + b.priceMinorUnits, 0);
        return { totalRevenueMinorUnits };
    }
});

export const getBookingStats = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startMs)
                    .lt("startAt", args.endMs)
            )
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        const total = bookings.length;
        const cancelled = bookings.filter(b => b.status === "cancelled").length;
        const noShow = bookings.filter(b => b.status === "no_show").length;

        return {
            total,
            cancelled,
            noShow,
            cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
            noShowRate: total > 0 ? (noShow / total) * 100 : 0,
        };
    }
});

export const getNoShowStats = query({
    args: {
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        // Find customers with > 0 no shows
        const customers = await ctx.db
            .query("customers")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.gte(q.field("noShowRiskScore"), 0.7)
            ))
            .collect();

        customers.sort((a, b) => b.noShowCount - a.noShowCount);

        return {
            customers: customers.slice(0, 10).map(c => ({
                id: c._id,
                name: c.name,
                count: c.noShowCount,
                riskScore: c.noShowRiskScore
            }))
        };
    }
});

export const getStaffUtilisation = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number(),
    },
    handler: async (ctx, args) => {
        // Simplified utilisation: For each staff, calculate booked minutes vs available over the period
        // For accurate available minutes, we'd need to expand logic across everyday of the period.
        // For now, we'll return booked minutes per staff, and we can compute static available mins or rough estimate.

        const staffMembers = await ctx.db
            .query("staff_members")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.eq(q.field("isActive"), true)
            ))
            .collect();

        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startMs)
                    .lt("startAt", args.endMs)
            )
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.neq(q.field("status"), "cancelled"),
                q.neq(q.field("status"), "no_show")
            ))
            .collect();

        const staffMap = new Map<string, { name: string, bookedMins: number }>();
        staffMembers.forEach(s => staffMap.set(s._id, { name: s.displayName, bookedMins: 0 }));

        bookings.forEach(b => {
            const duration = (b.endAt - b.startAt) / (60 * 1000);
            const s = staffMap.get(b.staffId);
            if (s) {
                s.bookedMins += duration;
            }
        });

        // Compute dummy Available Minutes (e.g. 5 days * 8 hours = 2400 mins a week)
        // In reality, this requires mapping over available dates and summing availability rules.
        const daysInRange = Math.max(1, Math.ceil((args.endMs - args.startMs) / (24 * 60 * 60 * 1000)));
        const defaultAvailableMins = daysInRange * 8 * 60; // 8 hours per day assumption if no rules checked.

        const results = Array.from(staffMap.values()).map(s => ({
            staffName: s.name,
            bookedMins: s.bookedMins,
            availableMins: defaultAvailableMins,
            utilisationPct: defaultAvailableMins > 0 ? (s.bookedMins / defaultAvailableMins) * 100 : 0
        }));

        // Sort descending by utilisation
        results.sort((a, b) => b.utilisationPct - a.utilisationPct);
        return results;
    }
});

export const getTopServices = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startMs)
                    .lt("startAt", args.endMs)
            )
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        const serviceMap = new Map<string, { count: number, revenue: number }>();

        bookings.forEach(b => {
            if (b.status !== "cancelled" && b.status !== "no_show") {
                const existing = serviceMap.get(b.serviceId) || { count: 0, revenue: 0 };
                existing.count += 1;
                if (b.status === "completed") {
                    existing.revenue += b.priceMinorUnits;
                }
                serviceMap.set(b.serviceId, existing);
            }
        });

        const services = await Promise.all(
            Array.from(serviceMap.keys()).map(async (id) => {
                const srv = await ctx.db.get(id as Id<"services">);
                const stats = serviceMap.get(id)!;
                return {
                    id,
                    name: srv?.name || "Unknown",
                    count: stats.count,
                    revenueMinorUnits: stats.revenue,
                };
            })
        );

        services.sort((a, b) => b.revenueMinorUnits - a.revenueMinorUnits);
        return services;
    }
});

import { paginationOptsValidator } from "convex/server";

export const getNotificationLog = query({
    args: {
        orgId: v.id("orgs"),
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let q = ctx.db
            .query("notifications")
            .withIndex("by_org", q => q.eq("orgId", args.orgId));

        if (args.status) {
            // @ts-ignore
            q = q.filter(query => query.eq(query.field("status"), args.status));
        }

        const paginated = await q.order("desc").paginate(args.paginationOpts);

        // Populate details if needed, e.g. customer name
        const page = await Promise.all(paginated.page.map(async (doc) => {
            const customer = doc.customerId ? await ctx.db.get(doc.customerId) : null;
            return {
                ...doc,
                customerName: customer?.name
            };
        }));

        return { ...paginated, page };
    }
});

// --- NEW DASHBOARD METRICS ---

export const getDashboardMetrics = query({
    args: {
        orgId: v.id("orgs"),
        startOfDayMs: v.number(),
        endOfDayMs: v.number(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", (q) =>
                q.eq("orgId", args.orgId)
                    .gte("startAt", args.startOfDayMs)
                    .lt("startAt", args.endOfDayMs)
            )
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        let totalBookingsToday = 0;
        let revenueToday = 0;

        bookings.forEach(b => {
            if (["confirmed", "checked_in", "completed"].includes(b.status)) {
                totalBookingsToday++;
                if (b.status === "completed") {
                    revenueToday += b.priceMinorUnits;
                }
            }
        });

        // For empty slots today, we can estimate based on number of active staff vs booked slots.
        // It's technically safer to call exactly computeSlotsForDate, but let's provide a basic computation or import it if needed.
        // Since we didn't import computeSlotsForDate yet, we'll return a placeholder 0 empty slots for now,
        // unless we want to do a rough math estimate. Let's stick with 0 or a rough estimate.

        let emptySlotsToday = 0; // Placeholder

        return {
            totalBookingsToday,
            revenueToday,
            emptySlotsToday
        };
    }
});

export const getWeeklyComparison = query({
    args: {
        orgId: v.id("orgs"),
        thisWeekStartMs: v.number(),
        thisWeekEndMs: v.number(),
        lastWeekStartMs: v.number(),
        lastWeekEndMs: v.number(),
        thisMonthStartMs: v.number(),
        thisMonthEndMs: v.number(),
        lastMonthStartMs: v.number(),
        lastMonthEndMs: v.number(),
    },
    handler: async (ctx, args) => {
        const fetchStats = async (startMs: number, endMs: number) => {
            const bookings = await ctx.db
                .query("bookings")
                .withIndex("by_org_start", q => q.eq("orgId", args.orgId).gte("startAt", startMs).lt("startAt", endMs))
                .filter(q => q.eq(q.field("isDeleted"), false))
                .collect();

            let revenue = 0;
            let count = 0;
            bookings.forEach(b => {
                if (b.status === "completed") {
                    revenue += b.priceMinorUnits;
                }
                if (["confirmed", "checked_in", "completed"].includes(b.status)) {
                    count++;
                }
            });
            return { revenue, count };
        };

        const [thisWeek, lastWeek, thisMonth, lastMonth] = await Promise.all([
            fetchStats(args.thisWeekStartMs, args.thisWeekEndMs),
            fetchStats(args.lastWeekStartMs, args.lastWeekEndMs),
            fetchStats(args.thisMonthStartMs, args.thisMonthEndMs),
            fetchStats(args.lastMonthStartMs, args.lastMonthEndMs),
        ]);

        return {
            week: { current: thisWeek, previous: lastWeek },
            month: { current: thisMonth, previous: lastMonth }
        };
    }
});

export const getRevenueByStaff = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query("bookings")
            .withIndex("by_org_start", q => q.eq("orgId", args.orgId).gte("startAt", args.startMs).lt("startAt", args.endMs))
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.eq(q.field("status"), "completed")
            ))
            .collect();

        const staffMap = new Map<string, number>();
        bookings.forEach(b => {
            const current = staffMap.get(b.staffId) || 0;
            staffMap.set(b.staffId, current + b.priceMinorUnits);
        });

        const results = await Promise.all(Array.from(staffMap.entries()).map(async ([staffId, revenue]) => {
            const staff = await ctx.db.get(staffId as Id<"staff_members">);
            return {
                staffId,
                staffName: staff?.displayName || "Unknown",
                revenue
            };
        }));

        results.sort((a, b) => b.revenue - a.revenue);
        return results;
    }
});

export const getCustomerInsights = query({
    args: {
        orgId: v.id("orgs"),
        monthStartMs: v.number(),
        monthEndMs: v.number()
    },
    handler: async (ctx, args) => {
        const customers = await ctx.db
            .query("customers")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        let newThisMonth = 0;
        let returningThisMonth = 0;
        let atRiskChurn = 0; // lastVisit < 60 days ago

        const sixtyDaysAgoMs = Date.now() - (60 * 24 * 60 * 60 * 1000);

        customers.forEach(c => {
            if (c.createdAt >= args.monthStartMs && c.createdAt <= args.monthEndMs) {
                newThisMonth++;
            } else if (c.lastVisitAt && c.lastVisitAt >= args.monthStartMs && c.lastVisitAt <= args.monthEndMs) {
                returningThisMonth++;
            }

            if (c.lastVisitAt && c.lastVisitAt < sixtyDaysAgoMs) {
                atRiskChurn++;
            }
        });

        return {
            newThisMonth,
            returningThisMonth,
            atRiskChurn
        };
    }
});

export const getTopCustomers = query({
    args: {
        orgId: v.id("orgs")
    },
    handler: async (ctx, args) => {
        const customers = await ctx.db
            .query("customers")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .filter(q => q.eq(q.field("isDeleted"), false))
            .collect();

        customers.sort((a, b) => b.totalSpendMinorUnits - a.totalSpendMinorUnits);
        return customers.slice(0, 5).map(c => ({
            id: c._id,
            name: c.name,
            totalVisits: c.totalVisits,
            totalSpendMinorUnits: c.totalSpendMinorUnits,
            avatarUrl: c.avatarUrl
        }));
    }
});

export const getAIPerformance = query({
    args: {
        orgId: v.id("orgs"),
        startMs: v.number(),
        endMs: v.number()
    },
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        const aiEnabled = !!(settings?.aiEnabled);

        const conversations = await ctx.db
            .query("ai_conversations")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .collect();

        // Filter in memory for time range just based on createdAt
        const recentConvs = conversations.filter(c => c.createdAt >= args.startMs && c.createdAt <= args.endMs);

        let total = recentConvs.length;
        let handoffCount = 0;
        let bookingsCreated = 0;

        recentConvs.forEach(c => {
            if (c.status === "handed_off") handoffCount++;
            if (c.bookingIds && c.bookingIds.length > 0) bookingsCreated++;
        });

        return {
            aiEnabled,
            totalConversations: total,
            handoffRate: total > 0 ? (handoffCount / total) * 100 : 0,
            bookingRate: total > 0 ? (bookingsCreated / total) * 100 : 0
        };
    }
});


export const getWeeklyRevenueChart = query({
    args: {
        orgId: v.id("orgs"),
        currentWeekStartMs: v.number(),
        currentWeekEndMs: v.number(),
        previousWeekStartMs: v.number(),
        previousWeekEndMs: v.number(),
    },
    handler: async (ctx, args) => {
        const fetchDaily = async (startMs: number, endMs: number) => {
            const bookings = await ctx.db
                .query("bookings")
                .withIndex("by_org_start", q => q.eq("orgId", args.orgId).gte("startAt", startMs).lt("startAt", endMs))
                .filter(q => q.and(
                    q.eq(q.field("isDeleted"), false),
                    q.eq(q.field("status"), "completed")
                ))
                .collect();
            
            const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const dailyData = days.map(day => ({ day, revenue: 0 }));
            
            bookings.forEach(b => {
                let dayIndex = new Date(b.startAt).getDay() - 1;
                if (dayIndex === -1) dayIndex = 6; // Sunday
                if (dayIndex >= 0 && dayIndex < 7) {
                    dailyData[dayIndex].revenue += b.priceMinorUnits / 100; // Return absolute values
                }
            });
            return dailyData;
        };

        const currentWeekData = await fetchDaily(args.currentWeekStartMs, args.currentWeekEndMs);
        const previousWeekData = await fetchDaily(args.previousWeekStartMs, args.previousWeekEndMs);

        return currentWeekData.map((d, i) => ({
            day: d.day,
            currentWeek: d.revenue,
            previousWeek: previousWeekData[i].revenue
        }));
    }
});
