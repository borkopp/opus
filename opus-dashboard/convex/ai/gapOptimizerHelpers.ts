import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalQuery,
  internalMutation,
  query,
  mutation,
  type QueryCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAuth, requirePaidPlan, requireRole } from "../lib/auth";
import { wallClockNow } from "../lib/bookingTime";
import {
  isValidBookingEmail,
  normalizeBookingEmail,
} from "../lib/bookingEmailSecurity";
import { tenantSiteUrl } from "../lib/tenantSites";
import {
  reconcileRecoveryDay,
  type RecoveryScanResult,
} from "../lib/gapRecoveryScan";
import {
  closeRecoveryGap,
  expireRecoveryCandidate,
  isConcreteCandidate,
  hasActiveRecoveryOffer,
  offerDeadline,
  optionsForRecoveryGap,
  recoveryCustomerBookings,
  recoveryEmailReady,
  recoveryOfferContext,
  recoveryResources,
} from "../lib/gapRecovery";
import {
  RECOVERY_VERSION,
  RECOVERY_OFFER_TTL_MS,
  hashRecoveryToken,
  hasRecoveryConsent,
  rankRecoveryOptions,
  recoveryCustomerEligible,
  recoveryMessage,
} from "../lib/gapRecoveryRules";

export const reconcileDay = internalMutation({
  args: {
    orgId: v.id("orgs"),
    serviceDate: v.optional(v.string()),
    staffIds: v.optional(v.array(v.id("staff_members"))),
    detectedBy: v.union(
      v.literal("manual_scan"),
      v.literal("cancellation"),
      v.literal("calendar_change"),
    ),
    triggeredByBookingId: v.optional(v.id("bookings")),
  },
  handler: async (ctx, args): Promise<RecoveryScanResult | null> =>
    reconcileRecoveryDay(ctx, args),
});

export const queueApprovedOffer = internalMutation({
  args: {
    orgId: v.id("orgs"),
    candidateId: v.id("gap_outreach_candidates"),
    token: v.string(),
    tokenHash: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ notificationId: Id<"notifications"> }> => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "manager");
    requirePaidPlan(org, "Gap optimizer");
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.orgId !== args.orgId)
      throw new ConvexError("Candidate not found.");
    if (
      candidate.sentNotificationId &&
      ["queued", "sent", "booked"].includes(candidate.status)
    ) {
      return { notificationId: candidate.sentNotificationId };
    }
    const context = await recoveryOfferContext(ctx, candidate, true);
    if (!context)
      throw new ConvexError(
        "This offer is no longer eligible. Refresh the openings and choose another customer.",
      );
    if (!recoveryEmailReady())
      throw new ConvexError("Opening-offer email delivery is not configured.");
    const peers = await ctx.db
      .query("gap_outreach_candidates")
      .withIndex("by_org_gap_rank", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("gapSuggestionId", candidate.gapSuggestionId),
      )
      .collect();
    if (await hasActiveRecoveryOffer(ctx, peers, candidate._id)) {
      throw new ConvexError(
        "An offer is already active for this opening. Wait for a response or expiry.",
      );
    }
    const { customer, gap, staff, service, settings } = context;
    const now = Date.now();
    if (candidate.status === "failed" && candidate.sentNotificationId) {
      const existing = await ctx.db.get(candidate.sentNotificationId);
      if (
        !existing ||
        existing.orgId !== args.orgId ||
        existing.status !== "failed" ||
        existing.externalMessageId
      )
        throw new ConvexError("This email cannot be retried.");
      await ctx.db.patch(existing._id, {
        status: "pending",
        attemptCount: 0,
        scheduledFor: now,
        failureReason: undefined,
        processingStartedAt: undefined,
      });
      await ctx.db.patch(candidate._id, { status: "queued", updatedAt: now });
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.processIndividualNotification,
        { notificationId: existing._id },
      );
      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "staff",
        actorId: staffMember._id,
        action: "gap_optimizer.offer_retry_approved",
        resourceType: "gap_outreach_candidates",
        resourceId: candidate._id,
        createdAt: now,
      });
      return { notificationId: existing._id };
    }
    if (candidate.status !== "proposed")
      throw new ConvexError("This offer has already been handled.");
    if ((await hashRecoveryToken(args.token)) !== args.tokenHash)
      throw new Error("Invalid recovery token.");
    const expiresAt = Math.min(
      now + RECOVERY_OFFER_TTL_MS,
      offerDeadline(
        context.candidate.offerStartAt,
        settings.timezone || "Europe/Skopje",
      ),
    );
    const bookingLink = `${tenantSiteUrl(org.slug, process.env.ROOT_DOMAIN || "opus.mk")}/book?offer=${args.token}`;
    const notificationId: Id<"notifications"> = await ctx.runMutation(
      internal.notifications.scheduleNotification,
      {
        orgId: args.orgId,
        customerId: customer._id,
        gapRecoveryCandidateId: candidate._id,
        channel: "email",
        type: "gap_fill_offer",
        recipientAddress: normalizeBookingEmail(customer.email!),
        dedupeKey: `gap-offer:${candidate._id}`,
        templateData: {
          studioName: org.name,
          customerName: customer.name,
          serviceName: service.name,
          staffName: staff.displayName,
          startAt: context.candidate.offerStartAt,
          endAt: context.candidate.offerEndAt,
          priceMinorUnits: context.candidate.priceMinorUnits,
          currency: context.candidate.currency,
          locale: settings.locale || "mk-MK",
          timezone: settings.timezone || "Europe/Skopje",
          draftedMessage: candidate.draftedMessage,
          bookingLink,
          expiresAt,
        },
      },
    );
    await ctx.db.patch(candidate._id, {
      status: "queued",
      sentNotificationId: notificationId,
      offerTokenHash: args.tokenHash,
      recipientEmail: normalizeBookingEmail(customer.email!),
      approvedAt: now,
      expiresAt,
      updatedAt: now,
    });
    await ctx.db.patch(customer._id, {
      gapRecoveryLastContactAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(gap._id, {
      status: "outreach_sent",
      outreachSentAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAt(
      expiresAt,
      internal.ai.gapOptimizerHelpers.expireCandidate,
      { orgId: args.orgId, candidateId: candidate._id },
    );
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "gap_optimizer.outreach_approved",
      resourceType: "gap_outreach_candidates",
      resourceId: candidate._id,
      after: {
        notificationId,
        serviceId: service._id,
        startAt: context.candidate.offerStartAt,
        expiresAt,
      },
      createdAt: now,
    });
    return { notificationId };
  },
});

export const expireCandidate = internalMutation({
  args: { orgId: v.id("orgs"), candidateId: v.id("gap_outreach_candidates") },
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId);
    if (
      candidate?.orgId === args.orgId &&
      (candidate.expiresAt ?? 0) <= Date.now()
    )
      await expireRecoveryCandidate(ctx, candidate);
  },
});
export const expireGap = internalMutation({
  args: { orgId: v.id("orgs"), gapId: v.id("gap_suggestions") },
  handler: async (ctx, args) => {
    const gap = await ctx.db.get(args.gapId);
    if (
      gap?.orgId === args.orgId &&
      ["open", "outreach_sent"].includes(gap.status) &&
      (gap.expiresAt ?? 0) <= Date.now()
    )
      await closeRecoveryGap(ctx, gap, "expired");
  },
});
export const dismissGap = mutation({
  args: { orgId: v.id("orgs"), gapId: v.id("gap_suggestions") },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "manager");
    requirePaidPlan(org, "Gap optimizer");
    const gap = await ctx.db.get(args.gapId);
    if (
      !gap ||
      gap.orgId !== args.orgId ||
      !["open", "outreach_sent"].includes(gap.status)
    )
      throw new ConvexError("Opening unavailable.");
    await closeRecoveryGap(ctx, gap, "dismissed");
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "gap_optimizer.gap_dismissed",
      resourceType: "gap_suggestions",
      resourceId: gap._id,
      createdAt: Date.now(),
    });
  },
});
export const dismissCandidate = mutation({
  args: { orgId: v.id("orgs"), candidateId: v.id("gap_outreach_candidates") },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "manager");
    requirePaidPlan(org, "Gap optimizer");
    const candidate = await ctx.db.get(args.candidateId);
    if (
      !candidate ||
      candidate.orgId !== args.orgId ||
      !["proposed", "failed"].includes(candidate.status)
    )
      throw new ConvexError("Candidate unavailable.");
    await ctx.db.patch(candidate._id, {
      status: "skipped",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "gap_optimizer.candidate_dismissed",
      resourceType: "gap_outreach_candidates",
      resourceId: candidate._id,
      createdAt: Date.now(),
    });
  },
});

async function dashboardData(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  requestedDate?: string,
) {
  const { org, staffMember } = await requireAuth(ctx, orgId);
  requirePaidPlan(org, "Gap optimizer");
  const resources = await recoveryResources(ctx, orgId);
  if (!resources) throw new ConvexError("Business unavailable.");
  const { settings } = resources;
  const today = new Date(wallClockNow(settings.timezone || "Europe/Skopje"))
    .toISOString()
    .slice(0, 10);
  const serviceDate = requestedDate || today;
  const gaps = await ctx.db
    .query("gap_suggestions")
    .withIndex("by_org_date", (q) =>
      q.eq("orgId", orgId).eq("serviceDate", serviceDate),
    )
    .collect();
  const result = [];
  let filledCount = 0;
  const completedValue = new Map<string, number>();
  for (const gap of gaps.filter(
    (g) => g.recoveryVersion === RECOVERY_VERSION,
  )) {
    const candidates = await ctx.db
      .query("gap_outreach_candidates")
      .withIndex("by_org_gap_rank", (q) =>
        q.eq("orgId", orgId).eq("gapSuggestionId", gap._id),
      )
      .collect();
    const staff = await ctx.db.get(gap.staffId);
    const options = ["open", "outreach_sent"].includes(gap.status)
      ? await optionsForRecoveryGap(ctx, gap)
      : [];
    const detailed = [];
    for (const candidate of candidates) {
      if (
        !isConcreteCandidate(candidate) ||
        ["skipped", "responded_no"].includes(candidate.status)
      )
        continue;
      const customer = await ctx.db.get(candidate.customerId);
      if (
        !customer ||
        customer.orgId !== orgId ||
        customer.isDeleted ||
        customer.gdprErasureRequestedAt
      )
        continue;
      const service = await ctx.db.get(candidate.serviceId);
      if (!service || service.orgId !== orgId) continue;
      const notification = candidate.sentNotificationId
        ? await ctx.db.get(candidate.sentNotificationId)
        : null;
      const current = !!(await recoveryOfferContext(
        ctx,
        candidate,
        true,
        options,
      ));
      if (candidate.status === "proposed" && !current) continue;
      const booking = candidate.bookedById
        ? await ctx.db.get(candidate.bookedById)
        : null;
      if (
        booking?.orgId === orgId &&
        !booking.isDeleted &&
        ["confirmed", "checked_in", "completed"].includes(booking.status)
      ) {
        filledCount++;
        if (booking.status === "completed")
          completedValue.set(
            booking.currency,
            (completedValue.get(booking.currency) ?? 0) +
              booking.priceMinorUnits,
          );
      }
      const status =
        candidate.status === "booked"
          ? booking?.status === "cancelled"
            ? "booking_cancelled"
            : "booked"
          : notification?.status === "failed" ||
              notification?.deliveryStatus === "complained"
            ? "failed"
            : !current
              ? "expired"
              : notification?.status === "pending"
                ? "queued"
                : notification?.status === "delivered" ||
                    notification?.deliveryStatus === "delivered"
                  ? "delivered"
                  : notification?.status === "sent"
                    ? "sent"
                    : candidate.status;
      detailed.push({
        _id: candidate._id,
        customerName: customer.name,
        customerEmail: customer.email,
        serviceName: service.name,
        serviceId: service._id,
        startAt: candidate.offerStartAt,
        endAt: candidate.offerEndAt,
        priceMinorUnits: candidate.priceMinorUnits,
        currency: candidate.currency,
        reasons: candidate.reasons ?? [],
        draftedMessage: candidate.draftedMessage,
        status,
        expiresAt: candidate.expiresAt,
        failureReason: notification?.failureReason,
        canApprove:
          current &&
          ["proposed", "failed"].includes(candidate.status) &&
          (candidate.status !== "failed" ||
            (notification?.status === "failed" &&
              !notification.externalMessageId)),
        rank: candidate.rank,
      });
    }
    const activeOffer = detailed.some((c) =>
      ["queued", "sent", "delivered"].includes(c.status),
    );
    if (!options.length && !detailed.some((c) => c.status !== "proposed"))
      continue;
    result.push({
      _id: gap._id,
      serviceDate,
      gapStartAt: gap.gapStartAt,
      gapEndAt: gap.gapEndAt,
      durationMins: gap.durationMins,
      staffName: staff?.orgId === orgId ? staff.displayName : "Specialist",
      status: gap.status,
      activeOffer,
      hasBookableServices: options.length > 0,
      topCandidates: detailed
        .sort((a, b) => {
          const priority = (offer: { status: string; canApprove: boolean }) =>
            [
              "booked",
              "booking_cancelled",
              "queued",
              "sent",
              "delivered",
            ].includes(offer.status)
              ? 0
              : offer.status === "proposed" || offer.canApprove
                ? 1
                : 2;
          return priority(a) - priority(b) || a.rank - b.rank;
        })
        .slice(0, 5),
    });
  }
  const scan = settings.gapRecoveryScanHistory?.find(
    (s) => s.serviceDate === serviceDate,
  );
  return {
    serviceDate,
    today,
    timezone: settings.timezone || "Europe/Skopje",
    locale: settings.locale || "mk-MK",
    enabled: !!settings.gapOptimizerEnabled,
    websitePublished: resources.enabled || org.websiteStatus === "published",
    emailReady: recoveryEmailReady(),
    canManage: staffMember.role !== "staff",
    lastScanAt: scan?.scannedAt ?? null,
    eligibleCustomers: scan?.eligibleCustomers ?? null,
    gaps: result.sort((a, b) => a.gapStartAt - b.gapStartAt),
    openCount: result.filter(
      (g) =>
        g.hasBookableServices && !g.activeOffer && g.status !== "dismissed",
    ).length,
    outreachSentCount: result.filter((g) => g.activeOffer).length,
    filledCount,
    completedValue: [...completedValue].map(([currency, amount]) => ({
      currency,
      amount,
    })),
  };
}
export const getRecoveryDashboard = query({
  args: { orgId: v.id("orgs"), serviceDate: v.optional(v.string()) },
  handler: (ctx, args) => dashboardData(ctx, args.orgId, args.serviceDate),
});
export const getTodaySummary = query({
  args: { orgId: v.id("orgs") },
  handler: (ctx, args) => dashboardData(ctx, args.orgId),
});
export const getOpenGapsForOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => (await dashboardData(ctx, args.orgId)).gaps,
});

export const listRecoveryContacts = query({
  args: { orgId: v.id("orgs"), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, args.orgId, "manager");
    requirePaidPlan(org, "Gap optimizer");
    const rows = await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .take(1001);
    const search = (args.search ?? "").trim().toLowerCase();
    return rows
      .filter(
        (c) =>
          !c.isDeleted &&
          !c.gdprErasureRequestedAt &&
          (!search ||
            `${c.name} ${c.email ?? ""}`.toLowerCase().includes(search)),
      )
      .slice(0, 30)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        optedIn: hasRecoveryConsent(c),
      }));
  },
});
export const setRecoveryContactConsent = mutation({
  args: {
    orgId: v.id("orgs"),
    customerId: v.id("customers"),
    optedIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "manager");
    requirePaidPlan(org, "Gap optimizer");
    const customer = await ctx.db.get(args.customerId);
    if (
      !customer ||
      customer.orgId !== args.orgId ||
      customer.isDeleted ||
      customer.gdprErasureRequestedAt
    )
      throw new ConvexError("Customer unavailable.");
    if (
      args.optedIn &&
      (!customer.email ||
        !isValidBookingEmail(normalizeBookingEmail(customer.email)))
    )
      throw new ConvexError(
        "Add a valid email address to this customer first.",
      );
    await ctx.db.patch(customer._id, {
      gapRecoveryEmailOptIn: args.optedIn,
      gapRecoveryConsentAt: Date.now(),
      gapRecoveryConsentSource: "staff_recorded",
      updatedAt: Date.now(),
    });
    if (!args.optedIn) {
      const offers = await ctx.db
        .query("gap_outreach_candidates")
        .withIndex("by_org_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", customer._id),
        )
        .collect();
      for (const offer of offers) await expireRecoveryCandidate(ctx, offer);
    }
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "gap_optimizer.consent_recorded",
      resourceType: "customers",
      resourceId: customer._id,
      after: { optedIn: args.optedIn },
      createdAt: Date.now(),
    });
  },
});

export const chooseRecoveryCustomer = mutation({
  args: {
    orgId: v.id("orgs"),
    gapId: v.id("gap_suggestions"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, args.orgId, "manager");
    requirePaidPlan(org, "Gap optimizer");
    const gap = await ctx.db.get(args.gapId);
    const customer = await ctx.db.get(args.customerId);
    const resources = await recoveryResources(ctx, args.orgId);
    if (
      !gap ||
      gap.orgId !== args.orgId ||
      !["open", "outreach_sent"].includes(gap.status) ||
      !customer ||
      customer.orgId !== args.orgId ||
      !recoveryCustomerEligible(customer, Date.now()) ||
      !resources?.enabled
    )
      throw new ConvexError(
        "This customer or opening is not eligible for an offer.",
      );
    const options = await optionsForRecoveryGap(ctx, gap);
    const history = await recoveryCustomerBookings(
      ctx,
      args.orgId,
      customer._id,
    );
    const best = rankRecoveryOptions(
      customer,
      history,
      options,
      wallClockNow(resources.settings.timezone),
    )[0];
    if (!best)
      throw new ConvexError(
        "No suitable service fits, or the customer already has an upcoming appointment.",
      );
    const peers = await ctx.db
      .query("gap_outreach_candidates")
      .withIndex("by_org_gap_rank", (q) =>
        q.eq("orgId", args.orgId).eq("gapSuggestionId", gap._id),
      )
      .collect();
    if (await hasActiveRecoveryOffer(ctx, peers))
      throw new ConvexError("An offer is already active for this opening.");
    for (const peer of peers) {
      if (peer.status === "proposed" && peer.rank === 0)
        await ctx.db.patch(peer._id, { rank: 6 });
    }
    const existing = peers.find(
      (c) =>
        c.customerId === customer._id &&
        c.status === "proposed" &&
        c.serviceId === best.serviceId &&
        c.offerStartAt === best.startAt,
    );
    if (existing) {
      await ctx.db.patch(existing._id, { rank: 0 });
      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "staff",
        actorId: staffMember._id,
        action: "gap_optimizer.customer_selected",
        resourceType: "gap_outreach_candidates",
        resourceId: existing._id,
        createdAt: Date.now(),
      });
      return existing._id;
    }
    const staff = await ctx.db.get(gap.staffId);
    const id = await ctx.db.insert("gap_outreach_candidates", {
      orgId: args.orgId,
      gapSuggestionId: gap._id,
      customerId: customer._id,
      rank: 0,
      score: best.score,
      scoreRationale: best.reasons[0].en,
      reasons: best.reasons,
      channel: "email",
      confidenceScore: 0,
      draftedMessage: recoveryMessage({
        ...best,
        studioName: org.name,
        staffName: staff?.displayName ?? "Specialist",
        locale: resources.settings.locale,
      }),
      status: "proposed",
      serviceId: best.serviceId,
      offerStartAt: best.startAt,
      offerEndAt: best.endAt,
      priceMinorUnits: best.priceMinorUnits,
      currency: best.currency,
      expiresAt: offerDeadline(best.startAt, resources.settings.timezone),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAt(
      offerDeadline(best.startAt, resources.settings.timezone),
      internal.ai.gapOptimizerHelpers.expireCandidate,
      { orgId: args.orgId, candidateId: id },
    );
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "gap_optimizer.customer_selected",
      resourceType: "gap_outreach_candidates",
      resourceId: id,
      createdAt: Date.now(),
    });
    return id;
  },
});

async function findOffer(
  ctx: Pick<QueryCtx, "db">,
  orgId: Id<"orgs">,
  token: string,
) {
  const hash = await hashRecoveryToken(token);
  if (!hash) return null;
  return ctx.db
    .query("gap_outreach_candidates")
    .withIndex("by_org_token", (q) =>
      q.eq("orgId", orgId).eq("offerTokenHash", hash),
    )
    .unique();
}
export const getPublicOffer = query({
  args: { orgId: v.id("orgs"), token: v.string() },
  handler: async (ctx, args) => {
    const candidate = await findOffer(ctx, args.orgId, args.token);
    if (!candidate || !isConcreteCandidate(candidate)) return null;
    const resources = await recoveryResources(ctx, args.orgId);
    if (!resources || resources.org.websiteStatus !== "published") return null;
    const gap = await ctx.db.get(candidate.gapSuggestionId);
    if (!gap || gap.orgId !== args.orgId) return null;
    const available = !!(await recoveryOfferContext(ctx, candidate));
    // No recipient identity is exposed through a bearer link.
    return {
      available,
      serviceId: candidate.serviceId,
      staffId: gap.staffId,
      startAt: candidate.offerStartAt,
      endAt: candidate.offerEndAt,
      priceMinorUnits: candidate.priceMinorUnits,
      currency: candidate.currency,
      expiresAt: candidate.expiresAt,
    };
  },
});
export const assertOfferRecipient = internalQuery({
  args: { orgId: v.id("orgs"), token: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const candidate = await findOffer(ctx, args.orgId, args.token);
    const context = candidate
      ? await recoveryOfferContext(ctx, candidate)
      : null;
    if (
      !context ||
      context.candidate.recipientEmail !== normalizeBookingEmail(args.email)
    )
      throw new ConvexError(
        "This opening offer is unavailable or belongs to another email address.",
      );
    return candidate!._id;
  },
});
export const declinePublicOffer = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), unsubscribe: v.boolean() },
  handler: async (ctx, args) => {
    const candidate = await findOffer(ctx, args.orgId, args.token);
    if (!candidate) throw new ConvexError("Offer unavailable.");
    const customer = await ctx.db.get(candidate.customerId);
    if (!customer || customer.orgId !== args.orgId)
      throw new ConvexError("Offer unavailable.");
    await expireRecoveryCandidate(ctx, candidate);
    if (candidate.status !== "booked")
      await ctx.db.patch(candidate._id, {
        status: "responded_no",
        updatedAt: Date.now(),
      });
    if (args.unsubscribe) {
      await ctx.db.patch(customer._id, {
        gapRecoveryEmailOptIn: false,
        gapRecoveryConsentAt: Date.now(),
        gapRecoveryConsentSource: "offer_unsubscribe",
        updatedAt: Date.now(),
      });
      const offers = await ctx.db
        .query("gap_outreach_candidates")
        .withIndex("by_org_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", customer._id),
        )
        .collect();
      for (const offer of offers) await expireRecoveryCandidate(ctx, offer);
    }
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action: args.unsubscribe
        ? "gap_optimizer.unsubscribed"
        : "gap_optimizer.offer_declined",
      resourceType: "gap_outreach_candidates",
      resourceId: candidate._id,
      createdAt: Date.now(),
    });
  },
});
