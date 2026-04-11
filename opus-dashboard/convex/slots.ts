import { v, ConvexError } from "convex/values";
import { internalQuery, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// --- Time Utilities ---

/** Converts "HH:MM" strictly to minutes since midnight */
function timeToMins(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

/** Formats local date to YYYY-MM-DD */
function formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// --- Core Engine ---

/** Core reusable logic for computing available slots on a given date */
export async function computeSlotsForDate(
    ctx: QueryCtx,
    orgId: Id<"orgs">,
    staffId: Id<"staff_members"> | "any",
    serviceId: Id<"services">,
    date: string
) {
    const service = await ctx.db.get(serviceId);
    if (!service || service.orgId !== orgId || service.isDeleted || !service.isActive) {
        throw new ConvexError("Service not found or is inactive.");
    }

    const orgSettings = await ctx.db
        .query("org_settings")
        .withIndex("by_org", q => q.eq("orgId", orgId))
        .first();

    if (!orgSettings) throw new ConvexError("Organization settings not found.");

    let staffMembersToProcess: Id<"staff_members">[] = [];

    if (staffId === "any") {
        const assignedStaff = service.staffIds;
        for (const id of assignedStaff) {
            const s = await ctx.db.get(id);
            if (s && !s.isDeleted && s.isActive) {
                staffMembersToProcess.push(id);
            }
        }
        if (staffMembersToProcess.length === 0) return [];
    } else {
        staffMembersToProcess.push(staffId as Id<"staff_members">);
    }

    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    const midnightMs = new Date(`${date}T00:00:00Z`).getTime();
    const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

    let allSlotsMap = new Map<number, {
        startAt: number,
        endAt: number,
        priceMinorUnits: number,
        surgePriceApplied: boolean,
        surgeMultiplierPct?: number,
        availableStaffIds: Id<"staff_members">[]
    }>();

    for (const currentStaffId of staffMembersToProcess) {
        const override = await ctx.db
            .query("availability_overrides")
            .withIndex("by_staff_date", q => q.eq("staffId", currentStaffId).eq("date", date))
            .first();

        let workingHours: { startTime: string, endTime: string } | null = null;
        let breaks: { startTime: string, endTime: string }[] = [];

        if (override) {
            if (override.type === "day_off") {
                continue;
            } else if (override.type === "custom_hours" && override.startTime && override.endTime) {
                workingHours = { startTime: override.startTime, endTime: override.endTime };
            }
        } else {
            const rule = await ctx.db
                .query("availability_rules")
                .withIndex("by_staff_day", q => q.eq("staffId", currentStaffId).eq("dayOfWeek", dayOfWeek))
                .first();

            if (rule && rule.isActive) {
                workingHours = { startTime: rule.startTime, endTime: rule.endTime };
                breaks = rule.breaks || [];
            }
        }

        if (!workingHours) continue;

        const startMins = timeToMins(workingHours.startTime);
        const endMins = timeToMins(workingHours.endTime);
        const durationMins = service.durationMins;

        let rawSlots: { start: number, end: number }[] = [];
        for (let m = startMins; m + durationMins <= endMins; m += orgSettings.slotDurationMins) {
            const slotEnd = m + durationMins;
            const overlapsBreak = breaks.some(b => {
                const bStart = timeToMins(b.startTime);
                const bEnd = timeToMins(b.endTime);
                return m < bEnd && slotEnd > bStart;
            });

            if (!overlapsBreak) {
                rawSlots.push({ start: m, end: slotEnd });
            }
        }

        const existingBookings = await ctx.db
            .query("bookings")
            .withIndex("by_staff_start", q => q.eq("staffId", currentStaffId).gte("startAt", midnightMs).lt("startAt", nextMidnightMs))
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.neq(q.field("status"), "cancelled")
            ))
            .collect();

        const bookedBlocks = existingBookings.map(b => {
            const d = new Date(b.startAt);
            const startMin = d.getUTCHours() * 60 + d.getUTCMinutes();
            const endMin = (new Date(b.endAt).getUTCHours() * 60 + new Date(b.endAt).getUTCMinutes()) + (orgSettings.bufferTimeMins || 0);
            return { start: startMin, end: endMin };
        });

        const validSlots = rawSlots.filter(slot => {
            const isConflict = bookedBlocks.some(b => slot.start < b.end && slot.end > b.start);
            return !isConflict;
        });

        // Calculate pseudo-UTC "now" to compare against pseudo-UTC `slotTimestamp`
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: orgSettings.timezone || "Europe/Belgrade",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date());

        let year, month, day, hour, minute, second;
        for (const p of parts) {
            if (p.type === 'year') year = p.value;
            if (p.type === 'month') month = p.value;
            if (p.type === 'day') day = p.value;
            if (p.type === 'hour') hour = p.value;
            if (p.type === 'minute') minute = p.value;
            if (p.type === 'second') second = p.value;
        }
        const pseudoUtcNow = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).getTime();

        for (const slot of validSlots) {
            const slotTimestamp = midnightMs + (slot.start * 60 * 1000);
            const endTimestamp = midnightMs + (slot.end * 60 * 1000);

            // Hide timeslots that are in the past or within the next 15 minutes.
            if (slotTimestamp <= pseudoUtcNow + 15 * 60 * 1000) {
                continue;
            }

            let priceMinorUnits = service.priceMinorUnits;
            let surgePriceApplied = false;
            let surgeMultiplierPct: number | undefined = undefined;

            if (orgSettings.surgeRules && orgSettings.surgeRules.length > 0) {
                const timeH = Math.floor(slot.start / 60);
                const timeM = slot.start % 60;
                const timeStr = `${String(timeH).padStart(2, "0")}:${String(timeM).padStart(2, "0")}`;

                const matchingRule = orgSettings.surgeRules.find(r =>
                    r.dayOfWeek === dayOfWeek &&
                    timeStr >= r.startTime &&
                    timeStr < r.endTime
                );

                if (matchingRule) {
                    surgePriceApplied = true;
                    surgeMultiplierPct = matchingRule.multiplierPct;
                    priceMinorUnits = Math.round(priceMinorUnits * (1 + matchingRule.multiplierPct / 100));
                }
            }

            if (allSlotsMap.has(slotTimestamp)) {
                const existing = allSlotsMap.get(slotTimestamp)!;
                if (!existing.availableStaffIds.includes(currentStaffId)) {
                    existing.availableStaffIds.push(currentStaffId);
                }
            } else {
                allSlotsMap.set(slotTimestamp, {
                    startAt: slotTimestamp,
                    endAt: endTimestamp,
                    priceMinorUnits,
                    surgePriceApplied,
                    surgeMultiplierPct,
                    availableStaffIds: [currentStaffId]
                });
            }
        }
    }

    return Array.from(allSlotsMap.values()).sort((a, b) => a.startAt - b.startAt);
}

// --- Queries ---

export const getAvailableSlots = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.union(v.id("staff_members"), v.literal("any")),
        serviceId: v.id("services"),
        date: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        return await computeSlotsForDate(ctx, args.orgId, args.staffId, args.serviceId, args.date);
    }
});

export const getAvailableDates = query({
    args: {
        orgId: v.id("orgs"),
        staffId: v.union(v.id("staff_members"), v.literal("any")),
        serviceId: v.id("services"),
        month: v.string(), // "YYYY-MM"
    },
    handler: async (ctx, args) => {
        const [year, m] = args.month.split("-").map(Number);
        const daysInMonth = new Date(Date.UTC(year, m, 0)).getDate();

        // Parallel execution to optimize the querying slightly, though Convex will batch reads.
        // If a month has 31 days, and staff === 'any' (e.g. 5 staff), this is 31 * 5 queries approx.
        // It stays easily within read limits but parallel helps response latency.
        const promises = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            promises.push(
                computeSlotsForDate(ctx, args.orgId, args.staffId, args.serviceId, dateStr)
                    .then(slots => ({ date: dateStr, hasSlots: slots.length > 0 }))
            );
        }

        const results = await Promise.all(promises);

        return results.filter(r => r.hasSlots).map(r => r.date);
    }
});

// Internal query for the AI action — no auth, returns slots with startAt timestamps
export const getAvailableSlotsForAI = internalQuery({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),
        date: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        return await computeSlotsForDate(ctx, args.orgId, "any", args.serviceId, args.date);
    },
});
