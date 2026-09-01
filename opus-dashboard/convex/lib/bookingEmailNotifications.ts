import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./bookingEmailSecurity";
import { wallClockTimestampToInstant } from "./bookingTime";

const MAX_REMINDER_HOURS = 14 * 24;
const MAX_REMINDER_ENTRIES = 8;

export type StaffEmailRecipient = {
  userId: Id<"users">;
  staffId: Id<"staff_members">;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
};

type BookingEmailRecipient = Omit<StaffEmailRecipient, "userId">;

function uniqueEmailRecipients(
  recipients: readonly BookingEmailRecipient[],
): BookingEmailRecipient[] {
  const unique = new Map<string, BookingEmailRecipient>();
  for (const recipient of recipients) {
    if (!unique.has(recipient.email)) unique.set(recipient.email, recipient);
  }
  return [...unique.values()];
}

export function resolveAssignedStaffEmailRecipient(
  staffMember: Doc<"staff_members">,
): BookingEmailRecipient | null {
  if (
    staffMember.isDeleted ||
    !staffMember.isActive ||
    !staffMember.appointmentEmail
  ) {
    return null;
  }
  const email = normalizeBookingEmail(staffMember.appointmentEmail);
  if (!isValidBookingEmail(email)) return null;
  return {
    staffId: staffMember._id,
    name: staffMember.displayName,
    email,
    role: staffMember.role,
  };
}

export function normalizeReminderHours(values: readonly number[] | undefined) {
  if (!values) return [];
  return Array.from(
    new Set(
      values.filter(
        (value) =>
          Number.isInteger(value) && value > 0 && value <= MAX_REMINDER_HOURS,
      ),
    ),
  )
    .sort((first, second) => second - first)
    .slice(0, MAX_REMINDER_ENTRIES);
}

export function reminderHoursValidationError(values: readonly number[]) {
  if (values.length > MAX_REMINDER_ENTRIES) {
    return `Choose no more than ${MAX_REMINDER_ENTRIES} reminder times.`;
  }
  if (
    values.some(
      (value) =>
        !Number.isInteger(value) || value <= 0 || value > MAX_REMINDER_HOURS,
    )
  ) {
    return `Reminder times must be whole hours between 1 and ${MAX_REMINDER_HOURS}.`;
  }
  return null;
}

export async function resolveStaffEmailRecipients(
  ctx: Pick<QueryCtx, "db">,
  orgId: Id<"orgs">,
  configuredUserIds?: readonly Id<"users">[],
): Promise<StaffEmailRecipient[]> {
  const allowedUserIds = configuredUserIds
    ? new Set(configuredUserIds)
    : undefined;
  const staffMembers = await ctx.db
    .query("staff_members")
    .withIndex("by_org_active", (query) =>
      query.eq("orgId", orgId).eq("isActive", true).eq("isDeleted", false),
    )
    .collect();

  const recipients = await Promise.all(
    staffMembers.map(async (staffMember) => {
      if (
        !staffMember.userId ||
        (allowedUserIds && !allowedUserIds.has(staffMember.userId))
      ) {
        return null;
      }
      const user = await ctx.db.get(staffMember.userId);
      if (!user || user.isDeleted || !user.email.trim()) return null;
      return {
        userId: user._id,
        staffId: staffMember._id,
        name: user.name || staffMember.displayName,
        email: user.email.trim().toLowerCase(),
        role: staffMember.role,
      } satisfies StaffEmailRecipient;
    }),
  );

  const unique = new Map<string, StaffEmailRecipient>();
  for (const recipient of recipients) {
    if (recipient && !unique.has(recipient.email)) {
      unique.set(recipient.email, recipient);
    }
  }
  return [...unique.values()];
}

type QueueBookingEmailsArgs = {
  org: Doc<"orgs">;
  settings: Doc<"org_settings">;
  booking: Doc<"bookings">;
  customer: Doc<"customers">;
  service: Doc<"services">;
  staff: Doc<"staff_members">;
  sendCustomerConfirmation?: boolean;
  notifyTeamOfNewBooking?: boolean;
  notifyAssignedStaffOfNewBooking?: boolean;
  scheduleReminders?: boolean;
};

type QueueBookingRescheduledEmailArgs = Omit<
  QueueBookingEmailsArgs,
  | "sendCustomerConfirmation"
  | "notifyTeamOfNewBooking"
  | "notifyAssignedStaffOfNewBooking"
  | "scheduleReminders"
> & {
  previousStartAt: number;
  previousEndAt: number;
};

function dashboardBookingUrl(bookingId: Id<"bookings">) {
  const base = (process.env.SITE_URL || "https://studio.opus.mk").replace(
    /\/$/,
    "",
  );
  return `${base}/beauty/bookings?booking=${encodeURIComponent(bookingId)}`;
}

function appointmentTemplateData(args: QueueBookingEmailsArgs) {
  const coordinates = args.org.coordinates;
  return {
    studioName: args.org.name,
    customerName: args.customer.name,
    customerEmail: args.customer.email,
    customerPhone: args.customer.phone,
    serviceName: args.service.name,
    staffName: args.staff.displayName,
    startAt: args.booking.startAt,
    endAt: args.booking.endAt,
    priceMinorUnits: args.booking.priceMinorUnits,
    currency: args.booking.currency,
    locale: args.settings.locale,
    timezone: args.settings.timezone,
    address: args.org.address,
    city: args.org.city,
    latitude: coordinates?.lat,
    longitude: coordinates?.lng,
    studioPhone: args.org.phone,
    dashboardUrl: dashboardBookingUrl(args.booking._id),
  };
}

async function scheduleEmail(
  ctx: Pick<MutationCtx, "runMutation">,
  args: {
    orgId: Id<"orgs">;
    customerId?: Id<"customers">;
    bookingId: Id<"bookings">;
    type:
      | "booking_confirmation"
      | "booking_rescheduled"
      | "booking_reminder"
      | "staff_new_booking"
      | "staff_booking_reminder";
    recipientAddress: string;
    templateData: Record<string, unknown>;
    scheduledFor?: number;
    dedupeKey: string;
  },
) {
  await ctx.runMutation(internal.notifications.scheduleNotification, {
    ...args,
    channel: "email",
  });
}

export async function queueBookingRescheduledEmail(
  ctx: Pick<MutationCtx, "runMutation">,
  args: QueueBookingRescheduledEmailArgs,
) {
  const customerEmail = args.customer.email?.trim().toLowerCase();
  if (!customerEmail) return;

  // This is an immediate transactional update, not an optional reminder.
  // Deliberately do not gate it on org_settings.emailEnabled.
  await scheduleEmail(ctx, {
    orgId: args.org._id,
    customerId: args.customer._id,
    bookingId: args.booking._id,
    type: "booking_rescheduled",
    recipientAddress: customerEmail,
    templateData: {
      ...appointmentTemplateData(args),
      previousStartAt: args.previousStartAt,
      previousEndAt: args.previousEndAt,
    },
    dedupeKey: `customer-rescheduled:${args.booking._id}:${customerEmail}`,
  });
}

export async function queueBookingEmailNotifications(
  ctx: Pick<MutationCtx, "db" | "runMutation">,
  args: QueueBookingEmailsArgs,
) {
  const templateData = appointmentTemplateData(args);
  const customerEmail = args.customer.email?.trim().toLowerCase();
  const now = Date.now();
  const appointmentInstant = wallClockTimestampToInstant(
    args.booking.startAt,
    args.settings.timezone,
  );

  if ((args.sendCustomerConfirmation ?? true) && customerEmail) {
    await scheduleEmail(ctx, {
      orgId: args.org._id,
      customerId: args.customer._id,
      bookingId: args.booking._id,
      type: "booking_confirmation",
      recipientAddress: customerEmail,
      templateData,
      dedupeKey: `customer-confirmation:${args.booking._id}:${customerEmail}`,
    });
  }

  const selectedTeamRecipients = await resolveStaffEmailRecipients(
    ctx,
    args.org._id,
    args.settings.staffEmailRecipientUserIds,
  );
  const assignedStaffRecipient = resolveAssignedStaffEmailRecipient(args.staff);
  const assignedStaffRecipients = assignedStaffRecipient
    ? [assignedStaffRecipient]
    : [];
  const reminderRecipients = uniqueEmailRecipients([
    ...selectedTeamRecipients,
    ...assignedStaffRecipients,
  ]);

  if (args.settings.staffNewBookingEmailEnabled ?? true) {
    const newBookingRecipients = uniqueEmailRecipients([
      ...((args.notifyTeamOfNewBooking ?? true) ? selectedTeamRecipients : []),
      ...((args.notifyAssignedStaffOfNewBooking ?? true)
        ? assignedStaffRecipients
        : []),
    ]);
    for (const recipient of newBookingRecipients) {
      await scheduleEmail(ctx, {
        orgId: args.org._id,
        customerId: args.customer._id,
        bookingId: args.booking._id,
        type: "staff_new_booking",
        recipientAddress: recipient.email,
        templateData: {
          ...templateData,
          recipientName: recipient.name,
        },
        dedupeKey: `staff-new-booking:${args.booking._id}:${recipient.email}`,
      });
    }
  }

  if (!(args.scheduleReminders ?? true)) return;

  if (args.settings.emailEnabled && customerEmail) {
    for (const hoursBefore of normalizeReminderHours(
      args.settings.reminderHoursBefore,
    )) {
      const scheduledFor = appointmentInstant - hoursBefore * 60 * 60 * 1_000;
      if (scheduledFor <= now) continue;
      await scheduleEmail(ctx, {
        orgId: args.org._id,
        customerId: args.customer._id,
        bookingId: args.booking._id,
        type: "booking_reminder",
        recipientAddress: customerEmail,
        templateData: { ...templateData, hoursBefore },
        scheduledFor,
        dedupeKey: `customer-reminder:${args.booking._id}:${hoursBefore}:${customerEmail}`,
      });
    }
  }

  if (args.settings.staffReminderEmailEnabled ?? true) {
    const staffReminderHours = normalizeReminderHours(
      args.settings.staffReminderHoursBefore ??
        args.settings.reminderHoursBefore,
    );
    for (const recipient of reminderRecipients) {
      for (const hoursBefore of staffReminderHours) {
        const scheduledFor = appointmentInstant - hoursBefore * 60 * 60 * 1_000;
        if (scheduledFor <= now) continue;
        await scheduleEmail(ctx, {
          orgId: args.org._id,
          customerId: args.customer._id,
          bookingId: args.booking._id,
          type: "staff_booking_reminder",
          recipientAddress: recipient.email,
          templateData: {
            ...templateData,
            hoursBefore,
            recipientName: recipient.name,
          },
          scheduledFor,
          dedupeKey: `staff-reminder:${args.booking._id}:${hoursBefore}:${recipient.email}`,
        });
      }
    }
  }
}
