import {
  recordRecoveryBooking,
  scheduleRecoveryRefresh,
} from "./lib/gapRecovery";
import { v, ConvexError } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { cancelBookingRecord } from "./lib/bookingCancellation";
import {
  assertBookingAccess,
  hasPersonalBookingAccess,
  requireBookingAccess,
} from "./lib/staffAccess";
import type { Doc } from "./_generated/dataModel";
import { computeFreeIntervalsForStaffDate } from "./slots";
import {
  queueBookingNotifications,
  queueBookingRescheduledNotifications,
} from "./lib/bookingNotifications";
import {
  formatBookingNotificationDateTime,
  wallClockNow,
  wallClockTimestampToInstant,
} from "./lib/bookingTime";
import { rangeFitsFreeInterval } from "./lib/quickBooking";
import { clientClaimUrl, createClientClaimToken } from "./lib/clientAccounts";
import { normalizeBookingEmail } from "./lib/bookingEmailSecurity";
import { ACTIVE_INDUSTRY, isActiveIndustry } from "./lib/productScope";
import {
  automaticCompletionEnabled,
  canAutomaticallyComplete,
  cancelBookingCompletion,
  completeBookingRecord,
  scheduleBookingCompletion,
} from "./lib/bookingCompletion";

function getPrimaryContact(
  customer: Doc<"customers">,
): { channel: "email" | "sms" | "whatsapp" | "push"; address: string } | null {
  if (customer.preferredChannel === "whatsapp" && customer.phone)
    return { channel: "whatsapp", address: customer.phone };
  if (customer.preferredChannel === "sms" && customer.phone)
    return { channel: "sms", address: customer.phone };
  if (customer.email) return { channel: "email", address: customer.email };
  if (customer.phone) return { channel: "sms", address: customer.phone };
  return null;
}

export const createBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    serviceId: v.id("services"),
    customerId: v.id("customers"),
    startAt: v.number(), // Unix ms
    source: v.union(
      v.literal("web"),
      v.literal("opus_web"),
      v.literal("ai_whatsapp"),
      v.literal("ai_instagram"),
      v.literal("ai_webchat"),
      v.literal("ai_voice"),
      v.literal("manual"),
    ),
    aiConversationId: v.optional(v.id("ai_conversations")),
  },
  handler: async (ctx, args) => {
    await requireBookingAccess(ctx, args.orgId, args.staffId);
    if (args.source !== "manual") {
      throw new ConvexError("Dashboard bookings must use the manual source.");
    }

    // 1. Basic validation
    if (args.startAt <= Date.now()) {
      throw new ConvexError("Booking start time must be in the future.");
    }

    const orgSettings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!orgSettings) throw new ConvexError("Organization settings not found.");

    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) throw new ConvexError("Organization not found.");

    const staff = await ctx.db.get(args.staffId);
    if (
      !staff ||
      staff.orgId !== args.orgId ||
      staff.isDeleted ||
      !staff.isActive
    ) {
      throw new ConvexError("Staff member not available.");
    }

    const service = await ctx.db.get(args.serviceId);
    if (
      !service ||
      service.orgId !== args.orgId ||
      service.isDeleted ||
      !service.isActive
    ) {
      throw new ConvexError("Service not available.");
    }

    if (!service.staffIds.includes(args.staffId)) {
      throw new ConvexError("Staff member cannot perform this service.");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
      throw new ConvexError("Customer not found.");
    }

    // Alignment check
    // Convert ms to start of day ms, then diff to get mins, check modulo
    const d = new Date(args.startAt);
    const startMins = d.getUTCHours() * 60 + d.getUTCMinutes();
    if (startMins % orgSettings.slotDurationMins !== 0) {
      throw new ConvexError(
        `Booking must align to ${orgSettings.slotDurationMins} minute intervals.`,
      );
    }

    // 2. Conflict Prevention
    const endAt = args.startAt + service.durationMins * 60 * 1000;

    // We check for any booking that overlaps with this staff member's requested slot.
    // An overlap occurs if an existing booking's start time is BEFORE the requested end time,
    // AND the existing booking's end time is AFTER the requested start time.
    // Instead of querying all and filtering in memory we can use by_staff_start to narrow it down to the same day loosely

    const midnightMs = new Date(
      new Date(args.startAt).toISOString().split("T")[0] + "T00:00:00Z",
    ).getTime();
    const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff_start", (q) =>
        q
          .eq("staffId", args.staffId)
          .gte("startAt", midnightMs)
          .lt("startAt", nextMidnightMs),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();

    const bufferMs = (orgSettings.bufferTimeMins || 0) * 60 * 1000;

    const conflict = existingBookings.find((b) => {
      const existingStart = b.startAt;
      const existingEnd = b.endAt + bufferMs;
      return existingStart < endAt && existingEnd > args.startAt;
    });

    if (conflict) {
      throw new ConvexError(
        "This slot is already booked or conflicts with buffer time.",
      );
    }

    // 3. Surge Pricing Snapshot
    let priceMinorUnits = service.priceMinorUnits;
    let surgePriceApplied = false;
    let surgeMultiplierPct: number | undefined = undefined;

    if (orgSettings.surgeRules && orgSettings.surgeRules.length > 0) {
      const dayOfWeek = d.getDay();
      const timeH = d.getHours(); // Use local hours assuming host tz represents location
      const timeM = d.getMinutes();
      const timeStr = `${String(timeH).padStart(2, "0")}:${String(timeM).padStart(2, "0")}`;

      const matchingRule = orgSettings.surgeRules.find(
        (r) =>
          r.dayOfWeek === dayOfWeek &&
          timeStr >= r.startTime &&
          timeStr < r.endTime,
      );

      if (matchingRule) {
        surgePriceApplied = true;
        surgeMultiplierPct = matchingRule.multiplierPct;
        priceMinorUnits = Math.round(
          priceMinorUnits * (1 + matchingRule.multiplierPct / 100),
        );
      }
    }

    // 4. Insert Booking
    const bookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: args.staffId,
      serviceId: args.serviceId,
      customerId: args.customerId,
      startAt: args.startAt,
      endAt,
      priceMinorUnits,
      currency: service.currency,
      surgePriceApplied,
      surgeMultiplierPct,
      status: "confirmed",
      source: args.source,
      aiConversationId: args.aiConversationId,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Update Customer stats
    await ctx.db.patch(args.customerId, {
      totalVisits: (customer.totalVisits || 0) + 1,
      lastVisitAt: Date.now(), // Visited/Booked timestamp
      updatedAt: Date.now(),
    });

    // 6. Audit Log
    const timestamp = Date.now();
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: "dashboard",
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      after: {
        staffId: args.staffId,
        customerId: args.customerId,
        startAt: args.startAt,
        priceMinorUnits,
        status: "confirmed",
      },
      createdAt: timestamp,
    });

    // 7. Transactional email confirmation and reminder schedule.
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Created booking was not found.");
    await scheduleBookingCompletion(ctx, booking, orgSettings.timezone);
    await queueBookingNotifications(ctx, {
      org,
      settings: orgSettings,
      booking,
      customer,
      service,
      staff,
      sendCustomerConfirmation: true,
      notifyTeamOfNewBooking: false,
      notifyAssignedStaffOfNewBooking: true,
      scheduleReminders: true,
    });

    // 8. Dashboard notification — shows in navbar bell for the business owner
    const appointmentLabel = formatBookingNotificationDateTime(args.startAt);
    await ctx.runMutation(internal.dashboardNotifications.create, {
      orgId: args.orgId,
      type: "new_booking",
      title: "New Booking",
      body: `${customer.name} booked ${service.name} with ${staff.displayName} for ${appointmentLabel}`,
      bookingId,
      customerId: args.customerId,
    });

    const createdForRecovery = await ctx.db.get(bookingId);
    if (createdForRecovery)
      await recordRecoveryBooking(ctx, createdForRecovery);
    return bookingId;
  },
});

export const createManualBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    serviceIds: v.array(v.id("services")),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { staffMember: actor } = await requireBookingAccess(
      ctx,
      args.orgId,
      args.staffId,
    );

    const customerName = args.customerName.trim();
    const customerEmail = args.customerEmail?.trim().toLowerCase() || undefined;
    const customerPhone = args.customerPhone?.trim() || undefined;
    if (!customerName || customerName.length > 120) {
      throw new ConvexError("Enter a customer name up to 120 characters.");
    }
    if (
      customerEmail &&
      (!customerEmail.includes("@") || customerEmail.length > 254)
    ) {
      throw new ConvexError("Enter a valid email address.");
    }
    if (customerPhone && customerPhone.length > 40) {
      throw new ConvexError("Enter a valid phone number.");
    }

    const uniqueServiceIds = Array.from(new Set(args.serviceIds));
    if (uniqueServiceIds.length === 0 || uniqueServiceIds.length > 20) {
      throw new ConvexError("Select between 1 and 20 services.");
    }

    const [org, settings, staff] = await Promise.all([
      ctx.db.get(args.orgId),
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (query) => query.eq("orgId", args.orgId))
        .first(),
      ctx.db.get(args.staffId),
    ]);
    if (!org || org.isDeleted) throw new ConvexError("Organization not found.");
    if (!settings) throw new ConvexError("Organization settings not found.");
    if (
      !staff ||
      staff.orgId !== args.orgId ||
      staff.isDeleted ||
      !staff.isActive
    ) {
      throw new ConvexError("Staff member not available.");
    }

    const services: Doc<"services">[] = [];
    for (const serviceId of uniqueServiceIds) {
      const service = await ctx.db.get(serviceId);
      if (
        !service ||
        service.orgId !== args.orgId ||
        service.isDeleted ||
        !service.isActive
      ) {
        throw new ConvexError("One of the selected services is unavailable.");
      }
      if (!service.staffIds.includes(args.staffId)) {
        throw new ConvexError(
          `${staff.displayName} cannot perform ${service.name}.`,
        );
      }
      services.push(service);
    }

    const currency = services[0].currency;
    if (services.some((service) => service.currency !== currency)) {
      throw new ConvexError("Selected services must use the same currency.");
    }

    const durationMins = services.reduce(
      (total, service) => total + service.durationMins,
      0,
    );
    if (
      !Number.isInteger(durationMins) ||
      durationMins <= 0 ||
      durationMins > 1_440
    ) {
      throw new ConvexError(
        "Selected services have an invalid total duration.",
      );
    }

    const startDate = new Date(args.startAt);
    const startMins = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
    if (startMins % settings.slotDurationMins !== 0) {
      throw new ConvexError(
        `Booking must align to ${settings.slotDurationMins} minute intervals.`,
      );
    }
    if (args.startAt <= wallClockNow(settings.timezone)) {
      throw new ConvexError("Booking start time must be in the future.");
    }

    const serviceDate = startDate.toISOString().slice(0, 10);
    const availability = await computeFreeIntervalsForStaffDate(
      ctx,
      args.orgId,
      args.staffId,
      serviceDate,
    );
    if (
      !rangeFitsFreeInterval(
        availability.freeIntervals,
        args.startAt,
        durationMins,
        settings.bufferTimeMins,
      )
    ) {
      throw new ConvexError(
        "The selected services no longer fit this time or conflict with another booking.",
      );
    }

    let customer: Doc<"customers"> | null = null;
    if (customerPhone) {
      customer = await ctx.db
        .query("customers")
        .withIndex("by_org_phone", (query) =>
          query.eq("orgId", args.orgId).eq("phone", customerPhone),
        )
        .first();
    }
    if ((!customer || customer.isDeleted) && customerEmail) {
      customer = await ctx.db
        .query("customers")
        .withIndex("by_org_email", (query) =>
          query.eq("orgId", args.orgId).eq("email", customerEmail),
        )
        .first();
    }
    if (customer?.isDeleted) customer = null;

    const now = Date.now();
    let customerId: Doc<"customers">["_id"];
    if (customer) {
      const customerBefore = customer;
      await ctx.db.patch(customer._id, {
        name: customerName,
        email: customerEmail ?? customer.email,
        phone: customerPhone ?? customer.phone,
        updatedAt: now,
      });
      customerId = customer._id;
      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "staff",
        actorId: actor._id,
        action: "customer.updated",
        resourceType: "customers",
        resourceId: customerId,
        before: {
          name: customerBefore.name,
          email: customerBefore.email,
          phone: customerBefore.phone,
        },
        after: {
          name: customerName,
          email: customerEmail ?? customerBefore.email,
          phone: customerPhone ?? customerBefore.phone,
        },
        createdAt: now,
      });
      customer = await ctx.db.get(customerId);
    } else {
      customerId = await ctx.db.insert("customers", {
        orgId: args.orgId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        totalVisits: 0,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "staff",
        actorId: actor._id,
        action: "customer.created",
        resourceType: "customers",
        resourceId: customerId,
        after: {
          name: customerName,
          hasEmail: Boolean(customerEmail),
          hasPhone: Boolean(customerPhone),
        },
        createdAt: now,
      });
      customer = await ctx.db.get(customerId);
    }
    if (!customer) throw new Error("Manual booking customer was not found.");

    let priceMinorUnits = services.reduce(
      (total, service) => total + service.priceMinorUnits,
      0,
    );
    let surgePriceApplied = false;
    let surgeMultiplierPct: number | undefined;
    const timeStr = `${String(startDate.getUTCHours()).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")}`;
    const matchingRule = settings.surgePricingEnabled
      ? settings.surgeRules?.find(
          (rule) =>
            rule.dayOfWeek === startDate.getUTCDay() &&
            timeStr >= rule.startTime &&
            timeStr < rule.endTime,
        )
      : undefined;
    if (matchingRule) {
      surgePriceApplied = true;
      surgeMultiplierPct = matchingRule.multiplierPct;
      priceMinorUnits = Math.round(
        priceMinorUnits * (1 + matchingRule.multiplierPct / 100),
      );
    }

    const endAt = args.startAt + durationMins * 60_000;
    const primaryService = services[0];
    const bookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: args.staffId,
      serviceId: primaryService._id,
      serviceIds: services.map((service) => service._id),
      customerId,
      startAt: args.startAt,
      endAt,
      priceMinorUnits,
      currency,
      surgePriceApplied,
      surgeMultiplierPct,
      status: "confirmed",
      source: "manual",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(customerId, {
      totalVisits: (customer.totalVisits || 0) + 1,
      lastVisitAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: actor._id,
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      after: {
        staffId: args.staffId,
        customerId,
        serviceIds: services.map((service) => service._id),
        startAt: args.startAt,
        endAt,
        priceMinorUnits,
        status: "confirmed",
      },
      createdAt: now,
    });

    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Created booking was not found.");
    await scheduleBookingCompletion(ctx, booking, settings.timezone);
    const combinedService: Doc<"services"> = {
      ...primaryService,
      name: services.map((service) => service.name).join(" + "),
      durationMins,
      priceMinorUnits,
    };
    await queueBookingNotifications(ctx, {
      org,
      settings,
      booking,
      customer,
      service: combinedService,
      staff,
      sendCustomerConfirmation: true,
      notifyTeamOfNewBooking: false,
      notifyAssignedStaffOfNewBooking: true,
      scheduleReminders: true,
    });

    const appointmentLabel = formatBookingNotificationDateTime(args.startAt);
    await ctx.runMutation(internal.dashboardNotifications.create, {
      orgId: args.orgId,
      type: "new_booking",
      title: "New Booking",
      body: `${customerName} booked ${combinedService.name} with ${staff.displayName} for ${appointmentLabel}`,
      bookingId,
      customerId,
    });

    const createdForRecovery = await ctx.db.get(bookingId);
    if (createdForRecovery)
      await recordRecoveryBooking(ctx, createdForRecovery);
    return bookingId;
  },
});

export const completeScheduledBooking = internalMutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
    expectedEndAt: v.number(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const booking = await ctx.db.get(args.bookingId);
    if (
      !booking ||
      booking.orgId !== args.orgId ||
      !booking.autoCompletionJobId ||
      booking.autoCompletionScheduledFor !== args.scheduledFor
    ) {
      return false;
    }
    const execution = { executingJobId: booking.autoCompletionJobId };
    const org = await ctx.db.get(args.orgId);
    if (
      !automaticCompletionEnabled() ||
      !org ||
      org.isDeleted ||
      !isActiveIndustry(org.industry) ||
      !canAutomaticallyComplete(booking)
    ) {
      await cancelBookingCompletion(ctx, booking, execution);
      return false;
    }
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!settings) {
      await cancelBookingCompletion(ctx, booking, execution);
      return false;
    }
    const currentEnd = wallClockTimestampToInstant(
      booking.endAt,
      settings.timezone,
    );
    if (
      booking.endAt !== args.expectedEndAt ||
      currentEnd !== args.scheduledFor
    ) {
      await scheduleBookingCompletion(
        ctx,
        booking,
        settings.timezone,
        execution,
      );
      return false;
    }
    if (Date.now() < currentEnd) return false;
    return completeBookingRecord(
      ctx,
      booking,
      { type: "system", id: "automatic-completion" },
      execution,
    );
  },
});

/** Setup future bookings for a studio; never enroll untouched past history. */
export const setupAutomaticCompletionForOrg = internalMutation({
  args: {
    orgId: v.id("orgs"),
    cursor: v.optional(v.union(v.string(), v.null())),
    startedAt: v.optional(v.number()),
    onlyArmed: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    scanned: number;
    scheduled: number;
    isDone: boolean;
    nextCursor: string | null;
  }> => {
    if (!automaticCompletionEnabled()) {
      throw new ConvexError("Automatic completion is temporarily disabled.");
    }
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted || !isActiveIndustry(org.industry)) {
      return { scanned: 0, scheduled: 0, isDone: true, nextCursor: null };
    }
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!settings) {
      return { scanned: 0, scheduled: 0, isDone: true, nextCursor: null };
    }
    // Keep the eligibility boundary stable if appointments finish while pages
    // are being processed. A timezone edit may also move an armed task to now.
    const startedAt = args.startedAt ?? Date.now();
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    let scheduled = 0;
    for (const booking of bookings.page) {
      if (args.onlyArmed && !booking.autoCompletionJobId) continue;
      if (!canAutomaticallyComplete(booking)) {
        await cancelBookingCompletion(ctx, booking);
        continue;
      }
      if (
        await scheduleBookingCompletion(ctx, booking, settings.timezone, {
          eligibleAfter: startedAt,
        })
      ) {
        scheduled += 1;
      }
    }
    if (!bookings.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.bookings.setupAutomaticCompletionForOrg,
        {
          orgId: args.orgId,
          cursor: bookings.continueCursor,
          startedAt,
          ...(args.onlyArmed ? { onlyArmed: true } : {}),
        },
      );
    }
    return {
      scanned: bookings.page.length,
      scheduled,
      isDone: bookings.isDone,
      nextCursor: bookings.isDone ? null : bookings.continueCursor,
    };
  },
});

/** Operator-run enrollment of existing future appointments, without a cron. */
export const setupAutomaticCompletionForAllStudios = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    startedAt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    scanned: number;
    studiosScheduled: number;
    isDone: boolean;
    nextCursor: string | null;
  }> => {
    if (!automaticCompletionEnabled()) {
      throw new ConvexError("Automatic completion is temporarily disabled.");
    }
    const startedAt = args.startedAt ?? Date.now();
    // This explicitly authorized operator setup enumerates organization roots
    // only. Every booking/settings read remains inside the tenant-scoped setup.
    const organizations = await ctx.db
      .query("orgs")
      .withIndex("by_industry_created", (q) =>
        q.eq("industry", ACTIVE_INDUSTRY).lte("createdAt", startedAt),
      )
      .paginate({
        cursor: args.cursor ?? null,
        numItems: 25,
        maximumBytesRead: 1_000_000,
      });
    let studiosScheduled = 0;
    for (const org of organizations.page) {
      if (org.isDeleted) continue;
      await ctx.scheduler.runAfter(
        0,
        internal.bookings.setupAutomaticCompletionForOrg,
        { orgId: org._id, startedAt },
      );
      studiosScheduled += 1;
    }
    if (!organizations.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.bookings.setupAutomaticCompletionForAllStudios,
        { cursor: organizations.continueCursor, startedAt },
      );
    }
    return {
      scanned: organizations.page.length,
      studiosScheduled,
      isDone: organizations.isDone,
      nextCursor: organizations.isDone ? null : organizations.continueCursor,
    };
  },
});

export const completeBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);
    const { staffMember } = auth;

    const booking = await ctx.db.get(args.bookingId);
    if (booking) assertBookingAccess(auth, booking);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    // A scheduled completion may win the race with an open appointment drawer.
    if (booking.status === "completed") return true;
    if (booking.status !== "checked_in" && booking.status !== "confirmed") {
      // Allow jump from confirmed -> complete
      throw new ConvexError(
        `Cannot complete booking with status: ${booking.status}`,
      );
    }

    await completeBookingRecord(ctx, booking, {
      type: "staff",
      id: staffMember._id,
    });

    // Preserve the existing manual follow-up. Automatic completion only updates
    // the appointment; it must not trigger emails for historical appointments.
    const customer = await ctx.db.get(booking.customerId);
    if (customer?.orgId === booking.orgId && !customer.isDeleted) {
      const service = await ctx.db.get(booking.serviceId);
      const staff = await ctx.db.get(booking.staffId);
      const contact = getPrimaryContact(customer);
      if (
        service?.orgId === booking.orgId &&
        staff?.orgId === booking.orgId &&
        contact
      ) {
        await ctx.runMutation(internal.notifications.scheduleNotification, {
          orgId: args.orgId,
          customerId: customer._id,
          bookingId: booking._id,
          channel: contact.channel,
          type: "review_request",
          recipientAddress: contact.address,
          templateData: {
            customerName: customer.name,
            serviceName: service.name,
            staffName: staff.displayName,
            startAt: booking.startAt,
          },
          scheduledFor: Date.now() + 24 * 60 * 60 * 1000,
        });
      }
    }

    return true;
  },
});

export const cancelBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);
    const { staffMember } = auth;
    const booking = await ctx.db.get(args.bookingId);
    if (booking) assertBookingAccess(auth, booking);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    return cancelBookingRecord(
      ctx,
      booking,
      { type: "staff", id: staffMember._id },
      args.reason,
    );
  },
});

export const markNoShow = mutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);
    const { staffMember } = auth;

    const booking = await ctx.db.get(args.bookingId);
    if (booking) assertBookingAccess(auth, booking);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    if (!["confirmed", "checked_in", "completed"].includes(booking.status)) {
      throw new ConvexError(
        `Cannot mark no_show from status: ${booking.status}`,
      );
    }

    await cancelBookingCompletion(ctx, booking);
    await ctx.db.patch(args.bookingId, {
      status: "no_show",
      updatedAt: Date.now(),
    });

    const customer = await ctx.db.get(booking.customerId);
    if (customer?.orgId === booking.orgId && !customer.isDeleted) {
      // Recalculate basic risk score (e.g. no_show / total bindings).
      const newNoShowCount = customer.noShowCount + 1;
      const newTotalVisits = Math.max(customer.totalVisits || 1, 1);
      const riskScore = newNoShowCount / newTotalVisits;

      await ctx.db.patch(booking.customerId, {
        noShowCount: newNoShowCount,
        noShowRiskScore: riskScore,
        ...(booking.status === "completed"
          ? {
              totalSpendMinorUnits: Math.max(
                0,
                (customer.totalSpendMinorUnits || 0) - booking.priceMinorUnits,
              ),
            }
          : {}),
        updatedAt: Date.now(),
      });
    }

    // A previously completed appointment may have a manual review request queued.
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_org_booking", (q) =>
        q.eq("orgId", args.orgId).eq("bookingId", booking._id),
      )
      .collect();
    for (const notification of notifications) {
      if (
        notification.status === "pending" &&
        [
          "review_request",
          "booking_reminder",
          "staff_booking_reminder",
        ].includes(notification.type)
      ) {
        await ctx.db.patch(notification._id, {
          status: "cancelled",
          failureReason: "Appointment marked as no-show",
          processingStartedAt: undefined,
        });
      }
    }

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "booking.no_show",
      resourceType: "bookings",
      resourceId: args.bookingId,
      before: { status: booking.status },
      after: { status: "no_show" },
      createdAt: Date.now(),
    });

    const staff = await ctx.db.get(booking.staffId);
    const service = await ctx.db.get(booking.serviceId);
    if (
      staff?.orgId === booking.orgId &&
      customer?.orgId === booking.orgId &&
      !customer.isDeleted &&
      service?.orgId === booking.orgId
    ) {
      let staffEmail: string | null = null;
      if (staff.userId) {
        const user = await ctx.db.get(staff.userId);
        if (user && user.email) staffEmail = user.email;
      }
      if (staffEmail) {
        await ctx.runMutation(internal.notifications.scheduleNotification, {
          orgId: args.orgId,
          customerId: customer._id,
          bookingId: booking._id,
          channel: "email",
          type: "no_show_warning",
          recipientAddress: staffEmail,
          templateData: {
            customerName: customer.name,
            serviceName: service.name,
            staffName: staff.displayName,
            startAt: booking.startAt,
          },
        });
      }

      // Dashboard notification
      const noShowLabel = formatBookingNotificationDateTime(booking.startAt);
      await ctx.runMutation(internal.dashboardNotifications.create, {
        orgId: args.orgId,
        type: "no_show",
        title: "No-Show",
        body: `${customer.name} didn't show up for ${service.name} on ${noShowLabel}`,
        bookingId: booking._id,
        customerId: customer._id,
      });
    }

    return true;
  },
});

export const rescheduleBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
    newStartAt: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);
    const { staffMember } = auth;
    // Find existing
    const oldBooking = await ctx.db.get(args.bookingId);
    if (oldBooking) assertBookingAccess(auth, oldBooking);
    if (
      !oldBooking ||
      oldBooking.orgId !== args.orgId ||
      oldBooking.isDeleted ||
      ["cancelled", "completed", "no_show"].includes(oldBooking.status)
    ) {
      throw new ConvexError("Cannot reschedule this booking.");
    }

    // Essentially alias the creation mutation handler body inside this transaction for atomicity.
    // It requires the original args context though. For simplicity right now we can cancel then create.
    // Let's cancel the current one:

    await cancelBookingCompletion(ctx, oldBooking);
    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      cancellationReason: "Rescheduled",
      cancelledAt: Date.now(),
      cancelledBy: staffMember._id,
      updatedAt: Date.now(),
    });

    // Normally we'd invoke the same logic inside `createBooking`, but since JS mutation calling internally doesn't exist natively,
    // we copy the safety locks for the new booking inline:

    const serviceIds = oldBooking.serviceIds ?? [oldBooking.serviceId];
    const services: Doc<"services">[] = [];
    for (const serviceId of serviceIds) {
      const service = await ctx.db.get(serviceId);
      if (!service || service.orgId !== args.orgId || service.isDeleted) {
        throw new ConvexError("Service not found");
      }
      services.push(service);
    }
    const service = services[0];
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (query) => query.eq("orgId", args.orgId))
      .first();
    if (!settings) throw new ConvexError("Organization settings not found.");

    const durationMins = Math.round(
      (oldBooking.endAt - oldBooking.startAt) / 60_000,
    );
    const endAt = args.newStartAt + durationMins * 60_000;
    const newStart = new Date(args.newStartAt);
    const startMins = newStart.getUTCHours() * 60 + newStart.getUTCMinutes();
    if (
      args.newStartAt <= wallClockNow(settings.timezone) ||
      startMins % settings.slotDurationMins !== 0
    ) {
      throw new ConvexError(
        "Choose a future time aligned to the booking grid.",
      );
    }

    const date = newStart.toISOString().slice(0, 10);
    const availability = await computeFreeIntervalsForStaffDate(
      ctx,
      args.orgId,
      oldBooking.staffId,
      date,
    );
    if (
      !rangeFitsFreeInterval(
        availability.freeIntervals,
        args.newStartAt,
        durationMins,
        settings.bufferTimeMins,
      )
    ) {
      throw new ConvexError(
        "The new time is outside working hours or no longer available.",
      );
    }

    const bookingCustomer = await ctx.db.get(oldBooking.customerId);
    const claim =
      !oldBooking.opusUserId &&
      oldBooking.clientVerifiedEmail &&
      bookingCustomer?.orgId === args.orgId &&
      normalizeBookingEmail(bookingCustomer.email ?? "") ===
        normalizeBookingEmail(oldBooking.clientVerifiedEmail)
        ? await createClientClaimToken()
        : null;
    const newBookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: oldBooking.staffId,
      serviceId: oldBooking.serviceId,
      serviceIds: oldBooking.serviceIds,
      customerId: oldBooking.customerId,
      startAt: args.newStartAt,
      endAt,
      priceMinorUnits: oldBooking.priceMinorUnits, // carry over snapshotted price
      currency: oldBooking.currency,
      surgePriceApplied: oldBooking.surgePriceApplied,
      surgeMultiplierPct: oldBooking.surgeMultiplierPct,
      status: oldBooking.status, // preserve the current lifecycle status
      source: oldBooking.source,
      aiConversationId: oldBooking.aiConversationId,
      opusUserId: oldBooking.opusUserId,
      clientVerifiedEmail: oldBooking.clientVerifiedEmail,
      ...(claim
        ? {
            clientClaimTokenHash: claim.hash,
            clientClaimTokenExpiresAt: claim.expiresAt,
          }
        : {}),
      customerNote: oldBooking.customerNote,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "booking.rescheduled",
      resourceType: "bookings",
      resourceId: newBookingId,
      before: { oldBookingId: args.bookingId },
      after: { newStartAt: args.newStartAt },
      createdAt: Date.now(),
    });

    const [org, customer, staff, newBooking] = await Promise.all([
      ctx.db.get(args.orgId),
      ctx.db.get(oldBooking.customerId),
      ctx.db.get(oldBooking.staffId),
      ctx.db.get(newBookingId),
    ]);
    if (newBooking) {
      await scheduleBookingCompletion(ctx, newBooking, settings.timezone);
    }
    if (org && customer && staff && newBooking) {
      const combinedService: Doc<"services"> = {
        ...service,
        name: services.map((item) => item.name).join(" + "),
        durationMins,
        priceMinorUnits: newBooking.priceMinorUnits,
      };
      await queueBookingRescheduledNotifications(ctx, {
        ...(claim
          ? { clientAccountUrl: clientClaimUrl(newBookingId, claim.token) }
          : {}),
        org,
        settings,
        booking: newBooking,
        customer,
        service: combinedService,
        staff,
        previousStartAt: oldBooking.startAt,
        previousEndAt: oldBooking.endAt,
      });

      if (newBooking.status === "confirmed") {
        await queueBookingNotifications(ctx, {
          org,
          settings,
          booking: newBooking,
          customer,
          service: combinedService,
          staff,
          sendCustomerConfirmation: false,
          notifyTeamOfNewBooking: false,
          notifyAssignedStaffOfNewBooking: false,
          scheduleReminders: true,
        });
      }

      const newAppointmentLabel = formatBookingNotificationDateTime(
        args.newStartAt,
      );
      await ctx.runMutation(internal.dashboardNotifications.create, {
        orgId: args.orgId,
        type: "new_booking",
        title: "Booking Rescheduled",
        body: `${customer.name}'s ${combinedService.name} with ${staff.displayName} was rescheduled to ${newAppointmentLabel}`,
        bookingId: newBookingId,
        customerId: oldBooking.customerId,
        // The reschedule helper already queues the booking_changed push event.
        queuePush: false,
      });
    }

    const createdForRecovery = await ctx.db.get(newBookingId);
    if (createdForRecovery)
      await recordRecoveryBooking(ctx, createdForRecovery);
    await scheduleRecoveryRefresh(
      ctx,
      args.orgId,
      oldBooking.staffId,
      new Date(oldBooking.startAt).toISOString().slice(0, 10),
    );
    return newBookingId;
  },
});

export const getBooking = query({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);
    const b = await ctx.db.get(args.bookingId);
    if (!b || b.orgId !== args.orgId || b.isDeleted) return null;
    if (
      hasPersonalBookingAccess(auth.staffMember) &&
      b.staffId !== auth.staffMember._id
    )
      return null;
    return b;
  },
});

export const listBookingsByOrg = query({
  args: {
    orgId: v.id("orgs"),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);

    const personal = hasPersonalBookingAccess(auth.staffMember);
    const indexed = personal
      ? ctx.db.query("bookings").withIndex("by_org_staff_start", (q) => {
          const staffQuery = q
            .eq("orgId", auth.orgId)
            .eq("staffId", auth.staffMember._id);
          if (args.fromDate !== undefined && args.toDate !== undefined)
            return staffQuery
              .gte("startAt", args.fromDate)
              .lte("startAt", args.toDate);
          if (args.fromDate !== undefined)
            return staffQuery.gte("startAt", args.fromDate);
          if (args.toDate !== undefined)
            return staffQuery.lte("startAt", args.toDate);
          return staffQuery;
        })
      : ctx.db.query("bookings").withIndex("by_org_start", (q) => {
          const orgQuery = q.eq("orgId", auth.orgId);
          if (args.fromDate !== undefined && args.toDate !== undefined)
            return orgQuery
              .gte("startAt", args.fromDate)
              .lte("startAt", args.toDate);
          if (args.fromDate !== undefined)
            return orgQuery.gte("startAt", args.fromDate);
          if (args.toDate !== undefined)
            return orgQuery.lte("startAt", args.toDate);
          return orgQuery;
        });
    let bookings = (await indexed.collect()).filter(
      (booking) => !booking.isDeleted,
    );
    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }

    // Enrich with related entities
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const serviceIds = booking.serviceIds ?? [booking.serviceId];
        const [serviceResults, staffResult, customerResult] = await Promise.all(
          [
            Promise.all(serviceIds.map((serviceId) => ctx.db.get(serviceId))),
            ctx.db.get(booking.staffId),
            ctx.db.get(booking.customerId),
          ],
        );
        const services = serviceResults.filter(
          (service): service is Doc<"services"> =>
            Boolean(
              service && service.orgId === args.orgId && !service.isDeleted,
            ),
        );
        const staff =
          staffResult?.orgId === args.orgId && !staffResult.isDeleted
            ? staffResult
            : null;
        const customer =
          customerResult?.orgId === args.orgId && !customerResult.isDeleted
            ? customerResult
            : null;
        return {
          ...booking,
          service: services[0] ?? null,
          services,
          staff,
          customer:
            personal && customer
              ? {
                  _id: customer._id,
                  _creationTime: customer._creationTime,
                  orgId: customer.orgId,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  avatarUrl: customer.avatarUrl,
                  totalVisits: undefined,
                }
              : customer,
        };
      }),
    );

    return enrichedBookings;
  },
});

export const listBookingsByStaff = query({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId, args.staffId);
    return (
      await ctx.db
        .query("bookings")
        .withIndex("by_org_staff_start", (q) => {
          const indexed = q.eq("orgId", auth.orgId).eq("staffId", args.staffId);
          if (args.fromDate !== undefined && args.toDate !== undefined)
            return indexed
              .gte("startAt", args.fromDate)
              .lte("startAt", args.toDate);
          if (args.fromDate !== undefined)
            return indexed.gte("startAt", args.fromDate);
          if (args.toDate !== undefined)
            return indexed.lte("startAt", args.toDate);
          return indexed;
        })
        .collect()
    ).filter((booking) => !booking.isDeleted);
  },
});

export const listBookingsByCustomer = query({
  args: {
    orgId: v.id("orgs"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const auth = await requireBookingAccess(ctx, args.orgId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== auth.orgId || customer.isDeleted)
      return [];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org_customer_start", (q) =>
        q.eq("orgId", auth.orgId).eq("customerId", args.customerId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return bookings
      .filter(
        (booking) =>
          !hasPersonalBookingAccess(auth.staffMember) ||
          booking.staffId === auth.staffMember._id,
      )
      .sort((a, b) => b.startAt - a.startAt)
      .slice(0, 20);
  },
});

// Internal variant used by the AI action — no end-user auth, accepts ai_webchat source
export const createBookingForAI = internalMutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    serviceId: v.id("services"),
    customerId: v.id("customers"),
    startAt: v.number(),
    conversationId: v.id("ai_conversations"),
    channel: v.union(v.literal("instagram"), v.literal("webchat")),
  },
  handler: async (ctx, args) => {
    const source = args.channel === "instagram" ? "ai_instagram" : "ai_webchat";

    if (args.startAt <= Date.now()) {
      throw new ConvexError("Booking start time must be in the future.");
    }

    const orgSettings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!orgSettings) throw new ConvexError("Organization settings not found.");

    const staff = await ctx.db.get(args.staffId);
    if (
      !staff ||
      staff.orgId !== args.orgId ||
      staff.isDeleted ||
      !staff.isActive
    ) {
      throw new ConvexError("Staff member not available.");
    }

    const service = await ctx.db.get(args.serviceId);
    if (
      !service ||
      service.orgId !== args.orgId ||
      service.isDeleted ||
      !service.isActive
    ) {
      throw new ConvexError("Service not available.");
    }

    if (!service.staffIds.includes(args.staffId)) {
      throw new ConvexError("Staff member cannot perform this service.");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.orgId !== args.orgId || customer.isDeleted) {
      throw new ConvexError("Customer not found.");
    }

    const endAt = args.startAt + service.durationMins * 60 * 1000;

    const midnightMs = new Date(
      new Date(args.startAt).toISOString().split("T")[0] + "T00:00:00Z",
    ).getTime();
    const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff_start", (q) =>
        q
          .eq("staffId", args.staffId)
          .gte("startAt", midnightMs)
          .lt("startAt", nextMidnightMs),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .collect();

    const bufferMs = (orgSettings.bufferTimeMins || 0) * 60 * 1000;
    const conflict = existingBookings.find(
      (b) => b.startAt < endAt && b.endAt + bufferMs > args.startAt,
    );
    if (conflict)
      throw new ConvexError(
        "This slot is already booked or conflicts with buffer time.",
      );

    const status = "confirmed" as const;

    const bookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: args.staffId,
      serviceId: args.serviceId,
      customerId: args.customerId,
      startAt: args.startAt,
      endAt,
      priceMinorUnits: service.priceMinorUnits,
      currency: service.currency,
      surgePriceApplied: false,
      status,
      source,
      aiConversationId: args.conversationId,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.customerId, {
      totalVisits: (customer.totalVisits || 0) + 1,
      lastVisitAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "ai",
      actorId: "claude-haiku-4-5-20251001",
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      after: {
        staffId: args.staffId,
        customerId: args.customerId,
        startAt: args.startAt,
        status,
      },
      createdAt: Date.now(),
    });

    const createdForRecovery = await ctx.db.get(bookingId);
    if (createdForRecovery) {
      await scheduleBookingCompletion(
        ctx,
        createdForRecovery,
        orgSettings.timezone,
      );
      await recordRecoveryBooking(ctx, createdForRecovery);
    }
    return bookingId;
  },
});

// Internal query for AI: look up upcoming bookings by customer phone
export const getCustomerBookingsForAI = internalQuery({
  args: {
    orgId: v.id("orgs"),
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_org_phone", (q) =>
        q.eq("orgId", args.orgId).eq("phone", args.customerPhone),
      )
      .first();

    if (!customer) return [];

    const now = Date.now();
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.gte(q.field("startAt"), now),
        ),
      )
      .take(5);

    return await Promise.all(
      bookings.map(async (b) => {
        const service = await ctx.db.get(b.serviceId);
        const staff = await ctx.db.get(b.staffId);
        const d = new Date(b.startAt);
        return {
          date: d.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Skopje",
          }),
          time: d.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Europe/Skopje",
          }),
          service: service?.name ?? "Unknown service",
          staff: staff?.displayName ?? "Unknown staff",
          status: b.status,
        };
      }),
    );
  },
});
