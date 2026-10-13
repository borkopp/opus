import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  isHospitalityOrg,
  publicHospitalityOrg,
} from "./lib/hospitalityAccess";
import { getHospitalityReadiness } from "./lib/hospitalityReadiness";
import {
  availability,
  changeReservation,
  createReservation,
  reservationSettings,
} from "./lib/reservationEngine";
import {
  BOOKING_EMAIL_OTP_TTL_MS,
  constantTimeStringEqual,
  decryptBookingOtp,
  encryptBookingOtp,
  generateBookingOtp,
  isValidBookingEmail,
  normalizeBookingEmail,
} from "./lib/bookingEmailSecurity";
import { ensureCurrentOpusUser, getCurrentOpusUser } from "./lib/opusUserAuth";
import {
  createReservationManagementToken,
  hashReservationManagementToken,
  hashReservationOtp,
  reservationManagementUrl,
  validReservationManagementToken,
} from "./lib/reservationGuestSecurity";

const publicFields = {
  slug: v.string(),
  date: v.string(),
  startAt: v.number(),
  partySize: v.number(),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  specialRequests: v.optional(v.string()),
  idempotencyKey: v.string(),
  challengeId: v.optional(v.id("booking_email_verifications")),
  otp: v.optional(v.string()),
};
const proofFields = {
  slug: v.string(),
  reservationId: v.id("reservations"),
  token: v.optional(v.string()),
};
const publicSlot = ({
  startAt,
  endAt,
  label,
  serviceDate,
  timezone,
}: {
  startAt: number;
  endAt: number;
  label: string;
  serviceDate: string;
  timezone: string;
}) => ({ startAt, endAt, label, serviceDate, timezone });

export const isEnabled = query({
  args: {},
  // Retained for older clients. Hospitality is a supported vertical, not an environment feature flag.
  handler: () => true,
});

async function bookingVenue(ctx: QueryCtx, slug: string) {
  const org = await publicHospitalityOrg(ctx, slug);
  if (!(await getHospitalityReadiness(ctx, org)).ready)
    throw new ConvexError(
      "This venue is not currently accepting reservations.",
    );
  return org;
}

export const getVenue = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    try {
      const org = await publicHospitalityOrg(ctx, slug, {
        manageExisting: true,
      });
      if (org.websiteStatus !== "published") return null;
      const settings = await reservationSettings(ctx, org);
      return {
        name: org.name,
        slug: org.slug,
        bio: org.bio,
        address: org.address,
        city: org.city,
        phone: org.phone,
        logoUrl: org.logoUrl,
        timezone: settings.timezone,
        acceptingReservations: (await getHospitalityReadiness(ctx, org)).ready,
        settings: {
          minPartySize: settings.minPartySize,
          maxPartySize: settings.maxPartySize,
          defaultDurationMins: settings.defaultDurationMins,
          bookingWindowDays: settings.bookingWindowDays,
          cancellationWindowHours: settings.cancellationWindowHours,
          servicePeriods: settings.servicePeriods,
        },
      };
    } catch (error) {
      if (error instanceof ConvexError) return null;
      throw error;
    }
  },
});

export const getSlots = query({
  args: { slug: v.string(), date: v.string(), partySize: v.number() },
  handler: async (ctx, args) => {
    try {
      const org = await bookingVenue(ctx, args.slug);
      return (await availability(ctx, org, args.date, args.partySize)).map(
        publicSlot,
      );
    } catch (error) {
      if (error instanceof ConvexError) return [];
      throw error;
    }
  },
});

export const createChallenge = internalMutation({
  args: { slug: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const org = await bookingVenue(ctx, args.slug);
    const email = normalizeBookingEmail(args.email);
    if (!isValidBookingEmail(email))
      throw new ConvexError("Enter a valid email address.");
    const now = Date.now();
    const orgRecent = await ctx.db
      .query("booking_email_verifications")
      .withIndex("by_org", (q) =>
        q.eq("orgId", org._id).gte("_creationTime", now - 300_000),
      )
      .take(30);
    const recent = await ctx.db
      .query("booking_email_verifications")
      .withIndex("by_org_email", (q) =>
        q
          .eq("orgId", org._id)
          .eq("email", email)
          .gte("_creationTime", now - 3_600_000),
      )
      .order("desc")
      .take(5);
    if (orgRecent.length >= 30 || recent.length >= 5)
      throw new ConvexError(
        "Too many verification codes requested. Please try again later.",
      );
    if (recent[0] && recent[0].createdAt + 60_000 > now)
      throw new ConvexError(
        "Please wait before requesting another verification code.",
      );
    for (const challenge of recent)
      if (challenge.status === "pending")
        await ctx.db.patch(challenge._id, {
          status: "superseded",
          updatedAt: now,
        });
    const code = generateBookingOtp();
    const challengeId = await ctx.db.insert("booking_email_verifications", {
      orgId: org._id,
      purpose: "reservation",
      email,
      codeHash: await hashReservationOtp(org._id, email, code),
      attempts: 0,
      status: "pending",
      expiresAt: now + BOOKING_EMAIL_OTP_TTL_MS,
      createdAt: now,
      updatedAt: now,
    });
    const notificationId: Id<"notifications"> = await ctx.runMutation(
      internal.notifications.scheduleNotification,
      {
        orgId: org._id,
        bookingEmailVerificationId: challengeId,
        channel: "email",
        type: "reservation_verification",
        recipientAddress: email,
        templateData: { encryptedCode: await encryptBookingOtp(code) },
        dedupeKey: `reservation-verification:${challengeId}`,
      },
    );
    return {
      challengeId,
      notificationId,
      expiresAt: now + BOOKING_EMAIL_OTP_TTL_MS,
      resendAfter: now + 60_000,
    };
  },
});

export const failedChallenge = internalMutation({
  args: { challengeId: v.id("booking_email_verifications") },
  handler: async (ctx, { challengeId }) => {
    const challenge = await ctx.db.get(challengeId);
    if (challenge?.purpose === "reservation" && challenge.status === "pending")
      await ctx.db.patch(challengeId, {
        status: "delivery_failed",
        updatedAt: Date.now(),
      });
  },
});

export const requestOtp = action({
  args: { slug: v.string(), email: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    challengeId: Id<"booking_email_verifications">;
    expiresAt: number;
    resendAfter: number;
  }> => {
    const challenge = await ctx.runMutation(
      internal.reservationPublic.createChallenge,
      args,
    );
    const status = await ctx.runAction(
      internal.notifications.processIndividualNotification,
      { notificationId: challenge.notificationId },
    );
    if (status !== "sent") {
      await ctx.runMutation(internal.reservationPublic.failedChallenge, {
        challengeId: challenge.challengeId,
      });
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

type Confirmation = {
  reservationId: Id<"reservations">;
  managementToken: string;
  manageUrl: string;
};

export const confirmInternal = internalMutation({
  args: publicFields,
  handler: async (
    ctx,
    args,
  ): Promise<
    { ok: true; result: Confirmation } | { ok: false; error: string }
  > => {
    const org = await publicHospitalityOrg(ctx, args.slug, {
      manageExisting: true,
    });
    const email = normalizeBookingEmail(args.email);
    if (!isValidBookingEmail(email))
      throw new ConvexError("Enter a valid email address.");
    if (!/^[A-Za-z0-9_-]{16,120}$/.test(args.idempotencyKey))
      throw new ConvexError("Invalid reservation request.");
    const existing = await ctx.db
      .query("reservations")
      .withIndex("by_org_request", (q) =>
        q.eq("orgId", org._id).eq("requestId", args.idempotencyKey),
      )
      .unique();
    // An exact, authenticated retry must recover a committed reservation even
    // if publication or new booking acceptance changed after the first reply.
    if (!existing) await bookingVenue(ctx, args.slug);
    const identity = await ctx.auth.getUserIdentity();
    let opusUserId: Id<"opus_users"> | undefined;
    if (identity && !args.challengeId) {
      if (
        identity.emailVerified === false ||
        normalizeBookingEmail(identity.email ?? "") !== email
      )
        throw new ConvexError("Use the email verified by your account.");
      opusUserId = (await ensureCurrentOpusUser(ctx))._id;
    } else {
      const challenge = args.challengeId
        ? await ctx.db.get(args.challengeId)
        : null;
      if (
        !challenge ||
        challenge.purpose !== "reservation" ||
        challenge.orgId !== org._id ||
        challenge.email !== email ||
        !["pending", ...(existing ? ["consumed"] : [])].includes(
          challenge.status,
        )
      )
        return {
          ok: false,
          error: "This verification code can no longer be used.",
        };
      if (challenge.expiresAt <= Date.now()) {
        await ctx.db.patch(challenge._id, {
          status: "expired",
          updatedAt: Date.now(),
        });
        return {
          ok: false,
          error: "The verification code has expired. Request a new code.",
        };
      }
      if (
        !/^\d{6}$/.test(args.otp ?? "") ||
        !constantTimeStringEqual(
          challenge.codeHash,
          await hashReservationOtp(org._id, email, args.otp ?? ""),
        )
      ) {
        const attempts = challenge.attempts + 1;
        await ctx.db.patch(challenge._id, {
          attempts,
          status: attempts >= 5 ? "locked" : challenge.status,
          updatedAt: Date.now(),
        });
        return {
          ok: false,
          error:
            attempts >= 5
              ? "Too many incorrect codes. Request a new code."
              : "The verification code is incorrect.",
        };
      }
    }
    const token = createReservationManagementToken();
    const reservation = await createReservation(
      ctx,
      org,
      {
        requestId: args.idempotencyKey,
        serviceDate: args.date,
        startAt: args.startAt,
        partySize: args.partySize,
        customerName: args.name,
        customerEmail: email,
        customerPhone: args.phone,
        specialRequests: args.specialRequests,
        source: "web",
        opusUserId,
        verifiedEmail: email,
        manageTokenHash: (await hashReservationManagementToken(token))!,
        manageTokenCiphertext: await encryptBookingOtp(token),
        manageTokenExpiresAt: args.startAt + 30 * 86_400_000,
      },
      { type: opusUserId ? "opus_user" : "system", id: opusUserId },
    );
    if (args.challengeId)
      await ctx.db.patch(args.challengeId, {
        status: "consumed",
        consumedAt: Date.now(),
        updatedAt: Date.now(),
      });
    if (
      !reservation.manageTokenHash ||
      !reservation.manageTokenCiphertext ||
      (reservation.manageTokenExpiresAt ?? 0) <= Date.now()
    )
      throw new ConvexError(
        "This reservation link is no longer active. Contact the venue.",
      );
    const managementToken = await decryptBookingOtp(
      reservation.manageTokenCiphertext,
    );
    return {
      ok: true,
      result: {
        reservationId: reservation._id,
        managementToken,
        manageUrl: reservationManagementUrl(
          org.slug,
          reservation._id,
          managementToken,
        ),
      },
    };
  },
});

export const confirm = action({
  args: publicFields,
  handler: async (ctx, args): Promise<Confirmation> => {
    const result = await ctx.runMutation(
      internal.reservationPublic.confirmInternal,
      args,
    );
    if (!result.ok) throw new ConvexError(result.error);
    return result.result;
  },
});

async function managed(
  ctx: QueryCtx,
  args: { slug: string; reservationId: Id<"reservations">; token?: string },
) {
  const org = await publicHospitalityOrg(ctx, args.slug, {
    manageExisting: true,
  });
  const reservation = await ctx.db.get(args.reservationId);
  if (
    !reservation ||
    reservation.orgId !== org._id ||
    reservation.isDeleted ||
    reservation.schemaVersion !== 2 ||
    reservation.revision === undefined
  )
    throw new ConvexError("Reservation not found.");
  const account = await getCurrentOpusUser(ctx);
  const owns = Boolean(
    account &&
    account.identity.emailVerified !== false &&
    reservation.opusUserId === account.user._id,
  );
  const proof = await validReservationManagementToken(reservation, args.token);
  if (!owns && !proof)
    throw new ConvexError("This reservation link is invalid or expired.");
  return { org, reservation, account: owns ? account : null, proof };
}

async function projection(
  ctx: QueryCtx,
  org: Doc<"orgs">,
  reservation: Doc<"reservations">,
  proof = false,
) {
  const customer = await ctx.db.get(reservation.customerId);
  if (!customer || customer.orgId !== org._id || customer.isDeleted)
    throw new ConvexError("Reservation not found.");
  const settings = await reservationSettings(ctx, org);
  const changeable =
    reservation.status === "confirmed" &&
    !reservation.arrivedAt &&
    reservation.startAt - Date.now() >=
      settings.cancellationWindowHours * 3_600_000;
  return {
    venue: {
      name: org.name,
      slug: org.slug,
      address: org.address,
      city: org.city,
      phone: org.phone,
      timezone: reservation.timezone ?? settings.timezone,
    },
    reservation: {
      id: reservation._id,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      serviceDate: reservation.serviceDate!,
      partySize: reservation.partySize,
      name: reservation.guestName ?? customer.name,
      status: reservation.status,
      revision: reservation.revision!,
      specialRequests: reservation.specialRequests,
    },
    canCancel: changeable,
    canReschedule: changeable,
    canClaim: proof && !reservation.opusUserId,
  };
}

export const getManaged = query({
  args: {
    slug: v.string(),
    reservationId: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reservationId = ctx.db.normalizeId(
      "reservations",
      args.reservationId,
    );
    if (!reservationId) return null;
    try {
      const access = await managed(ctx, { ...args, reservationId });
      return await projection(
        ctx,
        access.org,
        access.reservation,
        access.proof,
      );
    } catch (error) {
      if (error instanceof ConvexError) return null;
      throw error;
    }
  },
});

export const managedSlots = query({
  args: { ...proofFields, date: v.string(), partySize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
      const { org, reservation } = await managed(ctx, args);
      if (!(await projection(ctx, org, reservation)).canReschedule) return [];
      return (
        await availability(
          ctx,
          org,
          args.date,
          args.partySize ?? reservation.partySize,
          {
            excludeReservationId: reservation._id,
            durationMins: reservation.durationMins,
            manageExisting: true,
          },
        )
      ).map(publicSlot);
    } catch (error) {
      if (error instanceof ConvexError) return [];
      throw error;
    }
  },
});

export const cancel = mutation({
  args: {
    ...proofFields,
    expectedRevision: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org, reservation, account } = await managed(ctx, args);
    const updated = await changeReservation(
      ctx,
      org,
      reservation._id,
      {
        action: "cancel",
        expectedRevision: args.expectedRevision,
        reason: args.reason,
      },
      { type: account ? "opus_user" : "system", id: account?.user._id },
    );
    return {
      reservationId: updated._id,
      revision: updated.revision!,
      status: updated.status,
    };
  },
});

export const reschedule = mutation({
  args: {
    ...proofFields,
    expectedRevision: v.number(),
    date: v.string(),
    startAt: v.number(),
    partySize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { org, reservation, account } = await managed(ctx, args);
    const updated = await changeReservation(
      ctx,
      org,
      reservation._id,
      {
        action: "reschedule",
        expectedRevision: args.expectedRevision,
        serviceDate: args.date,
        startAt: args.startAt,
        partySize: args.partySize,
      },
      { type: account ? "opus_user" : "system", id: account?.user._id },
    );
    return {
      reservationId: updated._id,
      revision: updated.revision!,
      status: updated.status,
    };
  },
});

export const claim = mutation({
  args: {
    slug: v.string(),
    reservationId: v.id("reservations"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { org, reservation, proof } = await managed(ctx, args);
    if (!proof) throw new ConvexError("A valid reservation link is required.");
    const user = await ensureCurrentOpusUser(ctx);
    if (
      !reservation.verifiedEmail ||
      normalizeBookingEmail(user.email) !==
        normalizeBookingEmail(reservation.verifiedEmail) ||
      (reservation.opusUserId && reservation.opusUserId !== user._id)
    )
      throw new ConvexError(
        "Sign in with the email verified for this reservation.",
      );
    const customer = await ctx.db.get(reservation.customerId);
    if (
      !customer ||
      customer.orgId !== org._id ||
      customer.isDeleted ||
      (customer.opusUserId && customer.opusUserId !== user._id)
    )
      throw new ConvexError(
        "This reservation cannot be linked to this account.",
      );
    if (reservation.opusUserId !== user._id) {
      await ctx.db.patch(reservation._id, {
        opusUserId: user._id,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(customer._id, {
        opusUserId: user._id,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("audit_log", {
        orgId: org._id,
        actorType: "opus_user",
        actorId: user._id,
        action: "reservation.account_claimed",
        resourceType: "reservations",
        resourceId: reservation._id,
        createdAt: Date.now(),
      });
    }
    return { reservationId: reservation._id };
  },
});

export const revokeManagementLink = mutation({
  args: proofFields,
  handler: async (ctx, args) => {
    const { org, reservation, account } = await managed(ctx, args);
    // Revocation requires the linked account, so an old email link cannot lock
    // the guest out of all future management.
    if (!account)
      throw new ConvexError(
        "Link this reservation to your account before revoking its email link.",
      );
    await ctx.db.patch(reservation._id, {
      manageTokenHash: undefined,
      manageTokenCiphertext: undefined,
      manageTokenExpiresAt: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "opus_user",
      actorId: account.user._id,
      action: "reservation.management_link_revoked",
      resourceType: "reservations",
      resourceId: reservation._id,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const current = await getCurrentOpusUser(ctx);
    if (!current || current.identity.emailVerified === false) return [];
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_opus_user", (q) => q.eq("opusUserId", current.user._id))
      .collect();
    const result: Awaited<ReturnType<typeof projection>>[] = [];
    for (const orgId of new Set(
      customers
        .filter((customer) => !customer.isDeleted)
        .map((customer) => customer.orgId),
    )) {
      const org = await ctx.db.get(orgId);
      if (!org || !isHospitalityOrg(org)) continue;
      const reservations = await ctx.db
        .query("reservations")
        .withIndex("by_org_opus_user_start", (q) =>
          q.eq("orgId", orgId).eq("opusUserId", current.user._id),
        )
        .order("desc")
        .take(100);
      for (const reservation of reservations)
        if (!reservation.isDeleted && reservation.schemaVersion === 2) {
          try {
            result.push(await projection(ctx, org, reservation));
          } catch (error) {
            // An erased guest or unavailable venue must not hide other account
            // reservations. Unexpected backend failures should still surface.
            if (!(error instanceof ConvexError)) throw error;
          }
        }
    }
    return result.sort(
      (first, second) => second.reservation.startAt - first.reservation.startAt,
    );
  },
});
