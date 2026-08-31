import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  normalizeReminderHours,
  queueBookingEmailNotifications,
  resolveStaffEmailRecipients,
} from "./lib/bookingEmailNotifications";
import { decryptBookingOtp } from "./lib/bookingEmailSecurity";
import { wallClockNow } from "./lib/bookingTime";
import { isActiveIndustry } from "./lib/productScope";
import {
  type AppointmentEmailData,
  type RenderedEmail,
  renderBookingVerificationEmail,
  renderClientConfirmationEmail,
  renderClientReminderEmail,
  renderSimpleAppointmentEmail,
  renderStaffInviteEmail,
  renderStaffNewBookingEmail,
  renderStaffReminderEmail,
} from "./lib/emailTemplates";

const notificationType = v.union(
  v.literal("booking_verification"),
  v.literal("booking_confirmation"),
  v.literal("booking_reminder"),
  v.literal("staff_new_booking"),
  v.literal("staff_booking_reminder"),
  v.literal("booking_cancelled"),
  v.literal("review_request"),
  v.literal("no_show_warning"),
  v.literal("gap_fill_offer"),
  v.literal("staff_invite"),
);

const notificationChannel = v.union(
  v.literal("sms"),
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("push"),
);

type DeliveryContext = {
  notification: Doc<"notifications">;
  org: Doc<"orgs"> | null;
  settings: Doc<"org_settings"> | null;
  booking: Doc<"bookings"> | null;
  customer: Doc<"customers"> | null;
  service: Doc<"services"> | null;
  staff: Doc<"staff_members"> | null;
  verification: Doc<"booking_email_verifications"> | null;
  staffRecipientEmails: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function configuredSiteUrl() {
  return (process.env.SITE_URL || "https://studio.opus.mk").replace(/\/$/, "");
}

function senderAddress() {
  const configured = process.env.AUTH_EMAIL_FROM?.trim();
  if (!configured) throw new Error("Email delivery requires AUTH_EMAIL_FROM.");
  return configured.includes("<") ? configured : `OPUS <${configured}>`;
}

class DeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export const scheduleNotification = internalMutation({
  args: {
    orgId: v.id("orgs"),
    customerId: v.optional(v.id("customers")),
    bookingId: v.optional(v.id("bookings")),
    bookingEmailVerificationId: v.optional(v.id("booking_email_verifications")),
    channel: notificationChannel,
    type: notificationType,
    recipientAddress: v.string(),
    templateData: v.any(),
    scheduledFor: v.optional(v.number()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.dedupeKey) {
      const matching = await ctx.db
        .query("notifications")
        .withIndex("by_org_dedupe", (query) =>
          query.eq("orgId", args.orgId).eq("dedupeKey", args.dedupeKey),
        )
        .collect();
      const existing = matching.find(
        (notification) => notification.status !== "cancelled",
      );
      if (existing) return existing._id;
    }

    const scheduledFor = args.scheduledFor ?? Date.now();
    const notificationId = await ctx.db.insert("notifications", {
      orgId: args.orgId,
      customerId: args.customerId,
      bookingId: args.bookingId,
      bookingEmailVerificationId: args.bookingEmailVerificationId,
      channel: args.channel,
      type: args.type,
      recipientAddress: args.recipientAddress.trim().toLowerCase(),
      templateData: args.templateData,
      status: "pending",
      scheduledFor,
      attemptCount: 0,
      dedupeKey: args.dedupeKey,
      createdAt: Date.now(),
    });

    // Booking OTP delivery is awaited by the requesting action so the browser
    // only advances after Resend accepts it. Scheduling it here as well would
    // create a race between two workers for the same one-time challenge.
    if (args.channel === "email" && args.type !== "booking_verification") {
      await ctx.scheduler.runAfter(
        Math.max(0, scheduledFor - Date.now()),
        internal.notifications.processIndividualNotification,
        { notificationId },
      );
    }
    return notificationId;
  },
});

export const getPendingNotificationsToProcess = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"notifications">[]> => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_status_scheduled", (query) =>
        query.eq("status", "pending").lte("scheduledFor", Date.now()),
      )
      .take(50);
  },
});

export const processNotifications = internalAction({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const pending: Doc<"notifications">[] = await ctx.runQuery(
      internal.notifications.getPendingNotificationsToProcess,
    );
    if (pending.length === 0) return null;
    await Promise.allSettled(
      pending.map((notification) =>
        ctx.runAction(internal.notifications.processIndividualNotification, {
          notificationId: notification._id,
        }),
      ),
    );
    return `Processed ${pending.length} queued notifications`;
  },
});

export const getNotificationDeliveryContext = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args): Promise<DeliveryContext | null> => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return null;

    const org = await ctx.db.get(notification.orgId);
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (query) => query.eq("orgId", notification.orgId))
      .first();
    const booking = notification.bookingId
      ? await ctx.db.get(notification.bookingId)
      : null;
    const customer = booking
      ? await ctx.db.get(booking.customerId)
      : notification.customerId
        ? await ctx.db.get(notification.customerId)
        : null;
    const service = booking ? await ctx.db.get(booking.serviceId) : null;
    const staff = booking ? await ctx.db.get(booking.staffId) : null;
    const verification = notification.bookingEmailVerificationId
      ? await ctx.db.get(notification.bookingEmailVerificationId)
      : null;
    const staffRecipients = settings
      ? await resolveStaffEmailRecipients(
          ctx,
          notification.orgId,
          settings.staffEmailRecipientUserIds,
        )
      : [];

    return {
      notification,
      org,
      settings,
      booking,
      customer,
      service,
      staff,
      verification,
      staffRecipientEmails: staffRecipients.map((recipient) => recipient.email),
    };
  },
});

function deliverySkipReason(context: DeliveryContext) {
  const {
    notification,
    org,
    settings,
    booking,
    verification,
    staffRecipientEmails,
  } = context;
  if (!org || org.isDeleted || !settings) return "Organization unavailable";

  if (notification.type === "booking_verification") {
    if (!verification || verification.orgId !== notification.orgId) {
      return "Verification challenge unavailable";
    }
    if (
      verification.status !== "pending" ||
      verification.expiresAt <= Date.now()
    ) {
      return "Verification challenge is no longer active";
    }
    return null;
  }

  if (
    notification.type === "staff_new_booking" ||
    notification.type === "staff_booking_reminder"
  ) {
    if (
      !staffRecipientEmails.includes(
        notification.recipientAddress.trim().toLowerCase(),
      )
    ) {
      return "Recipient is no longer selected";
    }
    if (
      notification.type === "staff_new_booking" &&
      !(settings.staffNewBookingEmailEnabled ?? true)
    ) {
      return "New-booking emails are disabled";
    }
    if (
      notification.type === "staff_booking_reminder" &&
      !(settings.staffReminderEmailEnabled ?? true)
    ) {
      return "Team reminders are disabled";
    }
  }

  if (notification.type === "booking_reminder" && !settings.emailEnabled) {
    return "Client reminders are disabled";
  }

  if (notification.bookingId) {
    if (!booking || booking.orgId !== notification.orgId || booking.isDeleted) {
      return "Appointment unavailable";
    }
    if (
      [
        "booking_confirmation",
        "booking_reminder",
        "staff_new_booking",
        "staff_booking_reminder",
      ].includes(notification.type) &&
      booking.status === "cancelled"
    ) {
      return "Appointment was cancelled";
    }
    if (
      notification.type === "booking_cancelled" &&
      booking.status !== "cancelled"
    ) {
      return "Appointment is not cancelled";
    }
  }

  const templateData = asRecord(notification.templateData);
  const hoursBefore = numberValue(templateData.hoursBefore);
  if (notification.type === "booking_reminder" && hoursBefore !== undefined) {
    if (
      !normalizeReminderHours(settings.reminderHoursBefore).includes(
        hoursBefore,
      )
    ) {
      return "Reminder time is no longer configured";
    }
  }
  if (
    notification.type === "staff_booking_reminder" &&
    hoursBefore !== undefined
  ) {
    const configured = normalizeReminderHours(
      settings.staffReminderHoursBefore ?? settings.reminderHoursBefore,
    );
    if (!configured.includes(hoursBefore)) {
      return "Team reminder time is no longer configured";
    }
  }
  return null;
}

function appointmentData(context: DeliveryContext): AppointmentEmailData {
  const data = asRecord(context.notification.templateData);
  // Prefer the immutable queue snapshot so a retry with the same Resend
  // idempotency key always has the same payload. Current records remain the
  // fallback for older queued notification shapes.
  const startAt = numberValue(data.startAt) ?? context.booking?.startAt;
  const endAt = numberValue(data.endAt) ?? context.booking?.endAt;
  if (startAt === undefined || endAt === undefined) {
    throw new Error("Appointment email is missing its time range.");
  }

  return {
    studioName:
      stringValue(data.studioName) || context.org?.name || "OPUS Studio",
    customerName:
      stringValue(data.customerName) || context.customer?.name || "Client",
    customerEmail:
      stringValue(data.customerEmail) || context.customer?.email || undefined,
    customerPhone:
      stringValue(data.customerPhone) || context.customer?.phone || undefined,
    serviceName:
      stringValue(data.serviceName) || context.service?.name || "Appointment",
    staffName:
      stringValue(data.staffName) ||
      context.staff?.displayName ||
      "Studio team",
    startAt,
    endAt,
    priceMinorUnits:
      numberValue(data.priceMinorUnits) ?? context.booking?.priceMinorUnits,
    currency: stringValue(data.currency) || context.booking?.currency || "MKD",
    locale: stringValue(data.locale) || context.settings?.locale || "mk-MK",
    timezone:
      stringValue(data.timezone) ||
      context.settings?.timezone ||
      "Europe/Skopje",
    address: stringValue(data.address) || context.org?.address || undefined,
    city: stringValue(data.city) || context.org?.city || undefined,
    latitude: numberValue(data.latitude) ?? context.org?.coordinates?.lat,
    longitude: numberValue(data.longitude) ?? context.org?.coordinates?.lng,
    studioPhone:
      stringValue(data.studioPhone) || context.org?.phone || undefined,
    dashboardUrl: stringValue(
      data.dashboardUrl,
      context.booking
        ? `${configuredSiteUrl()}/beauty/bookings?booking=${context.booking._id}`
        : configuredSiteUrl(),
    ),
    hoursBefore: numberValue(data.hoursBefore),
    generatedAt: context.notification.createdAt,
  };
}

async function renderNotificationEmail(
  context: DeliveryContext,
): Promise<RenderedEmail> {
  const { notification } = context;
  const data = asRecord(notification.templateData);

  if (notification.type === "booking_verification") {
    const encryptedCode = stringValue(data.encryptedCode);
    if (!encryptedCode)
      throw new Error("Verification email payload is missing.");
    return renderBookingVerificationEmail({
      studioName:
        context.org?.name ?? stringValue(data.studioName, "OPUS Studio"),
      code: await decryptBookingOtp(encryptedCode),
      locale: context.settings?.locale ?? stringValue(data.locale, "mk-MK"),
    });
  }

  if (notification.type === "staff_invite") {
    return renderStaffInviteEmail({
      studioName: context.org?.name ?? "OPUS Studio",
      dashboardUrl: configuredSiteUrl(),
    });
  }

  const appointment = appointmentData(context);
  switch (notification.type) {
    case "booking_confirmation":
      return renderClientConfirmationEmail(appointment);
    case "booking_reminder":
      return renderClientReminderEmail(appointment);
    case "staff_new_booking":
      return renderStaffNewBookingEmail(appointment);
    case "staff_booking_reminder":
      return renderStaffReminderEmail(appointment);
    case "booking_cancelled":
      return renderSimpleAppointmentEmail({
        data: appointment,
        subject: `Appointment cancelled · ${appointment.studioName}`,
        title: "The appointment was cancelled.",
        intro: "This appointment is no longer in the studio calendar.",
      });
    case "review_request":
      return renderSimpleAppointmentEmail({
        data: appointment,
        subject: `How was your visit to ${appointment.studioName}?`,
        title: "Thank you for visiting.",
        intro: "We hope you enjoyed your appointment.",
      });
    case "no_show_warning":
      return renderSimpleAppointmentEmail({
        data: appointment,
        subject: `Appointment update · ${appointment.studioName}`,
        title: "We missed you today.",
        intro: "Contact the studio if you would like to arrange another time.",
      });
    default:
      throw new Error(`Unsupported email template: ${notification.type}`);
  }
}

async function sendResendEmail(
  notification: Doc<"notifications">,
  email: RenderedEmail,
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey)
    throw new DeliveryError("RESEND_API_KEY is not configured.", false);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `opus-notification/${notification._id}`,
      },
      body: JSON.stringify({
        from: senderAddress(),
        to: [notification.recipientAddress],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.attachments?.length
          ? { attachments: email.attachments }
          : {}),
      }),
    });
  } catch (error) {
    throw new DeliveryError(
      error instanceof Error ? error.message : "Resend network request failed.",
      true,
    );
  }

  const responseBody = await response.text();
  if (!response.ok) {
    const retryable =
      response.status === 408 ||
      response.status === 409 ||
      response.status === 429 ||
      response.status >= 500;
    throw new DeliveryError(
      `Resend returned ${response.status}: ${responseBody.slice(0, 300)}`,
      retryable,
    );
  }

  try {
    const parsed = JSON.parse(responseBody) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

export const updateNotificationStatus = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    orgId: v.id("orgs"),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    sentAt: v.optional(v.number()),
    externalMessageId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.notificationId);
    if (
      !existing ||
      existing.orgId !== args.orgId ||
      existing.status !== "pending"
    ) {
      return args.status;
    }

    const isBookingVerification = existing.type === "booking_verification";
    const redactedTemplateData = isBookingVerification
      ? { redacted: true }
      : existing.templateData;
    const auditBefore = {
      ...existing,
      templateData: redactedTemplateData,
    };
    await ctx.db.patch(args.notificationId, {
      status: args.status,
      sentAt: args.sentAt,
      externalMessageId: args.externalMessageId,
      failureReason: args.failureReason,
      lastAttemptAt: Date.now(),
      attemptCount: (existing.attemptCount ?? 0) + 1,
      ...(isBookingVerification ? { templateData: redactedTemplateData } : {}),
    });
    const updated = await ctx.db.get(args.notificationId);
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "system",
      action: `notification.${args.status}`,
      resourceType: "notifications",
      resourceId: args.notificationId,
      before: auditBefore,
      after: updated,
      createdAt: Date.now(),
    });
    return args.status;
  },
});

export const recordNotificationFailure = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    orgId: v.id("orgs"),
    failureReason: v.string(),
    retryable: v.boolean(),
  },
  handler: async (ctx, args): Promise<"retrying" | "failed"> => {
    const existing = await ctx.db.get(args.notificationId);
    if (
      !existing ||
      existing.orgId !== args.orgId ||
      existing.status !== "pending"
    ) {
      return "failed";
    }

    const attemptCount = (existing.attemptCount ?? 0) + 1;
    const mayRetry =
      args.retryable &&
      existing.type !== "booking_verification" &&
      attemptCount < 3;
    if (!mayRetry) {
      const isBookingVerification = existing.type === "booking_verification";
      const redactedTemplateData = isBookingVerification
        ? { redacted: true }
        : existing.templateData;
      await ctx.db.patch(args.notificationId, {
        status: "failed",
        failureReason: args.failureReason,
        attemptCount,
        lastAttemptAt: Date.now(),
        ...(isBookingVerification
          ? { templateData: redactedTemplateData }
          : {}),
      });
      await ctx.db.insert("audit_log", {
        orgId: args.orgId,
        actorType: "system",
        action: "notification.failed",
        resourceType: "notifications",
        resourceId: args.notificationId,
        before: {
          ...existing,
          templateData: redactedTemplateData,
        },
        after: {
          status: "failed",
          attemptCount,
          failureReason: args.failureReason,
        },
        createdAt: Date.now(),
      });
      return "failed";
    }

    const retryDelay = attemptCount === 1 ? 60_000 : 5 * 60_000;
    const scheduledFor = Date.now() + retryDelay;
    await ctx.db.patch(args.notificationId, {
      failureReason: args.failureReason,
      attemptCount,
      lastAttemptAt: Date.now(),
      scheduledFor,
    });
    await ctx.scheduler.runAfter(
      retryDelay,
      internal.notifications.processIndividualNotification,
      { notificationId: args.notificationId },
    );
    return "retrying";
  },
});

export const processIndividualNotification = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (
    ctx,
    args,
  ): Promise<"sent" | "failed" | "retrying" | "cancelled" | "ignored"> => {
    const context = await ctx.runQuery(
      internal.notifications.getNotificationDeliveryContext,
      args,
    );
    if (!context) return "ignored";
    if (context.notification.status === "sent") return "sent";
    if (context.notification.status !== "pending") return "ignored";

    const skipReason = deliverySkipReason(context);
    if (skipReason) {
      await ctx.runMutation(internal.notifications.updateNotificationStatus, {
        notificationId: args.notificationId,
        orgId: context.notification.orgId,
        status: "cancelled",
        failureReason: skipReason,
      });
      return "cancelled";
    }

    if (context.notification.channel !== "email") {
      await ctx.runMutation(internal.notifications.updateNotificationStatus, {
        notificationId: args.notificationId,
        orgId: context.notification.orgId,
        status: "failed",
        failureReason: "SMS, WhatsApp, and push delivery are not configured.",
      });
      return "failed";
    }

    try {
      const email = await renderNotificationEmail(context);
      const externalMessageId = await sendResendEmail(
        context.notification,
        email,
      );
      await ctx.runMutation(internal.notifications.updateNotificationStatus, {
        notificationId: args.notificationId,
        orgId: context.notification.orgId,
        status: "sent",
        sentAt: Date.now(),
        externalMessageId,
      });
      return "sent";
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : "Unknown email delivery error";
      return await ctx.runMutation(
        internal.notifications.recordNotificationFailure,
        {
          notificationId: args.notificationId,
          orgId: context.notification.orgId,
          failureReason,
          retryable: error instanceof DeliveryError ? error.retryable : false,
        },
      );
    }
  },
});

export const reconcileBookingRemindersForOrg = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) return 0;
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (query) => query.eq("orgId", args.orgId))
      .first();
    if (!settings) return 0;

    const customerHours = settings.emailEnabled
      ? normalizeReminderHours(settings.reminderHoursBefore)
      : [];
    const staffHours =
      (settings.staffReminderEmailEnabled ?? true)
        ? normalizeReminderHours(
            settings.staffReminderHoursBefore ?? settings.reminderHoursBefore,
          )
        : [];
    const allHours = [...customerHours, ...staffHours];
    if (allHours.length === 0) return 0;

    const now = wallClockNow(settings.timezone);
    const through = now + (Math.max(...allHours) + 24) * 60 * 60 * 1_000;
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org_start", (query) =>
        query
          .eq("orgId", args.orgId)
          .gte("startAt", now)
          .lt("startAt", through),
      )
      .take(250);

    let reconciled = 0;
    for (const booking of bookings) {
      if (booking.isDeleted || booking.status !== "confirmed") continue;
      const [customer, service, staff] = await Promise.all([
        ctx.db.get(booking.customerId),
        ctx.db.get(booking.serviceId),
        ctx.db.get(booking.staffId),
      ]);
      if (!customer || !service || !staff) continue;
      await queueBookingEmailNotifications(ctx, {
        org,
        settings,
        booking,
        customer,
        service,
        staff,
        sendCustomerConfirmation: false,
        notifyTeamOfNewBooking: false,
        scheduleReminders: true,
      });
      reconciled += 1;
    }
    return reconciled;
  },
});

export const getReminderOrgIds = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"orgs">[]> => {
    const statuses = ["unpublished", "published", "suspended"] as const;
    const groups = await Promise.all(
      statuses.map((status) =>
        ctx.db
          .query("orgs")
          .withIndex("by_listing_status_deleted", (query) =>
            query.eq("listingStatus", status).eq("isDeleted", false),
          )
          .collect(),
      ),
    );
    return groups
      .flat()
      .filter((org) => isActiveIndustry(org.industry))
      .map((org) => org._id);
  },
});

export const reconcileAllBookingReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    const orgIds: Id<"orgs">[] = await ctx.runQuery(
      internal.notifications.getReminderOrgIds,
    );
    let reconciled = 0;
    for (let index = 0; index < orgIds.length; index += 10) {
      const results = await Promise.allSettled(
        orgIds
          .slice(index, index + 10)
          .map((orgId) =>
            ctx.runMutation(
              internal.notifications.reconcileBookingRemindersForOrg,
              { orgId },
            ),
          ),
      );
      for (const result of results) {
        if (result.status === "fulfilled") reconciled += result.value;
      }
    }
    return reconciled;
  },
});
