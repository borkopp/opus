import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { hasPersonalBookingAccess } from "./staffAccess";
import { isActiveIndustry } from "./productScope";
import { wallClockNow, wallClockTimestampToInstant } from "./bookingTime";
import { reviewStudioAccessAllowed } from "./appReview";
import {
  defaultPushPreferences,
  pushEventEnabled,
  type PushEvent,
  type PushPreferences,
} from "../../../shared/push-notifications";

function localUnsignedExpoTest() {
  if (process.env.EXPO_PUSH_ALLOW_LOCAL_WITHOUT_ACCESS_TOKEN !== "true")
    return false;
  try {
    // Convex provides this system URL. Cloud deployments cannot qualify by
    // copying the test flag from a local environment.
    const url = new URL(process.env.CONVEX_CLOUD_URL ?? "");
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function mobilePushConfigured() {
  return (
    process.env.EXPO_PUSH_ENABLED === "true" &&
    (!!process.env.EXPO_PUSH_ACCESS_TOKEN?.trim() || localUnsignedExpoTest())
  );
}
export function browserPushConfigured() {
  return (
    process.env.WEB_PUSH_ENABLED === "true" &&
    /^[A-Za-z0-9_-]{87}$/.test(process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "") &&
    /^[A-Za-z0-9_-]{43}$/.test(process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "")
  );
}
export function validWebPushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  try {
    const url = new URL(subscription.endpoint);
    const host = url.hostname;
    const provider =
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".notify.windows.com");
    return (
      subscription.endpoint.length <= 2048 &&
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      provider &&
      /^[A-Za-z0-9_-]{87}={0,2}$/.test(subscription.keys.p256dh) &&
      /^[A-Za-z0-9_-]{22}={0,2}$/.test(subscription.keys.auth)
    );
  } catch {
    return false;
  }
}
export async function readPushPreferences(
  ctx: Pick<QueryCtx, "db">,
  orgId: Id<"orgs">,
  userId: Id<"users">,
  ownOnly: boolean,
): Promise<PushPreferences> {
  const stored = await ctx.db
    .query("staff_notification_preferences")
    .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", userId))
    .unique();
  const preferences =
    stored && !stored.isDeleted
      ? stored.preferences
      : defaultPushPreferences(ownOnly);
  return ownOnly
    ? { ...preferences, scope: "mine", aiHandoffs: false }
    : preferences;
}
type PushContext = Pick<MutationCtx, "db" | "runMutation">;
type EventArgs = {
  orgId: Id<"orgs">;
  event: PushEvent;
  bookingId?: Id<"bookings">;
  conversationId?: Id<"ai_conversations">;
  reminderOnlyFor?: Id<"users">;
};

/** Enqueue only current authorized linked staff; customer accounts never receive studio push. */
export async function queueStaffPushEvent(ctx: PushContext, args: EventArgs) {
  if (!mobilePushConfigured() && !browserPushConfigured()) return;
  const org = await ctx.db.get(args.orgId);
  if (!org || org.isDeleted || !isActiveIndustry(org.industry)) return;
  const booking = args.bookingId ? await ctx.db.get(args.bookingId) : null;
  if (
    args.bookingId &&
    (!booking || booking.orgId !== org._id || booking.isDeleted)
  )
    return;
  const conversation = args.conversationId
    ? await ctx.db.get(args.conversationId)
    : null;
  if (
    args.event === "ai_handoff" &&
    (!conversation || conversation.orgId !== org._id || org.plan !== "paid")
  )
    return;
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .first();
  if (!settings) return;
  const members = await ctx.db
    .query("staff_members")
    .withIndex("by_org_active", (q) =>
      q.eq("orgId", org._id).eq("isActive", true).eq("isDeleted", false),
    )
    .collect();
  for (const member of members) {
    if (
      !member.userId ||
      (args.reminderOnlyFor && member.userId !== args.reminderOnlyFor)
    )
      continue;
    const user = await ctx.db.get(member.userId);
    if (!user || user.isDeleted || !reviewStudioAccessAllowed(user, org))
      continue;
    const ownOnly = hasPersonalBookingAccess(member);
    const preferences = await readPushPreferences(
      ctx,
      org._id,
      user._id,
      ownOnly,
    );
    if (!pushEventEnabled(preferences, args.event)) continue;
    if (args.event === "ai_handoff" && ownOnly) continue;
    if (
      booking &&
      (ownOnly || preferences.scope === "mine") &&
      booking.staffId !== member._id
    )
      continue;
    if (args.event === "booking_reminder" && booking?.status !== "confirmed")
      continue;
    const devices = await ctx.db
      .query("staff_push_devices")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", org._id).eq("userId", user._id),
      )
      .collect();
    const scheduledFor =
      args.event === "booking_reminder" && booking
        ? wallClockTimestampToInstant(booking.startAt, settings.timezone) -
          preferences.reminderMinutes * 60000
        : Date.now();
    if (args.event === "booking_reminder" && scheduledFor <= Date.now())
      continue;
    for (const device of devices) {
      if (
        device.isDeleted ||
        (device.kind === "expo"
          ? !preferences.mobileEnabled || !mobilePushConfigured()
          : !preferences.browserEnabled || !browserPushConfigured())
      )
        continue;
      const revision = booking
        ? `${booking.startAt}:${booking.staffId}:${booking.status}`
        : conversation
          ? `${conversation.handedOffAt}`
          : "event";
      await ctx.runMutation(internal.notifications.scheduleNotification, {
        orgId: org._id,
        bookingId: booking?._id,
        channel: "push",
        type:
          args.event === "booking_reminder"
            ? "staff_booking_reminder"
            : args.event === "booking_cancelled"
              ? "booking_cancelled"
              : args.event === "booking_changed"
                ? "booking_rescheduled"
                : args.event === "no_show"
                  ? "no_show_warning"
                  : "staff_new_booking",
        recipientAddress: device._id,
        templateData: {},
        scheduledFor,
        pushUserId: user._id,
        pushDeviceId: device._id,
        pushEvent: args.event,
        pushConversationId: conversation?._id,
        pushBookingStartAt: booking?.startAt,
        pushReminderMinutes:
          args.event === "booking_reminder"
            ? preferences.reminderMinutes
            : undefined,
        dedupeKey: `push:${args.event}:${booking?._id ?? conversation?._id}:${revision}:${device._id}:${user._id}:${args.event === "booking_reminder" ? preferences.reminderMinutes : "now"}`,
      });
    }
  }
}

/** Device/pref changes immediately reconcile this person's next 48 hours, including existing bookings. */
export async function reconcilePersonalPushReminders(
  ctx: PushContext,
  orgId: Id<"orgs">,
  userId: Id<"users">,
) {
  if (!mobilePushConfigured() && !browserPushConfigured()) return;
  const settings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  if (!settings) return;
  const now = wallClockNow(settings.timezone);
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_org_start", (q) =>
      q
        .eq("orgId", orgId)
        .gte("startAt", now)
        .lt("startAt", now + 2 * 86400000),
    )
    .take(250);
  for (const booking of bookings)
    if (!booking.isDeleted && booking.status === "confirmed")
      await queueStaffPushEvent(ctx, {
        orgId,
        bookingId: booking._id,
        event: "booking_reminder",
        reminderOnlyFor: userId,
      });
}
