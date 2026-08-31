import { v, ConvexError } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { computeSlotsForDate } from "./slots";
import { isActiveIndustry } from "./lib/productScope";
import { ensureCurrentOpusUser } from "./lib/opusUserAuth";
import { acceptsPublicBookings } from "./lib/publication";
import { isWithinPublicBookingWindow } from "./lib/publicBookingRules";
import { operationalSettingsError } from "./lib/orgSettingsValidation";
import {
  constantTimeStringEqual,
  encryptBookingOtp,
  generateBookingOtp,
  hashBookingOtp,
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./lib/bookingEmailSecurity";
import { queueBookingEmailNotifications } from "./lib/bookingEmailNotifications";

const PUBLIC_BOOKING_ORG_LIMIT = 12;
const PUBLIC_BOOKING_ORG_WINDOW_MS = 5 * 60 * 1_000;
const PUBLIC_BOOKING_CUSTOMER_LIMIT = 3;
const PUBLIC_BOOKING_CUSTOMER_WINDOW_MS = 10 * 60 * 1_000;
const BOOKING_OTP_TTL_MS = 10 * 60 * 1_000;
const BOOKING_OTP_RESEND_COOLDOWN_MS = 60 * 1_000;
const BOOKING_OTP_RATE_WINDOW_MS = 60 * 60 * 1_000;
const BOOKING_OTP_RATE_LIMIT = 5;
const BOOKING_OTP_ORG_RATE_WINDOW_MS = 5 * 60 * 1_000;
const BOOKING_OTP_ORG_RATE_LIMIT = 30;
const BOOKING_OTP_MAX_ATTEMPTS = 5;

type PublicBookingInput = {
  orgId: Id<"orgs">;
  serviceId: Id<"services">;
  staffId: Id<"staff_members">;
  startAt: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
};

type PublicBookingResult = {
  bookingId: Id<"bookings">;
  serviceName: string;
  staffName: string;
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
  currency: string;
};

const publicBookingArgs = {
  orgId: v.id("orgs"),
  serviceId: v.id("services"),
  staffId: v.id("staff_members"),
  startAt: v.number(),
  customerName: v.string(),
  customerPhone: v.string(),
  customerEmail: v.optional(v.string()),
  customerNote: v.optional(v.string()),
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC BOOKING — published OPUS websites and the legacy marketplace
// ─────────────────────────────────────────────────────────────────────────────
//
// Tenant-site guests verify their email before this atomic booking write.
// Signed-in legacy consumers may use the compatibility mutation below because
// their Better Auth email has already been verified.
// ─────────────────────────────────────────────────────────────────────────────

async function createPublicBookingRecord(
  ctx: MutationCtx,
  args: PublicBookingInput,
  opusUserId?: Id<"opus_users">,
): Promise<PublicBookingResult> {
  // ── Validate org accepts bookings on a published public surface ──
  const org = await ctx.db.get(args.orgId);
  if (
    !org ||
    org.isDeleted ||
    !acceptsPublicBookings(org) ||
    !isActiveIndustry(org.industry)
  ) {
    throw new ConvexError("This business is not currently accepting bookings.");
  }

  // ── Validate service ──
  const service = await ctx.db.get(args.serviceId);
  if (
    !service ||
    service.orgId !== args.orgId ||
    service.isDeleted ||
    !service.isActive ||
    !service.isOpusVisible
  ) {
    throw new ConvexError("Service not available.");
  }

  // ── Validate staff ──
  const staff = await ctx.db.get(args.staffId);
  if (
    !staff ||
    staff.orgId !== args.orgId ||
    staff.isDeleted ||
    !staff.isActive
  ) {
    throw new ConvexError("Staff member not available.");
  }

  if (!service.staffIds.includes(args.staffId)) {
    throw new ConvexError("This staff member cannot perform this service.");
  }

  // ── Validate and normalize guest details ──
  const customerName = args.customerName.trim();
  if (customerName.length < 2 || customerName.length > 100) {
    throw new ConvexError(
      "Enter a customer name between 2 and 100 characters.",
    );
  }
  const normalizedPhone = args.customerPhone.replace(/[^\d+]/g, "");
  if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
    throw new ConvexError("Enter a valid phone number.");
  }
  const customerEmail = args.customerEmail
    ? normalizeBookingEmail(args.customerEmail)
    : undefined;
  if (customerEmail && !isValidBookingEmail(customerEmail)) {
    throw new ConvexError("Enter a valid email address.");
  }
  const customerNote = args.customerNote?.trim() || undefined;
  if (customerNote && customerNote.length > 1_000) {
    throw new ConvexError("Booking notes must be 1,000 characters or fewer.");
  }

  const matchingPhoneCustomers = await ctx.db
    .query("customers")
    .withIndex("by_org_phone", (q) =>
      q.eq("orgId", args.orgId).eq("phone", normalizedPhone),
    )
    .collect();
  const phoneCustomer = matchingPhoneCustomers.find((item) => !item.isDeleted);
  const matchingEmailCustomers = customerEmail
    ? await ctx.db
        .query("customers")
        .withIndex("by_org_email", (q) =>
          q.eq("orgId", args.orgId).eq("email", customerEmail),
        )
        .collect()
    : [];
  const emailCustomer = matchingEmailCustomers.find((item) => !item.isDeleted);

  if (
    phoneCustomer &&
    emailCustomer &&
    phoneCustomer._id !== emailCustomer._id
  ) {
    throw new ConvexError(
      "The email and phone number belong to different customer records.",
    );
  }
  if (
    phoneCustomer?.email &&
    customerEmail &&
    phoneCustomer.email.toLowerCase() !== customerEmail
  ) {
    throw new ConvexError(
      "The email and phone number belong to different customer records.",
    );
  }
  const customer = emailCustomer ?? phoneCustomer;

  if (
    opusUserId &&
    customer?.opusUserId &&
    customer.opusUserId !== opusUserId
  ) {
    throw new ConvexError("This phone number is linked to another account.");
  }

  // Convex mutations are serialized, so these limits and the eventual insert
  // are evaluated atomically even when several public requests arrive at once.
  const requestTime = Date.now();
  const recentOrgBookings = await ctx.db
    .query("bookings")
    .withIndex("by_org", (q) =>
      q
        .eq("orgId", args.orgId)
        .gte("_creationTime", requestTime - PUBLIC_BOOKING_ORG_WINDOW_MS),
    )
    .collect();
  const recentPublicBookingCount = recentOrgBookings.filter(
    (booking) => booking.source === "web" || booking.source === "opus_web",
  ).length;
  if (recentPublicBookingCount >= PUBLIC_BOOKING_ORG_LIMIT) {
    throw new ConvexError(
      "Too many booking attempts. Please wait a few minutes and try again.",
    );
  }

  if (customer) {
    const recentCustomerBookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) =>
        q
          .eq("customerId", customer._id)
          .gte(
            "_creationTime",
            requestTime - PUBLIC_BOOKING_CUSTOMER_WINDOW_MS,
          ),
      )
      .collect();
    const recentCustomerPublicBookingCount = recentCustomerBookings.filter(
      (booking) => booking.source === "web" || booking.source === "opus_web",
    ).length;
    if (recentCustomerPublicBookingCount >= PUBLIC_BOOKING_CUSTOMER_LIMIT) {
      throw new ConvexError(
        "Too many booking attempts. Please wait a few minutes and try again.",
      );
    }
  }

  const bookingStart = new Date(args.startAt);
  if (!Number.isInteger(args.startAt) || Number.isNaN(bookingStart.getTime())) {
    throw new ConvexError("Booking time is invalid.");
  }

  // ── Org settings and public booking window ──
  const orgSettings = await ctx.db
    .query("org_settings")
    .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
    .first();
  if (!orgSettings || operationalSettingsError(orgSettings)) {
    throw new ConvexError("Organization settings are not available.");
  }

  const bookingDate = bookingStart.toISOString().slice(0, 10);
  if (
    !isWithinPublicBookingWindow(
      bookingDate,
      orgSettings.timezone || "Europe/Belgrade",
      orgSettings.bookingWindowDays,
    )
  ) {
    throw new ConvexError(
      "Booking date is outside the allowed booking window.",
    );
  }

  const availableSlots = await computeSlotsForDate(
    ctx,
    args.orgId,
    args.staffId,
    args.serviceId,
    bookingDate,
  );
  if (!availableSlots.some((slot) => slot.startAt === args.startAt)) {
    throw new ConvexError(
      "This time slot is outside working hours or no longer available.",
    );
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: orgSettings.timezone || "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  let year, month, day, hour, minute, second;
  for (const p of parts) {
    if (p.type === "year") year = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
    if (p.type === "second") second = p.value;
  }
  const pseudoUtcNow = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
  ).getTime();

  // ── Validate time ──
  if (args.startAt <= pseudoUtcNow) {
    throw new ConvexError("Booking time must be in the future.");
  }

  // ── Conflict check ──
  const endAt = args.startAt + service.durationMins * 60 * 1000;
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
    const existingEnd = b.endAt + bufferMs;
    return b.startAt < endAt && existingEnd > args.startAt;
  });

  if (conflict) {
    throw new ConvexError(
      "This time slot is no longer available. Please choose another.",
    );
  }

  // ── Customer upsert by verified email / phone ──
  let customerId;
  if (customer && !customer.isDeleted) {
    customerId = customer._id;
    await ctx.db.patch(customerId, {
      name: customerName,
      phone: normalizedPhone,
      ...(customerEmail ? { email: customerEmail } : {}),
      updatedAt: Date.now(),
    });
  } else {
    customerId = await ctx.db.insert("customers", {
      orgId: args.orgId,
      name: customerName,
      phone: normalizedPhone,
      email: customerEmail,
      opusUserId,
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  // If opusUserId is provided, also link it to existing customer
  if (opusUserId && customer && !customer.opusUserId) {
    await ctx.db.patch(customerId, { opusUserId, updatedAt: Date.now() });
  }

  // ── Surge pricing snapshot ──
  let priceMinorUnits = service.priceMinorUnits;
  let surgePriceApplied = false;
  let surgeMultiplierPct: number | undefined = undefined;

  if (orgSettings.surgePricingEnabled && orgSettings.surgeRules?.length) {
    const d = new Date(args.startAt);
    const dayOfWeek = d.getUTCDay();
    const timeStr = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

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

  // ── Insert booking ──
  const bookingId = await ctx.db.insert("bookings", {
    orgId: args.orgId,
    staffId: args.staffId,
    serviceId: args.serviceId,
    customerId,
    opusUserId,
    startAt: args.startAt,
    endAt,
    priceMinorUnits,
    currency: service.currency,
    surgePriceApplied,
    surgeMultiplierPct,
    customerNote,
    status: "confirmed",
    source: opusUserId ? "opus_web" : "web",
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // ── Audit log ──
  await ctx.db.insert("audit_log", {
    orgId: args.orgId,
    actorType: "user",
    actorId: opusUserId ?? "public-booking",
    action: "booking.created",
    resourceType: "bookings",
    resourceId: bookingId,
    after: {
      staffId: args.staffId,
      customerId,
      startAt: args.startAt,
      priceMinorUnits,
      status: "confirmed",
      source: opusUserId ? "opus_web" : "web",
    },
    createdAt: Date.now(),
  });

  const [booking, bookingCustomer] = await Promise.all([
    ctx.db.get(bookingId),
    ctx.db.get(customerId),
  ]);
  if (!booking || !bookingCustomer) {
    throw new Error("Created booking email context was not found.");
  }
  await queueBookingEmailNotifications(ctx, {
    org,
    settings: orgSettings,
    booking,
    customer: bookingCustomer,
    service,
    staff,
    sendCustomerConfirmation: true,
    notifyTeamOfNewBooking: true,
    scheduleReminders: true,
  });

  // ── Dashboard notification — shows in navbar bell for the business owner ──
  const startDate = new Date(args.startAt);
  const timeLabel = `${String(startDate.getUTCHours()).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")}`;
  await ctx.runMutation(internal.dashboardNotifications.create, {
    orgId: args.orgId,
    type: "new_booking",
    title: "New Booking",
    body: `${customerName} booked ${service.name} with ${staff.displayName} at ${timeLabel}`,
    bookingId,
    customerId,
  });

  return {
    bookingId,
    serviceName: service.name,
    staffName: staff.displayName,
    startAt: args.startAt,
    endAt,
    priceMinorUnits,
    currency: service.currency,
  };
}

/**
 * Compatibility path for already-authenticated consumers. An unauthenticated
 * tenant-site visitor cannot call this mutation to bypass booking verification.
 */
export const createPublicBooking = mutation({
  args: publicBookingArgs,
  handler: async (ctx, args): Promise<PublicBookingResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new ConvexError("Verify your email before booking.");
    }
    const opusUser = await ensureCurrentOpusUser(ctx);
    return await createPublicBookingRecord(
      ctx,
      {
        ...args,
        customerEmail: normalizeBookingEmail(identity.email),
      },
      opusUser._id,
    );
  },
});

export const createBookingEmailChallenge = internalMutation({
  args: {
    orgId: v.id("orgs"),
    email: v.string(),
    codeHash: v.string(),
    encryptedCode: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    challengeId: Id<"booking_email_verifications">;
    notificationId: Id<"notifications">;
    expiresAt: number;
    resendAfter: number;
  }> => {
    const email = normalizeBookingEmail(args.email);
    if (!isValidBookingEmail(email)) {
      throw new ConvexError("Enter a valid email address.");
    }

    const org = await ctx.db.get(args.orgId);
    if (
      !org ||
      org.isDeleted ||
      !acceptsPublicBookings(org) ||
      !isActiveIndustry(org.industry)
    ) {
      throw new ConvexError(
        "This business is not currently accepting bookings.",
      );
    }
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (query) => query.eq("orgId", args.orgId))
      .first();
    if (!settings || operationalSettingsError(settings)) {
      throw new ConvexError("Organization settings are not available.");
    }

    const now = Date.now();
    const recentOrgChallenges = await ctx.db
      .query("booking_email_verifications")
      .withIndex("by_org", (query) =>
        query
          .eq("orgId", args.orgId)
          .gte("_creationTime", now - BOOKING_OTP_ORG_RATE_WINDOW_MS),
      )
      .collect();
    if (recentOrgChallenges.length >= BOOKING_OTP_ORG_RATE_LIMIT) {
      throw new ConvexError(
        "Too many verification codes requested. Please try again later.",
      );
    }
    const recentChallenges = await ctx.db
      .query("booking_email_verifications")
      .withIndex("by_org_email", (query) =>
        query
          .eq("orgId", args.orgId)
          .eq("email", email)
          .gte("_creationTime", now - BOOKING_OTP_RATE_WINDOW_MS),
      )
      .collect();
    if (recentChallenges.length >= BOOKING_OTP_RATE_LIMIT) {
      throw new ConvexError(
        "Too many verification codes requested. Please try again later.",
      );
    }
    const newestPending = recentChallenges
      .filter((challenge) => challenge.status === "pending")
      .sort((first, second) => second.createdAt - first.createdAt)[0];
    if (
      newestPending &&
      newestPending.createdAt + BOOKING_OTP_RESEND_COOLDOWN_MS > now
    ) {
      throw new ConvexError(
        "Please wait before requesting another verification code.",
      );
    }

    for (const challenge of recentChallenges) {
      if (challenge.status === "pending") {
        await ctx.db.patch(challenge._id, {
          status: "superseded",
          updatedAt: now,
        });
      }
    }

    const expiresAt = now + BOOKING_OTP_TTL_MS;
    const challengeId = await ctx.db.insert("booking_email_verifications", {
      orgId: args.orgId,
      email,
      codeHash: args.codeHash,
      attempts: 0,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    const notificationId: Id<"notifications"> = await ctx.runMutation(
      internal.notifications.scheduleNotification,
      {
        orgId: args.orgId,
        bookingEmailVerificationId: challengeId,
        channel: "email",
        type: "booking_verification",
        recipientAddress: email,
        templateData: {
          encryptedCode: args.encryptedCode,
          studioName: org.name,
          locale: settings.locale,
        },
        dedupeKey: `booking-verification:${challengeId}`,
      },
    );
    return {
      challengeId,
      notificationId,
      expiresAt,
      resendAfter: now + BOOKING_OTP_RESEND_COOLDOWN_MS,
    };
  },
});

export const markBookingEmailChallengeDeliveryFailed = internalMutation({
  args: { challengeId: v.id("booking_email_verifications") },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.status !== "pending") return;
    await ctx.db.patch(args.challengeId, {
      status: "delivery_failed",
      updatedAt: Date.now(),
    });
  },
});

export const requestBookingEmailOtp = action({
  args: {
    orgId: v.id("orgs"),
    email: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    challengeId: Id<"booking_email_verifications">;
    expiresAt: number;
    resendAfter: number;
  }> => {
    const email = normalizeBookingEmail(args.email);
    if (!isValidBookingEmail(email)) {
      throw new ConvexError("Enter a valid email address.");
    }
    const code = generateBookingOtp();
    const [codeHash, encryptedCode] = await Promise.all([
      hashBookingOtp(email, code),
      encryptBookingOtp(code),
    ]);
    const challenge: {
      challengeId: Id<"booking_email_verifications">;
      notificationId: Id<"notifications">;
      expiresAt: number;
      resendAfter: number;
    } = await ctx.runMutation(
      internal.publicBooking.createBookingEmailChallenge,
      {
        orgId: args.orgId,
        email,
        codeHash,
        encryptedCode,
      },
    );
    const deliveryStatus = await ctx.runAction(
      internal.notifications.processIndividualNotification,
      { notificationId: challenge.notificationId },
    );
    if (deliveryStatus !== "sent") {
      await ctx.runMutation(
        internal.publicBooking.markBookingEmailChallengeDeliveryFailed,
        { challengeId: challenge.challengeId },
      );
      throw new ConvexError(
        "Verification email could not be sent. Please try again.",
      );
    }
    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
      resendAfter: challenge.resendAfter,
    };
  },
});

type BookingOtpFailureReason = "expired" | "invalid" | "locked" | "inactive";

export const createVerifiedPublicBooking = internalMutation({
  args: {
    ...publicBookingArgs,
    customerEmail: v.string(),
    challengeId: v.id("booking_email_verifications"),
    otpHash: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { ok: true; booking: PublicBookingResult }
    | { ok: false; reason: BookingOtpFailureReason }
  > => {
    const challenge = await ctx.db.get(args.challengeId);
    const email = normalizeBookingEmail(args.customerEmail);
    if (
      !challenge ||
      challenge.orgId !== args.orgId ||
      challenge.email !== email ||
      challenge.status === "superseded" ||
      challenge.status === "delivery_failed" ||
      challenge.status === "consumed"
    ) {
      return { ok: false, reason: "inactive" };
    }
    if (challenge.status === "locked") {
      return { ok: false, reason: "locked" };
    }
    if (challenge.status === "expired" || challenge.expiresAt <= Date.now()) {
      await ctx.db.patch(args.challengeId, {
        status: "expired",
        updatedAt: Date.now(),
      });
      return { ok: false, reason: "expired" };
    }
    if (!constantTimeStringEqual(challenge.codeHash, args.otpHash)) {
      const attempts = challenge.attempts + 1;
      await ctx.db.patch(args.challengeId, {
        attempts,
        status: attempts >= BOOKING_OTP_MAX_ATTEMPTS ? "locked" : "pending",
        updatedAt: Date.now(),
      });
      return {
        ok: false,
        reason: attempts >= BOOKING_OTP_MAX_ATTEMPTS ? "locked" : "invalid",
      };
    }

    const booking = await createPublicBookingRecord(ctx, {
      orgId: args.orgId,
      serviceId: args.serviceId,
      staffId: args.staffId,
      startAt: args.startAt,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: email,
      customerNote: args.customerNote,
    });
    await ctx.db.patch(args.challengeId, {
      status: "consumed",
      consumedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true, booking };
  },
});

export const confirmPublicBooking = action({
  args: {
    ...publicBookingArgs,
    customerEmail: v.string(),
    challengeId: v.id("booking_email_verifications"),
    otp: v.string(),
  },
  handler: async (ctx, args): Promise<PublicBookingResult> => {
    const email = normalizeBookingEmail(args.customerEmail);
    if (!isValidBookingEmail(email)) {
      throw new ConvexError("Enter a valid email address.");
    }
    if (!/^\d{6}$/.test(args.otp)) {
      throw new ConvexError("Enter the six-digit verification code.");
    }
    const result = await ctx.runMutation(
      internal.publicBooking.createVerifiedPublicBooking,
      {
        orgId: args.orgId,
        serviceId: args.serviceId,
        staffId: args.staffId,
        startAt: args.startAt,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerEmail: email,
        customerNote: args.customerNote,
        challengeId: args.challengeId,
        otpHash: await hashBookingOtp(email, args.otp),
      },
    );
    if (result.ok) return result.booking;

    const errors: Record<BookingOtpFailureReason, string> = {
      expired: "The verification code has expired. Request a new code.",
      invalid: "The verification code is incorrect.",
      locked: "Too many incorrect codes. Request a new code.",
      inactive: "This verification code can no longer be used.",
    };
    throw new ConvexError(errors[result.reason]);
  },
});

// ─── Public availability — wired to real slot engine ───
export const getPublicSlots = query({
  args: {
    orgId: v.id("orgs"),
    serviceId: v.id("services"),
    staffId: v.union(v.id("staff_members"), v.literal("any")),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Verify a public booking surface is published.
    const org = await ctx.db.get(args.orgId);
    if (
      !org ||
      org.isDeleted ||
      !acceptsPublicBookings(org) ||
      !isActiveIndustry(org.industry)
    )
      return [];

    // Verify service is publicly visible
    const service = await ctx.db.get(args.serviceId);
    if (
      !service ||
      service.orgId !== args.orgId ||
      service.isDeleted ||
      !service.isActive ||
      !service.isOpusVisible
    )
      return [];

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (
      !settings ||
      Boolean(operationalSettingsError(settings)) ||
      !isWithinPublicBookingWindow(
        args.date,
        settings.timezone || "Europe/Belgrade",
        settings.bookingWindowDays,
      )
    ) {
      return [];
    }

    return await computeSlotsForDate(
      ctx,
      args.orgId,
      args.staffId,
      args.serviceId,
      args.date,
    );
  },
});

// ─── Public available dates for a month ───
export const getPublicAvailableDates = query({
  args: {
    orgId: v.id("orgs"),
    serviceId: v.id("services"),
    staffId: v.union(v.id("staff_members"), v.literal("any")),
    month: v.string(), // "YYYY-MM"
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (
      !org ||
      org.isDeleted ||
      !acceptsPublicBookings(org) ||
      !isActiveIndustry(org.industry)
    )
      return [];

    const service = await ctx.db.get(args.serviceId);
    if (
      !service ||
      service.orgId !== args.orgId ||
      service.isDeleted ||
      !service.isActive ||
      !service.isOpusVisible
    )
      return [];

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (
      !settings ||
      operationalSettingsError(settings) ||
      !/^\d{4}-\d{2}$/.test(args.month)
    )
      return [];

    const [year, m] = args.month.split("-").map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(m) || m < 1 || m > 12) {
      return [];
    }
    const daysInMonth = new Date(Date.UTC(year, m, 0)).getDate();

    const promises = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (
        !isWithinPublicBookingWindow(
          dateStr,
          settings.timezone || "Europe/Belgrade",
          settings.bookingWindowDays,
        )
      ) {
        continue;
      }
      promises.push(
        computeSlotsForDate(
          ctx,
          args.orgId,
          args.staffId,
          args.serviceId,
          dateStr,
        )
          .then((slots) => ({ date: dateStr, hasSlots: slots.length > 0 }))
          .catch(() => ({ date: dateStr, hasSlots: false })),
      );
    }

    const results = await Promise.all(promises);
    return results.filter((r) => r.hasSlots).map((r) => r.date);
  },
});
