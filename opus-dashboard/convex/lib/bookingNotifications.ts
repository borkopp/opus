import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  queueBookingEmailNotifications,
  queueBookingRescheduledEmail,
} from "./bookingEmailNotifications";
import { queueStaffPushEvent } from "./staffPush";

type BookingNotificationArgs = {
  clientAccountUrl?: string;
  org: Doc<"orgs">;
  settings: Doc<"org_settings">;
  booking: Doc<"bookings">;
  customer: Doc<"customers">;
  service: Doc<"services">;
  staff: Doc<"staff_members">;
};
type NotificationContext = Pick<MutationCtx, "db" | "runMutation">;

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
  if (args.scheduleReminders ?? true)
    await queueStaffPushEvent(ctx, {
      orgId: args.org._id,
      bookingId: args.booking._id,
      event: "booking_reminder",
    });
}

export async function queueBookingRescheduledNotifications(
  ctx: NotificationContext,
  args: BookingNotificationArgs & {
    previousStartAt: number;
    previousEndAt: number;
  },
) {
  await queueBookingRescheduledEmail(ctx, args);
  await queueStaffPushEvent(ctx, {
    orgId: args.org._id,
    bookingId: args.booking._id,
    event: "booking_changed",
  });
  await queueStaffPushEvent(ctx, {
    orgId: args.org._id,
    bookingId: args.booking._id,
    event: "booking_reminder",
  });
}
