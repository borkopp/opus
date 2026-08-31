import { v, ConvexError } from "convex/values";
import { internalQuery, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";

// --- Time Utilities ---

/** Converts "HH:MM" strictly to minutes since midnight */
function timeToMins(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

// --- Core Engine ---

/** Core reusable logic for computing available slots on a given date */
export async function computeSlotsForDate(
    ctx: Pick<QueryCtx, "db">,
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

    const staffMembersToProcess: Id<"staff_members">[] = [];

    if (staffId === "any") {
        const assignedStaff = service.staffIds;
        for (const id of assignedStaff) {
            const s = await ctx.db.get(id);
            if (s && s.orgId === orgId && !s.isDeleted && s.isActive) {
                staffMembersToProcess.push(id);
            }
        }
        if (staffMembersToProcess.length === 0) return [];
    } else {
        const selectedStaff = await ctx.db.get(staffId);
        if (
            !selectedStaff ||
            selectedStaff.orgId !== orgId ||
            selectedStaff.isDeleted ||
            !selectedStaff.isActive ||
            !service.staffIds.includes(staffId)
        ) {
            return [];
        }
        staffMembersToProcess.push(staffId);
    }

    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    const midnightMs = new Date(`${date}T00:00:00Z`).getTime();
    const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

    const allSlotsMap = new Map<number, {
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
            .withIndex("by_staff_date_active", q =>
                q.eq("staffId", currentStaffId).eq("date", date).eq("isDeleted", false)
            )
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
                .withIndex("by_staff_day_active", q =>
                    q
                        .eq("staffId", currentStaffId)
                        .eq("dayOfWeek", dayOfWeek)
                        .eq("isDeleted", false)
                        .eq("isActive", true)
                )
                .first();

            if (rule) {
                workingHours = { startTime: rule.startTime, endTime: rule.endTime };
                breaks = rule.breaks || [];
            }
        }

        if (!workingHours) continue;

        const startMins = timeToMins(workingHours.startTime);
        const endMins = timeToMins(workingHours.endTime);
        const durationMins = service.durationMins;

        const rawSlots: { start: number, end: number }[] = [];
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
        await requireAuth(ctx, args.orgId);
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
        await requireAuth(ctx, args.orgId);
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

// --- AI Gap Optimizer Helpers ---

export type FreeIntervalBoundary = "workingStart" | "workingEnd" | "booking" | "break" | "now";
export type FreeInterval = {
    startAt: number;
    endAt: number;
    durationMins: number;
    leftBoundary: FreeIntervalBoundary;
    rightBoundary: FreeIntervalBoundary;
};

export const computeFreeIntervalsForDate = internalQuery({
    args: {
        orgId: v.id("orgs"),
        staffId: v.id("staff_members"),
        date: v.string(), // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        const { orgId, staffId, date } = args;

        const orgSettings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", q => q.eq("orgId", orgId))
            .first();

        if (!orgSettings) throw new ConvexError("Organization settings not found.");

        const dateObj = new Date(date + "T00:00:00");
        const dayOfWeek = dateObj.getDay();

        const midnightMs = new Date(`${date}T00:00:00Z`).getTime();
        const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

        const emptyResult = {
            freeIntervals: [] as FreeInterval[],
            workingWindow: null as { startAt: number; endAt: number } | null,
            mergedBlocks: [] as { start: number; end: number; source: "booking" | "break" }[],
            bookingCount: 0,
            breakCount: 0,
            reason: "" as "" | "day_off" | "no_rule",
            pseudoUtcNow: 0,
            nowIsPastWorkingEnd: false,
        };

        const override = await ctx.db
            .query("availability_overrides")
            .withIndex("by_staff_date_active", q =>
                q.eq("staffId", staffId).eq("date", date).eq("isDeleted", false)
            )
            .first();

        let workingHours: { startTime: string, endTime: string } | null = null;
        let breaks: { startTime: string, endTime: string }[] = [];

        if (override) {
            if (override.type === "day_off") {
                return { ...emptyResult, reason: "day_off" as const };
            } else if (override.type === "custom_hours" && override.startTime && override.endTime) {
                workingHours = { startTime: override.startTime, endTime: override.endTime };
            }
        } else {
            const rule = await ctx.db
                .query("availability_rules")
                .withIndex("by_staff_day_active", q =>
                    q
                        .eq("staffId", staffId)
                        .eq("dayOfWeek", dayOfWeek)
                        .eq("isDeleted", false)
                        .eq("isActive", true)
                )
                .first();

            if (rule) {
                workingHours = { startTime: rule.startTime, endTime: rule.endTime };
                breaks = rule.breaks || [];
            }
        }

        if (!workingHours) return { ...emptyResult, reason: "no_rule" as const };

        const startMins = timeToMins(workingHours.startTime);
        const endMins = timeToMins(workingHours.endTime);
        const workingWindow = {
            startAt: midnightMs + startMins * 60 * 1000,
            endAt: midnightMs + endMins * 60 * 1000,
        };

        const existingBookings = await ctx.db
            .query("bookings")
            .withIndex("by_staff_start", q => q.eq("staffId", staffId).gte("startAt", midnightMs).lt("startAt", nextMidnightMs))
            .filter(q => q.and(
                q.eq(q.field("isDeleted"), false),
                q.neq(q.field("status"), "cancelled")
            ))
            .collect();

        // Pseudo-UTC "now" in org timezone, matching how booking timestamps are stored.
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

        const bufferMs = (orgSettings.bufferTimeMins || 0) * 60 * 1000;

        type Block = { start: number; end: number; source: "booking" | "break" };
        const rawBlocks: Block[] = existingBookings.map(b => ({
            start: b.startAt,
            end: b.endAt + bufferMs,
            source: "booking" as const,
        }));

        breaks.forEach(b => {
            rawBlocks.push({
                start: midnightMs + timeToMins(b.startTime) * 60 * 1000,
                end: midnightMs + timeToMins(b.endTime) * 60 * 1000,
                source: "break" as const,
            });
        });

        rawBlocks.sort((a, b) => a.start - b.start);

        const mergedBlocks: Block[] = [];
        for (const block of rawBlocks) {
            if (mergedBlocks.length === 0) {
                mergedBlocks.push({ ...block });
            } else {
                const last = mergedBlocks[mergedBlocks.length - 1];
                if (block.start <= last.end) {
                    last.end = Math.max(last.end, block.end);
                    // If the merged block mixes bookings and breaks we still treat it
                    // as a hard boundary — keep the first source for display.
                } else {
                    mergedBlocks.push({ ...block });
                }
            }
        }

        const freeIntervals: FreeInterval[] = [];
        const nowClipsWindow = pseudoUtcNow > workingWindow.startAt;
        let currentStart = Math.max(workingWindow.startAt, pseudoUtcNow);
        let leftSource: FreeIntervalBoundary = nowClipsWindow ? "now" : "workingStart";

        for (const block of mergedBlocks) {
            if (block.end <= currentStart) continue; // block entirely in the past
            if (block.start > currentStart) {
                const startAt = currentStart;
                const endAt = block.start;
                freeIntervals.push({
                    startAt,
                    endAt,
                    durationMins: Math.floor((endAt - startAt) / 60000),
                    leftBoundary: leftSource,
                    rightBoundary: block.source,
                });
            }
            if (block.end > currentStart) {
                currentStart = block.end;
                leftSource = block.source;
            }
        }

        if (workingWindow.endAt > currentStart) {
            const startAt = currentStart;
            const endAt = workingWindow.endAt;
            freeIntervals.push({
                startAt,
                endAt,
                durationMins: Math.floor((endAt - startAt) / 60000),
                leftBoundary: leftSource,
                rightBoundary: "workingEnd",
            });
        }

        return {
            freeIntervals,
            workingWindow,
            mergedBlocks,
            bookingCount: existingBookings.length,
            breakCount: breaks.length,
            reason: "" as const,
            pseudoUtcNow,
            nowIsPastWorkingEnd: pseudoUtcNow >= workingWindow.endAt,
        };
    }
});

export type GapClassification =
    | "interior_gap"
    | "below_threshold"
    | "edge_of_day"
    | "now_bounded"
    | "past_workday";

export type ClassifiedInterval = FreeInterval & {
    classification: GapClassification;
};

/**
 * Classify every free interval explicitly so the caller can report diagnostics.
 * A gap is "interior" only when both boundaries come from bookings or breaks.
 */
export function classifyFreeIntervals(
    freeIntervals: FreeInterval[],
    minGapMins: number,
    nowIsPastWorkingEnd: boolean
): ClassifiedInterval[] {
    const minGapMs = minGapMins * 60 * 1000;
    return freeIntervals.map(interval => {
        const durationMs = interval.endAt - interval.startAt;
        const bothBounded =
            (interval.leftBoundary === "booking" || interval.leftBoundary === "break") &&
            (interval.rightBoundary === "booking" || interval.rightBoundary === "break");

        let classification: GapClassification;
        if (nowIsPastWorkingEnd) {
            classification = "past_workday";
        } else if (!bothBounded) {
            classification = interval.leftBoundary === "now"
                ? "now_bounded"
                : "edge_of_day";
        } else if (durationMs < minGapMs) {
            classification = "below_threshold";
        } else {
            classification = "interior_gap";
        }
        return { ...interval, classification };
    });
}

export function findInteriorGaps(
    freeIntervals: FreeInterval[],
    minGapMins: number,
    nowIsPastWorkingEnd: boolean
) {
    return classifyFreeIntervals(freeIntervals, minGapMins, nowIsPastWorkingEnd)
        .filter(i => i.classification === "interior_gap")
        .map(i => ({ startAt: i.startAt, endAt: i.endAt, durationMins: i.durationMins }));
}
