import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { computeSlotsForDate } from "../slots";
import { normalizeBookingEmail } from "./bookingEmailSecurity";
import { wallClockNow, wallClockTimestampToInstant } from "./bookingTime";
import { emailFromForRoute, providerOrderForRoute } from "./emailDelivery";
import { isActiveIndustry } from "./productScope";
import { isWebsitePublished } from "./publication";
import { isWithinPublicBookingWindow } from "./publicBookingRules";
import {
  BOOKING_NOTICE_MS,
  RECOVERY_HORIZON_DAYS,
  RECOVERY_VERSION,
  bookingServiceIds,
  overlaps,
  recoveryCustomerEligible,
  recoveryMessage,
  type RecoveryOption,
} from "./gapRecoveryRules";

type ReadCtx = Pick<QueryCtx, "db">;
export type ConcreteRecoveryCandidate = Doc<"gap_outreach_candidates"> & {
  serviceId: Id<"services">;
  offerStartAt: number;
  offerEndAt: number;
  priceMinorUnits: number;
  currency: string;
  expiresAt: number;
};

export function isConcreteCandidate(
  candidate: Doc<"gap_outreach_candidates">,
): candidate is ConcreteRecoveryCandidate {
  return (
    !!candidate.serviceId &&
    candidate.offerStartAt !== undefined &&
    candidate.offerEndAt !== undefined &&
    candidate.priceMinorUnits !== undefined &&
    candidate.currency !== undefined &&
    candidate.expiresAt !== undefined
  );
}

export function recoveryEmailReady() {
  try {
    return providerOrderForRoute("reminder").some((provider) => {
      try {
        emailFromForRoute("reminder", provider);
        return provider === "resend"
          ? !!process.env.RESEND_API_KEY?.trim()
          : !!process.env.SENDER_API_TOKEN?.trim();
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function recoveryResources(ctx: ReadCtx, orgId: Id<"orgs">) {
  const org = await ctx.db.get(orgId);
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  if (!org || org.isDeleted || !isActiveIndustry(org.industry) || !settings)
    return null;
  return {
    org,
    settings,
    enabled:
      org.plan === "paid" &&
      !!settings.gapOptimizerEnabled &&
      isWebsitePublished(org),
  };
}

export function recoveryDateAllowed(
  date: string,
  settings: Doc<"org_settings">,
  now = Date.now(),
) {
  return isWithinPublicBookingWindow(
    date,
    settings.timezone || "Europe/Skopje",
    Math.min(settings.bookingWindowDays, RECOVERY_HORIZON_DAYS),
    now,
  );
}

export async function optionsForRecoveryGap(
  ctx: ReadCtx,
  gap: Pick<
    Doc<"gap_suggestions">,
    "orgId" | "staffId" | "serviceDate" | "gapStartAt" | "gapEndAt"
  >,
): Promise<RecoveryOption[]> {
  const resources = await recoveryResources(ctx, gap.orgId);
  if (
    !resources?.enabled ||
    !recoveryDateAllowed(gap.serviceDate, resources.settings)
  )
    return [];
  const services = await ctx.db
    .query("services")
    .withIndex("by_org_active_deleted", (q) =>
      q.eq("orgId", gap.orgId).eq("isActive", true).eq("isDeleted", false),
    )
    .take(101);
  if (services.length > 100)
    throw new ConvexError(
      "Recovery currently supports up to 100 active services.",
    );
  const result: RecoveryOption[] = [];
  for (const service of services) {
    if (!service.isOpusVisible || !service.staffIds.includes(gap.staffId))
      continue;
    const slots = await computeSlotsForDate(
      ctx,
      gap.orgId,
      gap.staffId,
      service._id,
      gap.serviceDate,
    );
    for (const slot of slots) {
      if (
        slot.startAt < gap.gapStartAt ||
        slot.endAt + resources.settings.bufferTimeMins * 60_000 > gap.gapEndAt
      )
        continue;
      result.push({
        serviceId: service._id,
        serviceName: service.name,
        staffId: gap.staffId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        priceMinorUnits: slot.priceMinorUnits,
        currency: service.currency,
      });
    }
  }
  return result;
}

export async function recoveryCustomerBookings(
  ctx: ReadCtx,
  orgId: Id<"orgs">,
  customerId: Id<"customers">,
) {
  const rows = await ctx.db
    .query("bookings")
    .withIndex("by_org_customer_start", (q) =>
      q.eq("orgId", orgId).eq("customerId", customerId),
    )
    .order("desc")
    .take(501);
  // Upcoming appointments must never be silently omitted by a history limit.
  if (rows.length > 500)
    throw new ConvexError(
      "This customer's appointment history is too large for recovery. Please review them manually.",
    );
  return rows;
}

export async function recoveryOfferContext(
  ctx: ReadCtx,
  candidate: Doc<"gap_outreach_candidates">,
  allowProposed = false,
  availableOptions?: RecoveryOption[],
) {
  if (!isConcreteCandidate(candidate) || candidate.expiresAt <= Date.now())
    return null;
  if (
    !(
      allowProposed
        ? ["proposed", "queued", "sent", "failed"]
        : ["queued", "sent"]
    ).includes(candidate.status)
  )
    return null;
  const resources = await recoveryResources(ctx, candidate.orgId);
  if (!resources?.enabled) return null;
  const { org, settings } = resources;
  const gap = await ctx.db.get(candidate.gapSuggestionId);
  const customer = await ctx.db.get(candidate.customerId);
  if (
    !gap ||
    gap.orgId !== candidate.orgId ||
    gap.recoveryVersion !== RECOVERY_VERSION ||
    !["open", "outreach_sent"].includes(gap.status) ||
    !customer ||
    customer.orgId !== candidate.orgId ||
    !recoveryCustomerEligible(
      customer,
      Date.now(),
      candidate.status !== "proposed",
    )
  )
    return null;
  if (
    candidate.recipientEmail &&
    normalizeBookingEmail(customer.email!) !== candidate.recipientEmail
  )
    return null;
  const staff = await ctx.db.get(gap.staffId);
  const service = await ctx.db.get(candidate.serviceId);
  if (
    !staff ||
    staff.orgId !== org._id ||
    !staff.isActive ||
    staff.isDeleted ||
    !service ||
    service.orgId !== org._id ||
    !service.isActive ||
    service.isDeleted ||
    !service.isOpusVisible
  )
    return null;
  const options = availableOptions ?? (await optionsForRecoveryGap(ctx, gap));
  const option = options.find(
    (o) =>
      o.serviceId === candidate.serviceId &&
      o.startAt === candidate.offerStartAt &&
      o.endAt === candidate.offerEndAt &&
      o.priceMinorUnits === candidate.priceMinorUnits &&
      o.currency === candidate.currency,
  );
  if (!option) return null;
  // A rename or locale change must not send the older wording the owner reviewed.
  if (
    candidate.draftedMessage !==
    recoveryMessage({
      customerName: customer.name,
      studioName: org.name,
      serviceName: service.name,
      staffName: staff.displayName,
      startAt: candidate.offerStartAt,
      priceMinorUnits: candidate.priceMinorUnits,
      currency: candidate.currency,
      locale: settings.locale || "mk-MK",
    })
  )
    return null;
  const localNow = wallClockNow(settings.timezone || "Europe/Skopje");
  const bookings = await recoveryCustomerBookings(
    ctx,
    candidate.orgId,
    customer._id,
  );
  if (
    bookings.some(
      (b) =>
        !b.isDeleted &&
        b.startAt >= localNow &&
        ["confirmed", "checked_in"].includes(b.status) &&
        (bookingServiceIds(b).includes(service._id) ||
          overlaps(
            candidate.offerStartAt,
            candidate.offerEndAt,
            b.startAt,
            b.endAt,
          )),
    )
  )
    return null;
  return { candidate, org, settings, gap, customer, staff, service, option };
}

export async function cancelRecoveryNotification(
  ctx: MutationCtx,
  candidate: Doc<"gap_outreach_candidates">,
) {
  if (!candidate.sentNotificationId) return;
  const notification = await ctx.db.get(candidate.sentNotificationId);
  if (
    !notification ||
    notification.orgId !== candidate.orgId ||
    notification.status !== "pending"
  )
    return;
  // A claimed worker rechecks eligibility. Preserve its provider result if already in flight.
  if (!notification.processingStartedAt)
    await ctx.db.patch(notification._id, {
      status: "cancelled",
      failureReason: "The opening offer is no longer active.",
    });
}

export async function expireRecoveryCandidate(
  ctx: MutationCtx,
  candidate: Doc<"gap_outreach_candidates">,
) {
  if (
    ["expired", "booked", "skipped", "responded_no"].includes(candidate.status)
  )
    return;
  await ctx.db.patch(candidate._id, {
    status: "expired",
    updatedAt: Date.now(),
  });
  await cancelRecoveryNotification(ctx, candidate);
  await ctx.db.insert("audit_log", {
    orgId: candidate.orgId,
    actorType: "system",
    action: "gap_optimizer.offer_expired",
    resourceType: "gap_outreach_candidates",
    resourceId: candidate._id,
    createdAt: Date.now(),
  });
}

export async function closeRecoveryGap(
  ctx: MutationCtx,
  gap: Doc<"gap_suggestions">,
  status: "expired" | "dismissed" | "filled",
) {
  const candidates = await ctx.db
    .query("gap_outreach_candidates")
    .withIndex("by_org_gap_rank", (q) =>
      q.eq("orgId", gap.orgId).eq("gapSuggestionId", gap._id),
    )
    .collect();
  for (const candidate of candidates)
    await expireRecoveryCandidate(ctx, candidate);
  await ctx.db.patch(gap._id, { status, updatedAt: Date.now() });
}

export async function closeOrgRecoveryGaps(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
) {
  for (const status of ["open", "outreach_sent"] as const) {
    const gaps = await ctx.db
      .query("gap_suggestions")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", orgId).eq("status", status),
      )
      .collect();
    for (const gap of gaps) await closeRecoveryGap(ctx, gap, "expired");
  }
}

export async function hasActiveRecoveryOffer(
  ctx: MutationCtx,
  candidates: Doc<"gap_outreach_candidates">[],
  excludeId?: Id<"gap_outreach_candidates">,
) {
  for (const candidate of candidates) {
    if (
      candidate._id === excludeId ||
      !["queued", "sent"].includes(candidate.status)
    )
      continue;
    if (await recoveryOfferContext(ctx, candidate)) return true;
    await expireRecoveryCandidate(ctx, candidate);
  }
  return false;
}

export async function recoveryDeliverySkipReason(
  ctx: ReadCtx,
  notification: Doc<"notifications">,
) {
  if (notification.type !== "gap_fill_offer") return null;
  if (!notification.gapRecoveryCandidateId || notification.channel !== "email")
    return "This legacy opening offer must be scanned again.";
  const candidate = await ctx.db.get(notification.gapRecoveryCandidateId);
  if (
    !candidate ||
    candidate.orgId !== notification.orgId ||
    candidate.sentNotificationId !== notification._id
  )
    return "Opening offer unavailable.";
  const context = await recoveryOfferContext(ctx, candidate);
  if (
    !context ||
    context.candidate.recipientEmail !== notification.recipientAddress
  )
    return "Opening, customer permission, or appointment details have changed.";
  return null;
}

export async function syncRecoveryDelivery(
  ctx: MutationCtx,
  notification: Doc<"notifications">,
  status: "sent" | "failed" | "cancelled",
) {
  if (!notification.gapRecoveryCandidateId) return;
  const candidate = await ctx.db.get(notification.gapRecoveryCandidateId);
  if (
    !candidate ||
    candidate.orgId !== notification.orgId ||
    !["queued", "sent", "failed"].includes(candidate.status)
  )
    return;
  await ctx.db.patch(candidate._id, {
    status: status === "cancelled" ? "expired" : status,
    updatedAt: Date.now(),
  });
}

/** The attribution write and competing-offer invalidation share the booking transaction. */
export async function recordRecoveryBooking(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  claimedCandidateId?: Id<"gap_outreach_candidates">,
) {
  if (claimedCandidateId) {
    const candidate = await ctx.db.get(claimedCandidateId);
    if (
      !candidate ||
      candidate.orgId !== booking.orgId ||
      candidate.customerId !== booking.customerId ||
      candidate.offerStartAt !== booking.startAt ||
      candidate.offerEndAt !== booking.endAt ||
      candidate.serviceId !== booking.serviceId ||
      candidate.priceMinorUnits !== booking.priceMinorUnits ||
      candidate.currency !== booking.currency
    )
      throw new ConvexError("This offer does not match the appointment.");
  }
  const date = new Date(booking.startAt).toISOString().slice(0, 10);
  const gaps = await ctx.db
    .query("gap_suggestions")
    .withIndex("by_org_date", (q) =>
      q.eq("orgId", booking.orgId).eq("serviceDate", date),
    )
    .collect();
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", booking.orgId))
    .first();
  const bufferMs = (settings?.bufferTimeMins ?? 0) * 60_000;
  for (const gap of gaps) {
    if (
      gap.staffId !== booking.staffId ||
      !["open", "outreach_sent"].includes(gap.status)
    )
      continue;
    const candidates = await ctx.db
      .query("gap_outreach_candidates")
      .withIndex("by_org_gap_rank", (q) =>
        q.eq("orgId", booking.orgId).eq("gapSuggestionId", gap._id),
      )
      .collect();
    const claimed = candidates.find((c) => c._id === claimedCandidateId);
    if (claimed) {
      await ctx.db.patch(claimed._id, {
        status: "booked",
        bookedById: booking._id,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(booking._id, { gapRecoveryCandidateId: claimed._id });
      await ctx.db.patch(gap._id, {
        status: "filled",
        filledByBookingId: booking._id,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("audit_log", {
        orgId: booking.orgId,
        actorType: "system",
        action: "gap_optimizer.offer_booked",
        resourceType: "gap_outreach_candidates",
        resourceId: claimed._id,
        after: { bookingId: booking._id },
        createdAt: Date.now(),
      });
    }
    for (const candidate of candidates) {
      if (candidate._id === claimedCandidateId) continue;
      if (
        claimed ||
        (isConcreteCandidate(candidate) &&
          overlaps(
            candidate.offerStartAt,
            candidate.offerEndAt + bufferMs,
            booking.startAt,
            booking.endAt + bufferMs,
          ))
      ) {
        await expireRecoveryCandidate(ctx, candidate);
      }
    }
    if (
      !claimed &&
      booking.startAt <= gap.gapStartAt &&
      booking.endAt + bufferMs >= gap.gapEndAt
    ) {
      // Organic occupancy closes the opening without claiming outreach attribution.
      await closeRecoveryGap(ctx, gap, "expired");
    }
  }
  await scheduleRecoveryRefresh(ctx, booking.orgId, booking.staffId, date);
}

export async function scheduleRecoveryRefresh(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  staffId?: Id<"staff_members">,
  serviceDate?: string,
): Promise<void> {
  const resources = await recoveryResources(ctx, orgId);
  if (!resources?.enabled) return;
  const firstDate = new Date(
    wallClockNow(resources.settings.timezone || "Europe/Skopje"),
  )
    .toISOString()
    .slice(0, 10);
  const dates = serviceDate
    ? [serviceDate]
    : Array.from({ length: RECOVERY_HORIZON_DAYS }, (_, i) =>
        new Date(Date.parse(`${firstDate}T00:00:00Z`) + i * 86_400_000)
          .toISOString()
          .slice(0, 10),
      );
  for (const date of dates) {
    if (!recoveryDateAllowed(date, resources.settings)) continue;
    await ctx.scheduler.runAfter(
      0,
      internal.ai.gapOptimizerHelpers.reconcileDay,
      {
        orgId,
        serviceDate: date,
        ...(staffId ? { staffIds: [staffId] } : {}),
        detectedBy: "calendar_change",
      },
    );
  }
}

export function offerDeadline(startAt: number, timezone: string) {
  return (
    wallClockTimestampToInstant(startAt, timezone) - BOOKING_NOTICE_MS - 1_000
  );
}
