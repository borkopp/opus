import { v, ConvexError } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeProductPlan, requireAuth, requireRole } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";
import { computeFreeIntervalsForStaffDate } from "./slots";
import {
  queueBookingEmailNotifications,
  queueBookingRescheduledEmail,
} from "./lib/bookingEmailNotifications";
import {
  formatBookingNotificationDateTime,
  wallClockNow,
} from "./lib/bookingTime";
import { rangeFitsFreeInterval } from "./lib/quickBooking";

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
    await requireRole(ctx, args.orgId, "staff");
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
    await queueBookingEmailNotifications(ctx, {
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
    const { staffMember: actor } = await requireRole(ctx, args.orgId, "staff");

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
    const matchingRule = settings.surgeRules?.find(
      (rule) =>
        rule.dayOfWeek === startDate.getUTCDay() &&
        timeStr >= rule.startTime &&
        timeStr < rule.endTime,
    );
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
    const combinedService: Doc<"services"> = {
      ...primaryService,
      name: services.map((service) => service.name).join(" + "),
      durationMins,
      priceMinorUnits,
    };
    await queueBookingEmailNotifications(ctx, {
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

    return bookingId;
  },
});

export const completeBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "staff");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    if (booking.status !== "checked_in" && booking.status !== "confirmed") {
      // Allow jump from confirmed -> complete
      throw new ConvexError(
        `Cannot complete booking with status: ${booking.status}`,
      );
    }

    // Update booking
    await ctx.db.patch(args.bookingId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    // Update customer total spend
    const customer = await ctx.db.get(booking.customerId);
    if (customer) {
      await ctx.db.patch(booking.customerId, {
        totalSpendMinorUnits:
          (customer.totalSpendMinorUnits || 0) + booking.priceMinorUnits,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "booking.completed",
      resourceType: "bookings",
      resourceId: args.bookingId,
      before: { status: booking.status },
      after: { status: "completed" },
      createdAt: Date.now(),
    });

    if (customer) {
      const service = await ctx.db.get(booking.serviceId);
      const staff = await ctx.db.get(booking.staffId);
      const contact = getPrimaryContact(customer);
      if (service && staff && contact) {
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
    const { staffMember, org } = await requireRole(ctx, args.orgId, "staff");
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    if (["cancelled", "completed", "no_show"].includes(booking.status)) {
      throw new ConvexError(
        `Cannot cancel booking already in terminal status: ${booking.status}`,
      );
    }

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancellationReason: args.reason,
      cancelledBy: staffMember._id,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "booking.cancelled",
      resourceType: "bookings",
      resourceId: args.bookingId,
      before: { status: booking.status },
      after: { status: "cancelled", reason: args.reason },
      createdAt: Date.now(),
    });

    const customer = await ctx.db.get(booking.customerId);
    const service = await ctx.db.get(booking.serviceId);
    const staff = await ctx.db.get(booking.staffId);
    if (customer && service && staff) {
      const orgSettings = await ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .first();
      const contact = getPrimaryContact(customer);
      if (contact) {
        await ctx.runMutation(internal.notifications.scheduleNotification, {
          orgId: args.orgId,
          customerId: customer._id,
          bookingId: booking._id,
          channel: contact.channel,
          type: "booking_cancelled",
          recipientAddress: contact.address,
          templateData: {
            customerName: customer.name,
            serviceName: service.name,
            staffName: staff.displayName,
            startAt: booking.startAt,
            cancellationPolicy: `${orgSettings?.cancellationWindowHours ?? 24} hours`,
          },
        });
      }

      // Dashboard notification
      const cancelDateLabel = formatBookingNotificationDateTime(booking.startAt);
      await ctx.runMutation(internal.dashboardNotifications.create, {
        orgId: args.orgId,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        body: `The ${service.name} booking for ${customer.name} on ${cancelDateLabel} was cancelled`,
        bookingId: booking._id,
        customerId: customer._id,
      });

      const timeZone = orgSettings?.timezone || "Europe/Belgrade";
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date(booking.startAt));

      let year, month, day;
      for (const p of parts) {
        if (p.type === "year") year = p.value;
        if (p.type === "month") month = p.value;
        if (p.type === "day") day = p.value;
      }

      const serviceDate = `${year}-${month}-${day}`;

      if (
        orgSettings?.gapOptimizerEnabled &&
        normalizeProductPlan(org.plan) === "paid"
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.ai.gapOptimizer.scanDayAfterCancellation,
          {
            orgId: args.orgId,
            serviceDate,
            staffIds: [booking.staffId],
            detectedBy: "cancellation",
            triggeredByBookingId: booking._id,
          },
        );
      }
    }

    return true;
  },
});

export const markNoShow = mutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "staff");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    if (!["confirmed", "checked_in"].includes(booking.status)) {
      throw new ConvexError(
        `Cannot mark no_show from status: ${booking.status}`,
      );
    }

    await ctx.db.patch(args.bookingId, {
      status: "no_show",
      updatedAt: Date.now(),
    });

    const customer = await ctx.db.get(booking.customerId);
    if (customer) {
      // Recalculate basic risk score (e.g. no_show / total bindings).
      const newNoShowCount = customer.noShowCount + 1;
      const newTotalVisits = Math.max(customer.totalVisits || 1, 1);
      const riskScore = newNoShowCount / newTotalVisits;

      await ctx.db.patch(booking.customerId, {
        noShowCount: newNoShowCount,
        noShowRiskScore: riskScore,
        updatedAt: Date.now(),
      });
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
    if (staff && customer && service) {
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
    const { staffMember } = await requireRole(ctx, args.orgId, "staff");
    // Find existing
    const oldBooking = await ctx.db.get(args.bookingId);
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
    if (org && customer && staff && newBooking) {
      const combinedService: Doc<"services"> = {
        ...service,
        name: services.map((item) => item.name).join(" + "),
        durationMins,
        priceMinorUnits: newBooking.priceMinorUnits,
      };
      await queueBookingRescheduledEmail(ctx, {
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
        await queueBookingEmailNotifications(ctx, {
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

      const newAppointmentLabel = formatBookingNotificationDateTime(args.newStartAt);
      await ctx.runMutation(internal.dashboardNotifications.create, {
        orgId: args.orgId,
        type: "new_booking",
        title: "Booking Rescheduled",
        body: `${customer.name}'s ${combinedService.name} with ${staff.displayName} was rescheduled to ${newAppointmentLabel}`,
        bookingId: newBookingId,
        customerId: oldBooking.customerId,
      });
    }

    return newBookingId;
  },
});

export const getBooking = query({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    const b = await ctx.db.get(args.bookingId);
    if (!b || b.orgId !== args.orgId || b.isDeleted) return null;
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
    await requireAuth(ctx, args.orgId);

    // Using by_org_start
    const q = ctx.db.query("bookings");

    let bookings;
    if (args.fromDate && args.toDate) {
      bookings = await q
        .withIndex("by_org_start", (q) =>
          q
            .eq("orgId", args.orgId)
            .gte("startAt", args.fromDate!)
            .lte("startAt", args.toDate!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else if (args.fromDate) {
      bookings = await q
        .withIndex("by_org_start", (q) =>
          q.eq("orgId", args.orgId).gte("startAt", args.fromDate!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else if (args.toDate) {
      bookings = await q
        .withIndex("by_org_start", (q) =>
          q.eq("orgId", args.orgId).lte("startAt", args.toDate!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else {
      bookings = await q
        .withIndex("by_org_start", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    }
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
          customer,
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
    await requireAuth(ctx, args.orgId);

    const q = ctx.db.query("bookings");
    let bookings;
    if (args.fromDate && args.toDate) {
      bookings = await q
        .withIndex("by_staff_start", (q) =>
          q
            .eq("staffId", args.staffId)
            .gte("startAt", args.fromDate!)
            .lte("startAt", args.toDate!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else if (args.fromDate) {
      bookings = await q
        .withIndex("by_staff_start", (q) =>
          q.eq("staffId", args.staffId).gte("startAt", args.fromDate!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else if (args.toDate) {
      bookings = await q
        .withIndex("by_staff_start", (q) =>
          q.eq("staffId", args.staffId).lte("startAt", args.toDate!),
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    } else {
      bookings = await q
        .withIndex("by_staff_start", (q) => q.eq("staffId", args.staffId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
    }
    return bookings;
  },
});

export const listBookingsByCustomer = query({
  args: {
    orgId: v.id("orgs"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return bookings.sort((a, b) => b.startAt - a.startAt).slice(0, 20);
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
