import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { computeFreeIntervalsForStaffDate } from "../slots";
import { wallClockNow } from "./bookingTime";
import {
  closeRecoveryGap,
  expireRecoveryCandidate,
  isConcreteCandidate,
  offerDeadline,
  optionsForRecoveryGap,
  recoveryDateAllowed,
  recoveryResources,
} from "./gapRecovery";
import {
  RECOVERY_VERSION,
  rankRecoveryOptions,
  recoveryCustomerEligible,
  recoveryMessage,
} from "./gapRecoveryRules";

export type RecoveryScanArgs = {
  orgId: Id<"orgs">;
  serviceDate?: string;
  staffIds?: Id<"staff_members">[];
  detectedBy: "manual_scan" | "cancellation" | "calendar_change";
  triggeredByBookingId?: Id<"bookings">;
};
export type RecoveryScanResult = {
  serviceDate: string;
  timezone: string;
  gapsFound: number;
  newCandidates: number;
  eligibleCustomers: number;
  staffAnalyzed: number;
  scannedAt: number;
};

/** One transaction: no model calls, partial scan writes, or duplicate concurrent scans. */
export async function reconcileRecoveryDay(
  ctx: MutationCtx,
  args: RecoveryScanArgs,
): Promise<RecoveryScanResult | null> {
  const resources = await recoveryResources(ctx, args.orgId);
  if (!resources?.enabled) return null;
  const { settings, org } = resources;
  const timezone = settings.timezone || "Europe/Skopje";
  const localNow = wallClockNow(timezone);
  const serviceDate =
    args.serviceDate || new Date(localNow).toISOString().slice(0, 10);
  if (!recoveryDateAllowed(serviceDate, settings)) return null;
  const allStaff = await ctx.db
    .query("staff_members")
    .withIndex("by_org_active", (q) =>
      q.eq("orgId", args.orgId).eq("isActive", true).eq("isDeleted", false),
    )
    .take(21);
  if (allStaff.length > 20)
    throw new ConvexError(
      "Recovery currently supports up to 20 active specialists.",
    );
  const staffMembers = allStaff.filter(
    (s) => !args.staffIds?.length || args.staffIds.includes(s._id),
  );
  const customers = await ctx.db
    .query("customers")
    .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
    .take(1001);
  if (customers.length > 1000)
    throw new ConvexError(
      "Recovery currently supports up to 1,000 customer records.",
    );
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_org_start", (q) =>
      q.eq("orgId", args.orgId).gte("startAt", localNow - 400 * 86_400_000),
    )
    .take(10001);
  if (bookings.length > 10000)
    throw new ConvexError(
      "Recovery history is too large to scan safely. Please contact OPUS support.",
    );
  const byCustomer = new Map<Id<"customers">, Doc<"bookings">[]>();
  for (const booking of bookings) {
    const items = byCustomer.get(booking.customerId) ?? [];
    items.push(booking);
    byCustomer.set(booking.customerId, items);
  }
  const eligible = customers.filter((c) =>
    recoveryCustomerEligible(c, Date.now()),
  );
  const customerMap = new Map(customers.map((c) => [c._id, c]));
  const existing = await ctx.db
    .query("gap_suggestions")
    .withIndex("by_org_date", (q) =>
      q.eq("orgId", args.orgId).eq("serviceDate", serviceDate),
    )
    .collect();
  const seen = new Set<Id<"gap_suggestions">>();
  let gapsFound = 0;
  let newCandidates = 0;
  for (const staff of staffMembers) {
    const availability = await computeFreeIntervalsForStaffDate(
      ctx,
      args.orgId,
      staff._id,
      serviceDate,
      settings,
    );
    if (!availability.workingWindow) continue;
    const allOptions = await optionsForRecoveryGap(ctx, {
      orgId: args.orgId,
      staffId: staff._id,
      serviceDate,
      gapStartAt: availability.workingWindow.startAt,
      gapEndAt: availability.workingWindow.endAt,
    });
    for (const interval of availability.freeIntervals) {
      if (interval.durationMins < (settings.gapOptimizerMinGapMins ?? 30))
        continue;
      const options = allOptions.filter(
        (o) =>
          o.startAt >= interval.startAt &&
          o.endAt + settings.bufferTimeMins * 60_000 <= interval.endAt,
      );
      if (!options.length) continue;
      const opportunityKey = `${staff._id}:${serviceDate}:${interval.endAt}`;
      let gap = existing.find(
        (g) =>
          g.recoveryVersion === RECOVERY_VERSION &&
          g.opportunityKey === opportunityKey &&
          ["open", "outreach_sent", "dismissed"].includes(g.status),
      );
      if (gap?.status === "dismissed") {
        seen.add(gap._id);
        continue;
      }
      const now = Date.now();
      const expiresAt = offerDeadline(interval.endAt, timezone);
      const values = {
        gapStartAt: interval.startAt,
        gapEndAt: interval.endAt,
        durationMins: interval.durationMins,
        estimatedRevenueMinorUnits: options[0].priceMinorUnits,
        currency: options[0].currency,
        updatedAt: now,
      };
      if (gap) await ctx.db.patch(gap._id, values);
      else {
        const id = await ctx.db.insert("gap_suggestions", {
          ...values,
          orgId: args.orgId,
          staffId: staff._id,
          serviceDate,
          status: "open",
          recoveryVersion: RECOVERY_VERSION,
          opportunityKey,
          expiresAt,
          detectedBy: args.detectedBy,
          triggeredByBookingId: args.triggeredByBookingId,
          createdAt: now,
        });
        gap = (await ctx.db.get(id))!;
        await ctx.scheduler.runAt(
          expiresAt,
          internal.ai.gapOptimizerHelpers.expireGap,
          { orgId: args.orgId, gapId: id },
        );
      }
      seen.add(gap._id);
      gapsFound++;
      const candidates = await ctx.db
        .query("gap_outreach_candidates")
        .withIndex("by_org_gap_rank", (q) =>
          q.eq("orgId", args.orgId).eq("gapSuggestionId", gap!._id),
        )
        .collect();
      let activeOutreach = false;
      for (const candidate of candidates) {
        if (
          !["proposed", "queued", "sent", "failed"].includes(candidate.status)
        )
          continue;
        const customer = customerMap.get(candidate.customerId);
        const matches =
          isConcreteCandidate(candidate) &&
          options.some(
            (o) =>
              o.serviceId === candidate.serviceId &&
              o.startAt === candidate.offerStartAt &&
              o.endAt === candidate.offerEndAt &&
              o.priceMinorUnits === candidate.priceMinorUnits &&
              o.currency === candidate.currency,
          );
        const ranked = customer
          ? rankRecoveryOptions(
              customer,
              byCustomer.get(customer._id) ?? [],
              options,
              localNow,
            )
          : [];
        if (
          !matches ||
          !customer ||
          !recoveryCustomerEligible(
            customer,
            now,
            candidate.status !== "proposed",
          ) ||
          !ranked.some((o) => o.serviceId === candidate.serviceId) ||
          (candidate.expiresAt ?? 0) <= now
        ) {
          await expireRecoveryCandidate(ctx, candidate);
        } else if (["queued", "sent"].includes(candidate.status))
          activeOutreach = true;
      }
      await ctx.db.patch(gap._id, {
        status: activeOutreach ? "outreach_sent" : "open",
      });
      if (activeOutreach) continue;
      const dismissedCustomers = new Set(
        candidates
          .filter((c) =>
            ["skipped", "responded_no", "booked"].includes(c.status),
          )
          .map((c) => c.customerId),
      );
      const ranked = eligible
        .filter((c) => !dismissedCustomers.has(c._id))
        .flatMap((customer) => {
          const best = rankRecoveryOptions(
            customer,
            byCustomer.get(customer._id) ?? [],
            options,
            localNow,
          )[0];
          return best ? [best] : [];
        })
        .sort(
          (a, b) =>
            b.score - a.score || a.customerName.localeCompare(b.customerName),
        )
        .slice(0, 5);
      const retained = new Set<Id<"gap_outreach_candidates">>();
      for (const [index, match] of ranked.entries()) {
        const same = candidates.find(
          (c) =>
            c.customerId === match.customerId &&
            c.status === "proposed" &&
            c.serviceId === match.serviceId &&
            c.offerStartAt === match.startAt &&
            c.priceMinorUnits === match.priceMinorUnits,
        );
        const draft = recoveryMessage({
          customerName: match.customerName,
          studioName: org.name,
          staffName: staff.displayName,
          serviceName: match.serviceName,
          startAt: match.startAt,
          priceMinorUnits: match.priceMinorUnits,
          currency: match.currency,
          locale: settings.locale || "mk-MK",
        });
        const fields = {
          rank: index + 1,
          score: match.score,
          scoreRationale: match.reasons[0].en,
          reasons: match.reasons,
          draftedMessage: draft,
          serviceId: match.serviceId,
          offerStartAt: match.startAt,
          offerEndAt: match.endAt,
          priceMinorUnits: match.priceMinorUnits,
          currency: match.currency,
          expiresAt: offerDeadline(match.startAt, timezone),
          updatedAt: now,
        };
        if (same && (await ctx.db.get(same._id))?.status === "proposed") {
          await ctx.db.patch(same._id, fields);
          retained.add(same._id);
        } else {
          const candidateId = await ctx.db.insert("gap_outreach_candidates", {
            ...fields,
            orgId: args.orgId,
            gapSuggestionId: gap._id,
            customerId: match.customerId,
            confidenceScore: 0,
            channel: "email",
            status: "proposed",
            createdAt: now,
          });
          await ctx.scheduler.runAt(
            fields.expiresAt,
            internal.ai.gapOptimizerHelpers.expireCandidate,
            { orgId: args.orgId, candidateId },
          );
          newCandidates++;
        }
      }
      for (const candidate of candidates) {
        if (candidate.status === "proposed" && !retained.has(candidate._id)) {
          const current = await ctx.db.get(candidate._id);
          if (current) await expireRecoveryCandidate(ctx, current);
        }
      }
    }
  }
  for (const gap of existing) {
    if (
      !seen.has(gap._id) &&
      (!args.staffIds?.length || args.staffIds.includes(gap.staffId)) &&
      ["open", "outreach_sent"].includes(gap.status)
    ) {
      await closeRecoveryGap(ctx, gap, "expired");
    }
  }
  const scannedAt = Date.now();
  const scan = {
    serviceDate,
    scannedAt,
    gapsFound,
    eligibleCustomers: eligible.length,
  };
  await ctx.db.patch(settings._id, {
    gapRecoveryLastScanAt: scannedAt,
    gapRecoveryLastScanDate: serviceDate,
    gapRecoveryScanHistory: [
      ...(settings.gapRecoveryScanHistory ?? []).filter(
        (s) => s.serviceDate !== serviceDate,
      ),
      scan,
    ]
      .sort((a, b) => b.scannedAt - a.scannedAt)
      .slice(0, 7),
  });
  await ctx.db.insert("audit_log", {
    orgId: args.orgId,
    actorType: "system",
    action: "gap_optimizer.scan_completed",
    resourceType: "orgs",
    resourceId: args.orgId,
    after: { ...scan, newCandidates },
    createdAt: scannedAt,
  });
  return {
    ...scan,
    timezone,
    newCandidates,
    staffAnalyzed: staffMembers.length,
  };
}
