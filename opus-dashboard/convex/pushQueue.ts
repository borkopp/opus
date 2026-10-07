import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { hasPersonalBookingAccess } from "./lib/staffAccess";
import { isActiveIndustry } from "./lib/productScope";
import {
  browserPushConfigured,
  mobilePushConfigured,
  readPushPreferences,
} from "./lib/staffPush";
import {
  inQuietHours,
  pushEventEnabled,
  type PushEvent,
} from "../../shared/push-notifications";
import { wallClockTimestampToInstant } from "./lib/bookingTime";
import { reviewStudioAccessAllowed } from "./lib/appReview";

export type PreparedPush =
  | { status: "ignored" | "cancelled" }
  | {
      status: "ready";
      kind: "expo" | "web";
      deviceVersion: number;
      token?: string;
      subscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      title: string;
      body: string;
      sound: boolean;
      notificationId: Id<"notifications">;
    };
const titles: Record<PushEvent, [string, string, string]> = {
  new_booking: ["New appointment", "Нов термин", "Termin i ri"],
  booking_changed: [
    "Appointment rescheduled",
    "Терминот е презакажан",
    "Termini u ricaktua",
  ],
  booking_cancelled: [
    "Appointment cancelled",
    "Терминот е откажан",
    "Termini u anulua",
  ],
  booking_reminder: [
    "Upcoming appointment",
    "Претстоен термин",
    "Termin i ardhshëm",
  ],
  no_show: [
    "Client did not arrive",
    "Клиентот не дојде",
    "Klienti nuk u paraqit",
  ],
  ai_handoff: [
    "Front desk needs attention",
    "Рецепцијата бара внимание",
    "Recepsioni kërkon vëmendje",
  ],
};

export const isPush = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) =>
    (await ctx.db.get(args.notificationId))?.channel === "push",
});

/** Transactional claim with fresh recipient, permission, preference and appointment checks. */
export const prepare = internalMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }): Promise<PreparedPush> => {
    const n = await ctx.db.get(notificationId);
    const now = Date.now();
    if (
      !n ||
      n.channel !== "push" ||
      n.status !== "pending" ||
      n.scheduledFor > now ||
      (n.processingStartedAt !== undefined &&
        n.processingStartedAt > now - 120000)
    )
      return { status: "ignored" };
    async function skip(reason: string): Promise<PreparedPush> {
      await ctx.db.patch(notificationId, {
        status: "cancelled",
        failureReason: reason,
        processingStartedAt: undefined,
      });
      return { status: "cancelled" };
    }
    if (!n.pushDeviceId || !n.pushUserId || !n.pushEvent)
      return skip("Incomplete push metadata.");
    const [device, user, org] = await Promise.all([
      ctx.db.get(n.pushDeviceId),
      ctx.db.get(n.pushUserId),
      ctx.db.get(n.orgId),
    ]);
    if (
      !device ||
      device.isDeleted ||
      device.orgId !== n.orgId ||
      device.userId !== n.pushUserId ||
      !user ||
      user.isDeleted ||
      !org ||
      org.isDeleted ||
      !isActiveIndustry(org.industry)
    )
      return skip("Recipient or studio is unavailable.");
    if (!reviewStudioAccessAllowed(user, org))
      return skip("App Review access is limited to its demo studio.");
    // A closed app can receive push, but an expired/revoked sign-in never can.
    const session = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "session",
      where: [{ field: "_id", value: device.authSessionId }],
    });
    if (
      !session ||
      session.userId !== user.authUserId ||
      session.expiresAt <= now
    ) {
      await ctx.db.patch(device._id, {
        isDeleted: true,
        deletedAt: now,
        expoToken: undefined,
        subscription: undefined,
        updatedAt: now,
      });
      return skip("The connected sign-in session ended.");
    }
    const member = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", n.orgId).eq("userId", user._id),
      )
      .first();
    if (!member || member.isDeleted || !member.isActive)
      return skip("Studio access was revoked.");
    const ownOnly = hasPersonalBookingAccess(member);
    const preferences = await readPushPreferences(
      ctx,
      n.orgId,
      user._id,
      ownOnly,
    );
    if (!pushEventEnabled(preferences, n.pushEvent))
      return skip("This alert type is disabled.");
    if (
      device.kind === "expo"
        ? !preferences.mobileEnabled ||
          !mobilePushConfigured() ||
          !device.expoToken
        : !preferences.browserEnabled ||
          !browserPushConfigured() ||
          !device.subscription
    )
      return skip("Push is disabled or unavailable.");
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", n.orgId))
      .first();
    const timezone = settings?.timezone ?? "Europe/Skopje";
    if (inQuietHours(preferences, now, timezone))
      return skip("Suppressed during personal quiet hours.");
    const booking = n.bookingId ? await ctx.db.get(n.bookingId) : null;
    if (n.bookingId) {
      if (!booking || booking.isDeleted || booking.orgId !== n.orgId)
        return skip("Appointment unavailable.");
      if (
        (ownOnly || preferences.scope === "mine") &&
        booking.staffId !== member._id
      )
        return skip("Appointment is outside current access.");
      if (
        n.pushEvent === "booking_cancelled"
          ? booking.status !== "cancelled"
          : n.pushEvent === "no_show"
            ? booking.status !== "no_show"
            : ["cancelled", "no_show", "completed"].includes(booking.status)
      )
        return skip("Appointment status changed.");
      if (booking.startAt !== n.pushBookingStartAt)
        return skip("Appointment was rescheduled.");
      if (
        n.pushEvent === "booking_reminder" &&
        (booking.status !== "confirmed" ||
          preferences.reminderMinutes !== n.pushReminderMinutes ||
          wallClockTimestampToInstant(booking.startAt, timezone) <= now ||
          now - n.scheduledFor > 10 * 60000)
      )
        return skip("Reminder is obsolete.");
    }
    if (n.pushEvent === "ai_handoff") {
      if (ownOnly || org.plan !== "paid" || !n.pushConversationId)
        return skip("Front-desk access is unavailable.");
      const conversation = await ctx.db.get(n.pushConversationId);
      if (
        !conversation ||
        conversation.orgId !== n.orgId ||
        conversation.status !== "handed_off"
      )
        return skip("Conversation no longer needs attention.");
    }
    if (n.pushEvent !== "booking_reminder" && now - n.scheduledFor > 3600000)
      return skip("Alert expired.");
    const language =
      device.locale === "mk" ? 1 : device.locale === "sq" ? 2 : 0;
    const title = `${titles[n.pushEvent][language]} · OPUS Studio`;
    let body = [
      "Open OPUS Studio to view the details.",
      "Отвори OPUS Studio за деталите.",
      "Hapni OPUS Studio për detajet.",
    ][language];
    if (preferences.showPreview && booking) {
      const [customer, service] = await Promise.all([
        ctx.db.get(booking.customerId),
        ctx.db.get(booking.serviceId),
      ]);
      const time = new Intl.DateTimeFormat(device.locale, {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(booking.startAt));
      body = [
        org.name,
        customer?.orgId === org._id ? customer.name : "",
        service?.orgId === org._id ? service.name : "",
        time,
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 450);
    }
    await ctx.db.patch(notificationId, {
      processingStartedAt: now,
      lastAttemptAt: now,
      attemptCount: (n.attemptCount ?? 0) + 1,
    });
    return {
      status: "ready",
      kind: device.kind,
      deviceVersion: device.updatedAt,
      token: device.expoToken,
      subscription: device.subscription,
      title,
      body,
      sound: preferences.sound,
      notificationId,
    };
  },
});

export const finish = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    result: v.union(v.literal("sent"), v.literal("retry"), v.literal("failed")),
    code: v.optional(v.string()),
    ticketId: v.optional(v.string()),
    invalidDevice: v.optional(v.boolean()),
    deviceVersion: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<"sent" | "failed" | "retrying" | "ignored"> => {
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.channel !== "push" || n.status !== "pending") return "ignored";
    if (args.invalidDevice && n.pushDeviceId) {
      const device = await ctx.db.get(n.pushDeviceId);
      if (
        device &&
        device.orgId === n.orgId &&
        device.userId === n.pushUserId &&
        device.updatedAt === args.deviceVersion
      )
        await ctx.db.patch(device._id, {
          isDeleted: true,
          deletedAt: Date.now(),
          expoToken: undefined,
          subscription: undefined,
          updatedAt: Date.now(),
        });
    }
    if (args.result === "retry" && (n.attemptCount ?? 0) < 3) {
      const delay = (n.attemptCount ?? 0) === 1 ? 60000 : 300000;
      await ctx.db.patch(n._id, {
        processingStartedAt: undefined,
        scheduledFor: Date.now() + delay,
        failureReason: args.code?.slice(0, 120),
      });
      await ctx.scheduler.runAfter(
        delay,
        internal.notifications.processIndividualNotification,
        { notificationId: n._id },
      );
      return "retrying";
    }
    const sent = args.result === "sent";
    const device = n.pushDeviceId ? await ctx.db.get(n.pushDeviceId) : null;
    await ctx.db.patch(n._id, {
      status: sent ? "sent" : "failed",
      sentAt: sent ? Date.now() : undefined,
      processingStartedAt: undefined,
      externalMessageId: args.ticketId,
      deliveryProvider: device?.kind === "web" ? "web_push" : "expo",
      pushReceiptStatus: sent
        ? args.ticketId
          ? "accepted"
          : "provider_accepted"
        : "failed",
      failureReason: sent
        ? undefined
        : (args.code?.slice(0, 120) ??
          "Push provider rejected the notification."),
    });
    await ctx.db.insert("audit_log", {
      orgId: n.orgId,
      actorType: "system",
      actorId: "push-worker",
      action: sent ? "push.provider_accepted" : "push.failed",
      resourceType: "notifications",
      resourceId: n._id,
      createdAt: Date.now(),
    });
    if (sent && args.ticketId)
      await ctx.scheduler.runAfter(
        15 * 60000,
        internal.pushDelivery.checkReceipt,
        {
          notificationId: n._id,
          deviceVersion: args.deviceVersion,
          attempt: 0,
        },
      );
    return sent ? "sent" : "failed";
  },
});

export const receiptTicket = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const n = await ctx.db.get(args.notificationId);
    return n?.channel === "push" &&
      n.status === "sent" &&
      n.pushReceiptStatus === "accepted"
      ? (n.externalMessageId ?? null)
      : null;
  },
});
export const recordReceipt = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    result: v.union(
      v.literal("provider_accepted"),
      v.literal("failed"),
      v.literal("unknown"),
    ),
    invalidDevice: v.boolean(),
    deviceVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const n = await ctx.db.get(args.notificationId);
    if (
      !n ||
      n.channel !== "push" ||
      n.status !== "sent" ||
      n.pushReceiptStatus !== "accepted"
    )
      return;
    await ctx.db.patch(n._id, {
      pushReceiptStatus: args.result,
      ...(args.result === "failed"
        ? {
            status: "failed",
            failureReason:
              "Expo could not hand the notification to the device push service.",
          }
        : {}),
    });
    if (args.invalidDevice && n.pushDeviceId) {
      const device = await ctx.db.get(n.pushDeviceId);
      if (
        device &&
        device.orgId === n.orgId &&
        device.userId === n.pushUserId &&
        device.updatedAt === args.deviceVersion
      )
        await ctx.db.patch(device._id, {
          isDeleted: true,
          deletedAt: Date.now(),
          expoToken: undefined,
          subscription: undefined,
          updatedAt: Date.now(),
        });
    }
  },
});
