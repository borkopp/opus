import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { scheduleRecoveryRefresh } from "./gapRecovery";
import { queueBookingSms } from "./bookingNotifications";
import { formatBookingNotificationDateTime } from "./bookingTime";

/** Shared atomic cancellation after the caller's staff/client authorization. */
export async function cancelBookingRecord(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  actor: { type: "staff" | "opus_user"; id: string },
  reason?: string,
) {
  if (["cancelled", "completed", "no_show"].includes(booking.status))
    throw new ConvexError(
      `Cannot cancel booking already in terminal status: ${booking.status}`,
    );
  await ctx.db.patch(booking._id, {
    status: "cancelled",
    cancelledAt: Date.now(),
    cancellationReason: reason,
    cancelledBy: actor.id,
    updatedAt: Date.now(),
  });
  await ctx.db.insert("audit_log", {
    orgId: booking.orgId,
    actorType: actor.type,
    actorId: actor.id,
    action: "booking.cancelled",
    resourceType: "bookings",
    resourceId: booking._id,
    before: { status: booking.status },
    after: { status: "cancelled", reason },
    createdAt: Date.now(),
  });
  const [customer, service, staff, settings, org] = await Promise.all([
    ctx.db.get(booking.customerId),
    ctx.db.get(booking.serviceId),
    ctx.db.get(booking.staffId),
    ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", booking.orgId))
      .first(),
    ctx.db.get(booking.orgId),
  ]);
  if (
    customer?.orgId === booking.orgId &&
    service?.orgId === booking.orgId &&
    staff?.orgId === booking.orgId
  ) {
    if (customer.email)
      await ctx.runMutation(internal.notifications.scheduleNotification, {
        orgId: booking.orgId,
        customerId: customer._id,
        bookingId: booking._id,
        channel: "email",
        type: "booking_cancelled",
        recipientAddress: customer.email,
        templateData: {
          customerName: customer.name,
          serviceName: service.name,
          staffName: staff.displayName,
          startAt: booking.startAt,
          cancellationPolicy: `${settings?.cancellationWindowHours ?? 24} hours`,
        },
      });
    if (org && settings)
      await queueBookingSms(
        ctx,
        { org, settings, booking, customer, service, staff },
        "booking_cancelled",
      );
    await ctx.runMutation(internal.dashboardNotifications.create, {
      orgId: booking.orgId,
      type: "booking_cancelled",
      title: "Booking Cancelled",
      body: `The ${service.name} booking for ${customer.name} on ${formatBookingNotificationDateTime(booking.startAt)} was cancelled`,
      bookingId: booking._id,
      customerId: customer._id,
    });
  }
  await scheduleRecoveryRefresh(
    ctx,
    booking.orgId,
    booking.staffId,
    new Date(booking.startAt).toISOString().slice(0, 10),
  );
  return true;
}
