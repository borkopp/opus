import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireAuth, requireRole } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";
import { computeSlotsForDate } from "./slots";

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
      v.literal("mobile"),
      v.literal("ai_whatsapp"),
      v.literal("ai_instagram"),
      v.literal("ai_voice"),
      v.literal("manual"),
    ),
    aiConversationId: v.optional(v.id("ai_conversations")),
  },
  handler: async (ctx, args) => {
    // 1. Basic validation
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

    // 4. Deposit / Status determination
    let status: "pending_payment" | "confirmed" = "confirmed";
    if (orgSettings.depositRequired || customer.requiresFullDeposit) {
      status = "pending_payment";
    }

    // 5. Insert Booking
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
      status,
      source: args.source,
      aiConversationId: args.aiConversationId,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 6. Update Customer stats
    await ctx.db.patch(args.customerId, {
      totalVisits: (customer.totalVisits || 0) + 1,
      lastVisitAt: Date.now(), // Visited/Booked timestamp
      updatedAt: Date.now(),
    });

    // 7. Audit Log
    const timestamp = Date.now();
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType:
        args.source === "manual"
          ? "staff"
          : args.source.startsWith("ai_")
            ? "system"
            : "user",
      actorId: args.source === "manual" ? "dashboard" : "public", // In a real system you'd pass caller ID here if manual
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      after: {
        staffId: args.staffId,
        customerId: args.customerId,
        startAt: args.startAt,
        priceMinorUnits,
        status,
      },
      createdAt: timestamp,
    });

    // 8. Notifications
    const contact = getPrimaryContact(customer);
    if (contact) {
      await ctx.runMutation(internal.notifications.scheduleNotification, {
        orgId: args.orgId,
        customerId: args.customerId,
        bookingId: bookingId,
        channel: contact.channel,
        type:
          status === "confirmed" ? "booking_confirmation" : "deposit_request",
        recipientAddress: contact.address,
        templateData: {
          customerName: customer.name,
          serviceName: service.name,
          staffName: staff.displayName,
          startAt: args.startAt,
        },
      });
    }

    // 9. Dashboard notification — shows in navbar bell for the business owner
    const startDate = new Date(args.startAt);
    const timeLabel = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
    await ctx.runMutation(internal.dashboardNotifications.create, {
      orgId: args.orgId,
      type: "new_booking",
      title: "New Booking",
      body: `${customer.name} booked ${service.name} with ${staff.displayName} at ${timeLabel}`,
      bookingId,
      customerId: args.customerId,
    });

    return bookingId;
  },
});

export const confirmBooking = internalMutation({
  args: {
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
    paymentIntentId: v.id("payment_intents"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.orgId !== args.orgId || booking.isDeleted) {
      throw new ConvexError("Booking not found.");
    }

    if (booking.status !== "pending_payment") {
      throw new ConvexError(
        `Cannot confirm booking with status: ${booking.status}`,
      );
    }

    const paymentIntent = await ctx.db.get(args.paymentIntentId);
    if (
      !paymentIntent ||
      paymentIntent.bookingId !== args.bookingId ||
      paymentIntent.status !== "succeeded"
    ) {
      throw new ConvexError(
        "Valid succeeded payment intent not found for this booking.",
      );
    }

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      paymentIntentId: args.paymentIntentId,
      depositPaidAt: paymentIntent.updatedAt,
      depositMinorUnits: paymentIntent.amountMinorUnits,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system", // Usually webhook triggers this
      actorId: "braintree_webhook",
      action: "booking.confirmed",
      resourceType: "bookings",
      resourceId: args.bookingId,
      before: { status: "pending_payment" },
      after: { status: "confirmed", paymentIntentId: args.paymentIntentId },
      createdAt: Date.now(),
    });

    const customer = await ctx.db.get(booking.customerId);
    const service = await ctx.db.get(booking.serviceId);
    const staff = await ctx.db.get(booking.staffId);
    if (customer && service && staff) {
      const contact = getPrimaryContact(customer);
      if (contact) {
        await ctx.runMutation(internal.notifications.scheduleNotification, {
          orgId: args.orgId,
          customerId: customer._id,
          bookingId: booking._id,
          channel: contact.channel,
          type: "booking_confirmation",
          recipientAddress: contact.address,
          templateData: {
            customerName: customer.name,
            serviceName: service.name,
            staffName: staff.displayName,
            startAt: booking.startAt,
          },
        });
      }
    }

    return true;
  },
});

export const checkInBooking = mutation({
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

    if (booking.status !== "confirmed") {
      throw new ConvexError(
        `Cannot check in booking with status: ${booking.status}`,
      );
    }

    await ctx.db.patch(args.bookingId, {
      status: "checked_in",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "booking.checked_in",
      resourceType: "bookings",
      resourceId: args.bookingId,
      before: { status: "confirmed" },
      after: { status: "checked_in" },
      createdAt: Date.now(),
    });

    return true;
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
    const { staffMember } = await requireRole(ctx, args.orgId, "staff");
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
        .withIndex("by_org", q => q.eq("orgId", args.orgId))
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
      const cancelDate = new Date(booking.startAt);
      const cancelDateLabel = `${cancelDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`;
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
          year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(cancelDate);
      
      let year, month, day;
      for (const p of parts) {
          if (p.type === 'year') year = p.value;
          if (p.type === 'month') month = p.value;
          if (p.type === 'day') day = p.value;
      }
      
      const serviceDate = `${year}-${month}-${day}`;

      if (orgSettings?.gapOptimizerEnabled) {
        await ctx.scheduler.runAfter(0, api.ai.gapOptimizer.scanDayForOrg, {
          orgId: args.orgId,
          serviceDate,
          staffIds: [booking.staffId],
          detectedBy: "cancellation",
          triggeredByBookingId: booking._id,
        });
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
        requiresFullDeposit: riskScore >= 0.7,
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
      const nsDate = new Date(booking.startAt);
      const nsTime = `${String(nsDate.getHours()).padStart(2, "0")}:${String(nsDate.getMinutes()).padStart(2, "0")}`;
      await ctx.runMutation(internal.dashboardNotifications.create, {
        orgId: args.orgId,
        type: "no_show",
        title: "No-Show",
        body: `${customer.name} didn't show up for ${service.name} at ${nsTime}`,
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

    const service = await ctx.db.get(oldBooking.serviceId);
    if (!service) throw new ConvexError("Service not found");

    const endAt = args.newStartAt + service.durationMins * 60 * 1000;

    const date = new Date(args.newStartAt).toISOString().slice(0, 10);
    const availableSlots = await computeSlotsForDate(
      ctx,
      args.orgId,
      oldBooking.staffId,
      oldBooking.serviceId,
      date,
    );
    if (!availableSlots.some((slot) => slot.startAt === args.newStartAt)) {
      throw new ConvexError(
        "The new time is outside working hours or no longer available.",
      );
    }

    const newBookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: oldBooking.staffId,
      serviceId: oldBooking.serviceId,
      customerId: oldBooking.customerId,
      startAt: args.newStartAt,
      endAt,
      priceMinorUnits: oldBooking.priceMinorUnits, // carry over snapshotted price
      currency: oldBooking.currency,
      surgePriceApplied: oldBooking.surgePriceApplied,
      surgeMultiplierPct: oldBooking.surgeMultiplierPct,
      status: oldBooking.status, // maintain deposit status
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
        const service = await ctx.db.get(booking.serviceId);
        const staff = await ctx.db.get(booking.staffId);
        const customer = await ctx.db.get(booking.customerId);
        return {
          ...booking,
          service,
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
      .withIndex("by_org", q => q.eq("orgId", args.orgId))
      .first();
    if (!orgSettings) throw new ConvexError("Organization settings not found.");

    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.orgId !== args.orgId || staff.isDeleted || !staff.isActive) {
      throw new ConvexError("Staff member not available.");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.orgId !== args.orgId || service.isDeleted || !service.isActive) {
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
      new Date(args.startAt).toISOString().split("T")[0] + "T00:00:00Z"
    ).getTime();
    const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_staff_start", q =>
        q.eq("staffId", args.staffId).gte("startAt", midnightMs).lt("startAt", nextMidnightMs)
      )
      .filter(q => q.and(q.eq(q.field("isDeleted"), false), q.neq(q.field("status"), "cancelled")))
      .collect();

    const bufferMs = (orgSettings.bufferTimeMins || 0) * 60 * 1000;
    const conflict = existingBookings.find(b => b.startAt < endAt && (b.endAt + bufferMs) > args.startAt);
    if (conflict) throw new ConvexError("This slot is already booked or conflicts with buffer time.");

    const status: "pending_payment" | "confirmed" =
      orgSettings.depositRequired || customer.requiresFullDeposit ? "pending_payment" : "confirmed";

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
      after: { staffId: args.staffId, customerId: args.customerId, startAt: args.startAt, status },
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
      .withIndex("by_org_phone", q => q.eq("orgId", args.orgId).eq("phone", args.customerPhone))
      .first();

    if (!customer) return [];

    const now = Date.now();
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", q => q.eq("customerId", customer._id))
      .filter(q =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
          q.gte(q.field("startAt"), now),
        )
      )
      .take(5);

    return await Promise.all(
      bookings.map(async b => {
        const service = await ctx.db.get(b.serviceId);
        const staff = await ctx.db.get(b.staffId);
        const d = new Date(b.startAt);
        return {
          date: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Skopje" }),
          time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Skopje" }),
          service: service?.name ?? "Unknown service",
          staff: staff?.displayName ?? "Unknown staff",
          status: b.status,
        };
      })
    );
  },
});
