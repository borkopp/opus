"use node";

import { v, ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { Anthropic } from "@anthropic-ai/sdk";
import { classifyFreeIntervals, findInteriorGaps } from "../slots";
import { estimateGapRevenue } from "./gapOptimizerHelpers";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

type IntervalReport = {
    startAt: number;
    endAt: number;
    durationMins: number;
    leftBoundary: string;
    rightBoundary: string;
    classification: string;
};

type FunnelReport = {
    thresholds: { minTotalVisits: number; recencyWindowDays: number; topN: number };
    totalCustomers: number;
    passedOptIn: number;
    passedNotErased: number;
    passedHasChannel: number;
    passedRegular: number;
    passedRecency: number;
    finalCount: number;
};

type StaffReport = {
    staffId: string;
    staffName: string;
    status: "scanned" | "day_off" | "no_working_hours" | "past_workday";
    workingWindow: { startAt: number; endAt: number } | null;
    bookingCount: number;
    breakCount: number;
    intervals: IntervalReport[];
    gapsDetected: number;
    candidateFunnel: FunnelReport | null;
    draftsCreated: number;
};

function todayInTimezone(tz: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find(p => p.type === "year")!.value;
    const month = parts.find(p => p.type === "month")!.value;
    const day = parts.find(p => p.type === "day")!.value;
    return `${year}-${month}-${day}`;
}

export const scanDayForOrg = action({
    args: {
        orgId: v.id("orgs"),
        serviceDate: v.optional(v.string()), // "YYYY-MM-DD" — defaults to today in org timezone
        staffIds: v.optional(v.array(v.id("staff_members"))),
        detectedBy: v.union(v.literal("manual_scan"), v.literal("cancellation")),
        triggeredByBookingId: v.optional(v.id("bookings")),
    },
    handler: async (ctx, args): Promise<{
        serviceDate: string;
        timezone: string;
        thresholds: { minGapMins: number; minGapSource: string; bufferTimeMins: number };
        totals: {
            staffAnalyzed: number;
            totalFreeIntervals: number;
            gapsFound: number;
            messageDraftsCreated: number;
        };
        staffReports: StaffReport[];
    }> => {
        const { orgSettings, activeStaff, services }: {
            orgSettings: any;
            activeStaff: any[];
            services: any[];
        } = await ctx.runQuery(
            internal.ai.gapOptimizerHelpers.getOrgSettingsAndStaff,
            { orgId: args.orgId, staffIds: args.staffIds }
        );

        if (!orgSettings) throw new ConvexError("Org settings not found");

        const timezone = orgSettings.timezone || "Europe/Belgrade";
        const serviceDate = args.serviceDate || todayInTimezone(timezone);
        const minGapMins = orgSettings.gapOptimizerMinGapMins ?? orgSettings.slotDurationMins ?? 30;
        const bufferTimeMins = orgSettings.bufferTimeMins ?? 0;
        const currency = orgSettings.currency || "MKD";

        const staffReports: StaffReport[] = [];
        let gapsFound = 0;
        let totalFreeIntervals = 0;
        let messageDraftsCreated = 0;

        for (const staff of activeStaff) {
            const { freeIntervals, workingWindow, bookingCount, breakCount, reason, nowIsPastWorkingEnd } =
                await ctx.runQuery(internal.slots.computeFreeIntervalsForDate, {
                    orgId: args.orgId,
                    staffId: staff._id,
                    date: serviceDate,
                });

            const report: StaffReport = {
                staffId: staff._id,
                staffName: staff.displayName || "Unnamed staff",
                status: "scanned",
                workingWindow,
                bookingCount,
                breakCount,
                intervals: [],
                gapsDetected: 0,
                candidateFunnel: null,
                draftsCreated: 0,
            };

            if (reason === "day_off") {
                report.status = "day_off";
                staffReports.push(report);
                continue;
            }
            if (reason === "no_rule" || !workingWindow) {
                report.status = "no_working_hours";
                staffReports.push(report);
                continue;
            }
            if (nowIsPastWorkingEnd) {
                report.status = "past_workday";
                staffReports.push(report);
                continue;
            }

            totalFreeIntervals += freeIntervals.length;

            const classified = classifyFreeIntervals(freeIntervals, minGapMins, nowIsPastWorkingEnd);
            report.intervals = classified.map(i => ({
                startAt: i.startAt,
                endAt: i.endAt,
                durationMins: i.durationMins,
                leftBoundary: i.leftBoundary,
                rightBoundary: i.rightBoundary,
                classification: i.classification,
            }));

            const gaps = findInteriorGaps(freeIntervals, minGapMins, nowIsPastWorkingEnd);
            report.gapsDetected = gaps.length;

            if (gaps.length === 0) {
                staffReports.push(report);
                continue;
            }

            const { candidates: topCandidates, funnel } = await ctx.runQuery(
                internal.ai.gapOptimizerHelpers.rankCandidatesForGap,
                { orgId: args.orgId, staffId: staff._id }
            );
            report.candidateFunnel = funnel;

            for (const gap of gaps) {
                const staffServices = services.filter(
                    (s: any) => s.staffIds.includes(staff._id) && s.durationMins <= gap.durationMins
                );
                const estimatedRevenueMinorUnits = estimateGapRevenue(staffServices, gap.durationMins);

                const draftedCandidates: Array<{
                    customerId: any;
                    score: number;
                    rationale: string;
                    channel: "sms" | "email" | "whatsapp";
                    draftedMessage: string;
                    confidenceScore: number;
                }> = [];

                for (const candidate of topCandidates) {
                    const prompt = `You are the AI assistant "${orgSettings.aiPersonaName ?? "our team"}" at a service business.
Draft an inviting, conversational message to a regular customer named ${candidate.name} offering them a last-minute appointment slot.
The slot is with ${staff.displayName || "our staff"}. Duration: ${gap.durationMins} minutes.

IMPORTANT RULES:
- Do NOT confirm the booking. Ask if they want it.
- Keep it under 2 sentences.
- Be friendly but professional. No markdown.
- Output ONLY JSON: { "message": "...", "confidence": 0.0-1.0 }`;

                    let message = "Hi! We have a last-minute opening. Let us know if you'd like to book it.";
                    let confidenceScore = 0;

                    try {
                        const response = await anthropic.messages.create({
                            model: CLAUDE_MODEL,
                            max_tokens: 512,
                            messages: [{ role: "user", content: prompt }],
                        });
                        const text = (response.content[0] as any).text as string;
                        const match = text.match(/\{[\s\S]*\}/);
                        if (match) {
                            const parsed = JSON.parse(match[0]);
                            if (typeof parsed.message === "string") message = parsed.message;
                            if (typeof parsed.confidence === "number") confidenceScore = parsed.confidence;
                        }
                    } catch (e) {
                        console.error("Failed to draft message with Claude:", e);
                    }

                    draftedCandidates.push({
                        customerId: candidate.customerId,
                        score: candidate.score,
                        rationale: candidate.rationale,
                        channel: candidate.channel,
                        draftedMessage: message,
                        confidenceScore,
                    });
                }

                await ctx.runMutation(internal.ai.gapOptimizerHelpers.persistGapAndCandidates, {
                    orgId: args.orgId,
                    staffId: staff._id,
                    serviceDate,
                    gapStartAt: gap.startAt,
                    gapEndAt: gap.endAt,
                    durationMins: gap.durationMins,
                    estimatedRevenueMinorUnits,
                    currency,
                    detectedBy: args.detectedBy,
                    triggeredByBookingId: args.triggeredByBookingId,
                    candidates: draftedCandidates,
                });

                messageDraftsCreated += draftedCandidates.length;
                report.draftsCreated += draftedCandidates.length;
                gapsFound++;
            }

            staffReports.push(report);
        }

        await ctx.runMutation(internal.ai.gapOptimizerHelpers.logScanCompleted, {
            orgId: args.orgId,
            gapsFound,
        });

        return {
            serviceDate,
            timezone,
            thresholds: {
                minGapMins,
                minGapSource: orgSettings.gapOptimizerMinGapMins !== undefined
                    ? "org_settings.gapOptimizerMinGapMins"
                    : orgSettings.slotDurationMins !== undefined
                        ? "org_settings.slotDurationMins"
                        : "default (30)",
                bufferTimeMins,
            },
            totals: {
                staffAnalyzed: activeStaff.length,
                totalFreeIntervals,
                gapsFound,
                messageDraftsCreated,
            },
            staffReports,
        };
    },
});
