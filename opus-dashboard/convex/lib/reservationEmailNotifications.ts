import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  normalizeReminderHours,
  resolveStaffEmailRecipients,
} from "./bookingEmailNotifications";
import {
  decryptBookingOtp,
  normalizeBookingEmail,
} from "./bookingEmailSecurity";
import { isHospitalityOrg } from "./hospitalityAccess";
import { isAppReviewOrg } from "./appReview";
import { reservationManagementUrl } from "./reservationGuestSecurity";
import {
  renderReservationMessage,
  renderReservationVerification,
} from "./reservationEmailTemplates";

export type ReservationEvent = "confirmation" | "changed" | "cancelled";
const reservationTypes = new Set([
  "reservation_verification",
  "reservation_confirmation",
  "reservation_changed",
  "reservation_cancelled",
  "reservation_reminder",
  "staff_reservation",
]);
export const isReservationNotification = (type: string) =>
  reservationTypes.has(type);

export async function queueReservationReminders(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
) {
  if (
    !isHospitalityOrg(org) ||
    !reservation.verifiedEmail ||
    reservation.status !== "confirmed" ||
    reservation.schemaVersion !== 2
  )
    return;
  const settings = await ctx.db
    .query("reservation_settings")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .unique();
  for (const hoursBefore of normalizeReminderHours(
    settings?.reminderHoursBefore,
  )) {
    const scheduledFor = reservation.startAt - hoursBefore * 3_600_000;
    if (scheduledFor <= Date.now()) continue;
    await ctx.runMutation(internal.notifications.scheduleNotification, {
      orgId: org._id,
      reservationId: reservation._id,
      reservationRevision: reservation.revision ?? 0,
      customerId: reservation.customerId,
      channel: "email",
      type: "reservation_reminder",
      recipientAddress: reservation.verifiedEmail,
      templateData: { hoursBefore },
      scheduledFor,
      dedupeKey: `reservation:${reservation._id}:${reservation.revision}:reminder:${hoursBefore}`,
    });
  }
}

export async function queueReservationEvent(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
  event: ReservationEvent,
) {
  if (
    !isHospitalityOrg(org) ||
    reservation.orgId !== org._id ||
    reservation.schemaVersion !== 2
  )
    return;
  if (reservation.verifiedEmail) {
    await ctx.runMutation(internal.notifications.scheduleNotification, {
      orgId: org._id,
      reservationId: reservation._id,
      reservationRevision: reservation.revision ?? 0,
      customerId: reservation.customerId,
      channel: "email",
      type: `reservation_${event}`,
      recipientAddress: reservation.verifiedEmail,
      templateData: {},
      dedupeKey: `reservation:${reservation._id}:${reservation.revision}:${event}:customer`,
    });
  }
  const preferences = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", org._id))
    .unique();
  if (preferences?.staffNewBookingEmailEnabled ?? true) {
    for (const recipient of await resolveStaffEmailRecipients(
      ctx,
      org._id,
      preferences?.staffEmailRecipientUserIds,
    )) {
      await ctx.runMutation(internal.notifications.scheduleNotification, {
        orgId: org._id,
        reservationId: reservation._id,
        reservationRevision: reservation.revision ?? 0,
        customerId: reservation.customerId,
        channel: "email",
        type: "staff_reservation",
        recipientAddress: recipient.email,
        templateData: { event },
        dedupeKey: `reservation:${reservation._id}:${reservation.revision}:${event}:staff:${recipient.userId}`,
      });
    }
  }
  if (event !== "cancelled")
    await queueReservationReminders(ctx, org, reservation);
}

export async function reservationEmailContext(
  ctx: QueryCtx,
  notification: Doc<"notifications">,
) {
  if (!isReservationNotification(notification.type)) return null;
  const org = await ctx.db.get(notification.orgId);
  const settings = await ctx.db
    .query("reservation_settings")
    .withIndex("by_org", (q) => q.eq("orgId", notification.orgId))
    .unique();
  const preferences = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", notification.orgId))
    .unique();
  const reservation = notification.reservationId
    ? await ctx.db.get(notification.reservationId)
    : null;
  const customer = reservation
    ? await ctx.db.get(reservation.customerId)
    : null;
  const challenge = notification.bookingEmailVerificationId
    ? await ctx.db.get(notification.bookingEmailVerificationId)
    : null;
  let skipReason: string | null = null;
  if (!isHospitalityOrg(org) || !settings || settings.schemaVersion !== 2)
    skipReason = "Restaurant reservations are unavailable.";
  else if (isAppReviewOrg(org!))
    skipReason = "External messages are disabled in the App Review demo.";
  else if (notification.channel !== "email")
    skipReason = "Reservation delivery requires email.";
  else if (notification.type === "reservation_verification") {
    if (
      !challenge ||
      challenge.purpose !== "reservation" ||
      challenge.orgId !== org!._id ||
      challenge.email !== notification.recipientAddress ||
      challenge.status !== "pending" ||
      challenge.expiresAt <= Date.now() ||
      org!.websiteStatus !== "published"
    )
      skipReason = "Reservation verification is no longer active.";
  } else if (
    !reservation ||
    reservation.orgId !== org!._id ||
    reservation.isDeleted ||
    reservation.schemaVersion !== 2 ||
    !customer ||
    customer.orgId !== org!._id ||
    customer.isDeleted
  )
    skipReason = "Reservation is unavailable.";
  else if (reservation.revision !== notification.reservationRevision)
    skipReason = "Reservation has changed.";
  else if (
    notification.type === "reservation_cancelled"
      ? reservation.status !== "cancelled"
      : notification.type !== "staff_reservation" &&
        reservation.status !== "confirmed"
  )
    skipReason = "Reservation status changed.";
  else if (notification.type === "staff_reservation") {
    const recipients = await resolveStaffEmailRecipients(
      ctx,
      org!._id,
      preferences?.staffEmailRecipientUserIds,
    );
    if (
      !(preferences?.staffNewBookingEmailEnabled ?? true) ||
      !recipients.some(
        (recipient) => recipient.email === notification.recipientAddress,
      )
    )
      skipReason = "Reservation recipient no longer has permission.";
  } else if (
    !reservation.verifiedEmail ||
    normalizeBookingEmail(reservation.verifiedEmail) !==
      notification.recipientAddress
  )
    skipReason = "Reservation email is not verified.";
  if (
    !skipReason &&
    notification.type === "reservation_reminder" &&
    reservation
  ) {
    const hoursBefore = Number(notification.templateData?.hoursBefore);
    if (
      !normalizeReminderHours(settings?.reminderHoursBefore).includes(
        hoursBefore,
      ) ||
      reservation.startAt <= Date.now() ||
      reservation.arrivedAt
    )
      skipReason = "Reservation reminder is no longer relevant.";
  }
  return {
    notification,
    org,
    settings,
    preferences,
    reservation,
    customer,
    skipReason,
  };
}

export type ReservationEmailContext = NonNullable<
  Awaited<ReturnType<typeof reservationEmailContext>>
>;

export async function renderReservationNotification(
  context: ReservationEmailContext,
) {
  const { notification, org, settings, reservation, customer } = context;
  if (!org || !settings) throw new Error("Reservation venue unavailable.");
  const locale = context.preferences?.locale ?? "mk-MK";
  if (notification.type === "reservation_verification")
    return renderReservationVerification(
      org.name,
      await decryptBookingOtp(notification.templateData.encryptedCode),
      locale,
    );
  if (!reservation || !customer) throw new Error("Reservation unavailable.");
  const staff = notification.type === "staff_reservation";
  const event = staff
    ? notification.templateData.event
    : notification.type.replace("reservation_", "");
  if (!["confirmation", "changed", "cancelled", "reminder"].includes(event))
    throw new Error("Invalid reservation event.");
  let manageUrl: string | undefined;
  if (
    !staff &&
    reservation.manageTokenHash &&
    reservation.manageTokenCiphertext &&
    (reservation.manageTokenExpiresAt ?? 0) > Date.now()
  ) {
    manageUrl = reservationManagementUrl(
      org.slug,
      reservation._id,
      await decryptBookingOtp(reservation.manageTokenCiphertext),
    );
  }
  return renderReservationMessage({
    orgId: org._id,
    reservationId: reservation._id,
    revision: reservation.revision ?? 0,
    venue: org.name,
    customerName: reservation.guestName ?? customer.name,
    partySize: reservation.partySize,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    timezone: reservation.timezone ?? settings.timezone ?? "Europe/Skopje",
    locale,
    event,
    staff,
    address: [org.address, org.city].filter(Boolean).join(", "),
    manageUrl,
    dashboardUrl: new URL(
      "/hospitality",
      process.env.SITE_URL || "https://studio.opus.mk",
    ).toString(),
  });
}
