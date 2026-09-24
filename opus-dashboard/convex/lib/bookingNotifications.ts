import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  normalizeReminderHours,
  queueBookingEmailNotifications,
  queueBookingRescheduledEmail,
} from "./bookingEmailNotifications";
import { wallClockTimestampToInstant } from "./bookingTime";
import {
  normalizeSmsPhone,
  smsProviderConfigured,
  type BookingSmsType,
} from "./sms";

type BookingNotificationArgs = {
  org: Doc<"orgs">;
  settings: Doc<"org_settings">;
  booking: Doc<"bookings">;
  customer: Doc<"customers">;
  service: Doc<"services">;
  staff: Doc<"staff_members">;
};
type NotificationContext = Pick<MutationCtx, "db" | "runMutation">;

export async function queueBookingSms(
  ctx: NotificationContext,
  args: BookingNotificationArgs,
  type: BookingSmsType,
  hoursBefore?: number,
) {
  if (
    args.org.plan !== "paid" ||
    !args.settings.smsEnabled ||
    !smsProviderConfigured()
  )
    return;
  const phone = normalizeSmsPhone(args.customer.phone);
  if (!phone) return;
  const scheduledFor =
    hoursBefore === undefined
      ? Date.now()
      : wallClockTimestampToInstant(
          args.booking.startAt,
          args.settings.timezone,
        ) -
        hoursBefore * 3_600_000;
  if (hoursBefore !== undefined && scheduledFor <= Date.now()) return;
  await ctx.runMutation(internal.notifications.scheduleNotification, {
    orgId: args.org._id,
    customerId: args.customer._id,
    bookingId: args.booking._id,
    channel: "sms",
    type,
    recipientAddress: phone,
    templateData: {
      studioName: args.org.name,
      serviceName: args.service.name,
      startAt: args.booking.startAt,
      endAt: args.booking.endAt,
      locale: args.settings.locale,
      timezone: args.settings.timezone,
      ...(hoursBefore === undefined ? {} : { hoursBefore }),
    },
    scheduledFor,
    dedupeKey: `sms:${type}:${args.booking._id}:${args.booking.startAt}:${args.settings.timezone}:${hoursBefore ?? "now"}:${phone}`,
  });
}

export async function queueBookingNotifications(
  ctx: NotificationContext,
  args: BookingNotificationArgs & {
    sendCustomerConfirmation?: boolean;
    notifyTeamOfNewBooking?: boolean;
    notifyAssignedStaffOfNewBooking?: boolean;
    scheduleReminders?: boolean;
  },
) {
  await queueBookingEmailNotifications(ctx, args);
  await queueBookingSmsNotifications(ctx, args);
}

export async function queueBookingSmsNotifications(
  ctx: NotificationContext,
  args: BookingNotificationArgs & {
    sendCustomerConfirmation?: boolean;
    scheduleReminders?: boolean;
  },
) {
  if (args.sendCustomerConfirmation ?? true)
    await queueBookingSms(ctx, args, "booking_confirmation");
  if (args.scheduleReminders ?? true) {
    for (const hours of normalizeReminderHours(
      args.settings.smsReminderHoursBefore ?? [24],
    )) {
      await queueBookingSms(ctx, args, "booking_reminder", hours);
    }
  }
}

export async function queueBookingRescheduledNotifications(
  ctx: NotificationContext,
  args: BookingNotificationArgs & {
    previousStartAt: number;
    previousEndAt: number;
  },
) {
  await queueBookingRescheduledEmail(ctx, args);
  await queueBookingSms(ctx, args, "booking_rescheduled");
}
