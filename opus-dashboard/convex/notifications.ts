import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Queue Entry (Transaction-safe)
// Called synchronously within main mutations (like booking creation).
// ─────────────────────────────────────────────────────────────────────────────
export const scheduleNotification = internalMutation({
  args: {
    orgId: v.id("orgs"),
    customerId: v.optional(v.id("customers")),
    bookingId: v.optional(v.id("bookings")),
    channel: v.union(
      v.literal("sms"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("push"),
    ),
    type: v.union(
      v.literal("booking_confirmation"),
      v.literal("booking_reminder"),
      v.literal("booking_cancelled"),
      v.literal("deposit_request"),
      v.literal("receipt"),
      v.literal("review_request"),
      v.literal("no_show_warning"),
      v.literal("staff_invite"),
    ),
    recipientAddress: v.string(),
    templateData: v.any(),
    scheduledFor: v.optional(v.number()), // Defaults to Date.now() if immediate
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      orgId: args.orgId,
      customerId: args.customerId,
      bookingId: args.bookingId,
      channel: args.channel,
      type: args.type,
      recipientAddress: args.recipientAddress,
      templateData: args.templateData,
      status: "pending",
      scheduledFor: args.scheduledFor ?? Date.now(),
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Queue Processor (Cron Job)
// Reads the index, finds pending notifications, limits to 50, and triggers actions.
// ─────────────────────────────────────────────────────────────────────────────
export const processNotifications = internalAction({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    // 1. Find up to 50 pending notifications scheduled for now or earlier
    const pendingNotifications = await ctx.runQuery(
      internal.notifications.getPendingNotificationsToProcess,
    );

    if (pendingNotifications.length === 0) return null;

    // 2. Fire individual actions for each notification concurrently
    // We don't await them directly here to avoid the batch job timing out.
    // Convex background actions will queue safely.
    await Promise.allSettled(
      pendingNotifications.map((notification) =>
        ctx.runAction(internal.notifications.processIndividualNotification, {
          notificationId: notification._id,
        }),
      ),
    );

    return `Spawned processing for ${pendingNotifications.length} notifications`;
  },
});

// Helper Query for the processor
export const getPendingNotificationsToProcess = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"notifications">[]> => {
    const now = Date.now();
    return await ctx.db
      .query("notifications")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "pending").lte("scheduledFor", now),
      )
      .take(50);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Individual Notification Handler (Action with Side Effects)
// Can safely use fetch() and fail without rolling back the database state.
// ─────────────────────────────────────────────────────────────────────────────
export const processIndividualNotification = internalAction({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    // Requires a query to fetch the full notification details first inside the action.
    const notification = await ctx.runQuery(
      internal.notifications.getNotificationById,
      {
        notificationId: args.notificationId,
      },
    );

    if (!notification || notification.status !== "pending") return null;

    let success = false;
    let errorReason: string | undefined;

    try {
      if (notification.channel === "email") {
        throw new Error("Email delivery is not configured.");
      } else if (
        notification.channel === "sms" ||
        notification.channel === "whatsapp"
      ) {
        throw new Error("SMS and WhatsApp delivery are not configured.");
      } else {
        throw new Error(`Unsupported channel: ${notification.channel}`);
      }
    } catch (error: unknown) {
      success = false;
      errorReason = error instanceof Error ? error.message : "Unknown provider error";
    }

    // Write results back to the database
    await ctx.runMutation(internal.notifications.updateNotificationStatus, {
      notificationId: args.notificationId,
      orgId: notification.orgId,
      status: success ? "sent" : "failed",
      sentAt: success ? Date.now() : undefined,
      failureReason: errorReason,
    });
  },
});

// Helper Query for Action
export const getNotificationById = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args): Promise<Doc<"notifications"> | null> => {
    return await ctx.db.get(args.notificationId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Status Updater & Audit Logger
// ─────────────────────────────────────────────────────────────────────────────
export const updateNotificationStatus = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    orgId: v.id("orgs"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    sentAt: v.optional(v.number()),
    externalMessageId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.notificationId);
    if (!existing) return;

    const updates: Partial<Doc<"notifications">> = { status: args.status };
    if (args.sentAt !== undefined) updates.sentAt = args.sentAt;
    if (args.externalMessageId !== undefined)
      updates.externalMessageId = args.externalMessageId;
    if (args.failureReason !== undefined)
      updates.failureReason = args.failureReason;

    await ctx.db.patch(args.notificationId, updates);
    const updated = await ctx.db.get(args.notificationId);

    // Write audit log
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action:
        args.status === "sent" ? "notification.sent" : "notification.failed",
      resourceType: "notifications",
      resourceId: args.notificationId,
      before: existing,
      after: updated,
      createdAt: Date.now(),
    });
  },
});

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

export const queueDailyReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Fetch all active orgs
    const orgs = await ctx.db
      .query("orgs")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const now = Date.now();
    for (const org of orgs) {
      const orgSettings = await ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first();
      if (
        !orgSettings ||
        !orgSettings.reminderHoursBefore ||
        orgSettings.reminderHoursBefore.length === 0
      )
        continue;

      // We check bookings over the max reminder window, plus some safety buffer (e.g. 48 hrs total max lookup)
      const maxHours = Math.max(...orgSettings.reminderHoursBefore);
      const maxMs = now + (maxHours + 24) * 60 * 60 * 1000;

      const upcomingBookings = await ctx.db
        .query("bookings")
        .withIndex("by_org_start", (q) =>
          q.eq("orgId", org._id).gte("startAt", now).lt("startAt", maxMs),
        )
        .filter((q) => q.eq(q.field("status"), "confirmed"))
        .collect();

      for (const booking of upcomingBookings) {
        const customer = await ctx.db.get(booking.customerId);
        const service = await ctx.db.get(booking.serviceId);
        const staff = await ctx.db.get(booking.staffId);
        if (!customer || !service || !staff) continue;

        const contact = getPrimaryContact(customer);
        if (!contact) continue;

        for (const hoursBefore of orgSettings.reminderHoursBefore) {
          const targetMs = booking.startAt - hoursBefore * 60 * 60 * 1000;

          const existingReminders = await ctx.db
            .query("notifications")
            .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
            .filter((q) => q.eq(q.field("type"), "booking_reminder"))
            .collect();

          const isAlreadyScheduled = existingReminders.some(
            (n) => Math.abs(n.scheduledFor - targetMs) < 60 * 1000,
          );

          if (!isAlreadyScheduled && targetMs > now) {
            await ctx.db.insert("notifications", {
              orgId: org._id,
              customerId: customer._id,
              bookingId: booking._id,
              channel: contact.channel,
              type: "booking_reminder",
              recipientAddress: contact.address,
              templateData: {
                customerName: customer.name,
                serviceName: service.name,
                staffName: staff.displayName,
                startAt: booking.startAt,
                cancellationPolicy: `${orgSettings.cancellationWindowHours} hours`,
              },
              status: "pending",
              scheduledFor: targetMs,
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  },
});
