import { v, ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import {
  hashClientClaimToken,
  requireClientAccounts,
} from "./lib/clientAccounts";
import {
  constantTimeStringEqual,
  normalizeBookingEmail,
} from "./lib/bookingEmailSecurity";
import { wallClockNow } from "./lib/bookingTime";
import { isActiveIndustry } from "./lib/productScope";
import { cancelBookingRecord } from "./lib/bookingCancellation";
import {
  isValidPublicBookingPhone,
  normalizePublicBookingPhone,
} from "../lib/public-booking-phone";
import { mutation, query } from "./_generated/server";
import {
  ensureCurrentOpusUser,
  getCurrentOpusUser,
  requireCurrentOpusUser,
} from "./lib/opusUserAuth";

// ─────────────────────────────────────────────────────
// opus_users — platform-wide end-consumer identity
// Client profile for the central account area and retained consumer foundations.
// The same auth identity may separately have studio memberships.
// Identity is derived server-side from ctx.auth (Better Auth); legacy clerkId
// data is retained only for one-time email-based account relinking.
// ─────────────────────────────────────────────────────

// ─── Upsert: create or return existing opus user ─────
// Called on client sign-in or at booking time. All identity
// and profile fields come from ctx.auth.
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ensureCurrentOpusUser(ctx);
    return user._id;
  },
});

// ─── Get current signed-in consumer ─────────────────
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const current = await getCurrentOpusUser(ctx);
    return current?.user ?? null;
  },
});

// ─── Update preferences ──────────────────────────────
export const updatePreferences = mutation({
  args: {
    preferredCity: v.optional(v.string()),
    preferredChannel: v.optional(
      v.union(v.literal("whatsapp"), v.literal("sms"), v.literal("email")),
    ),
    marketingOptIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentOpusUser(ctx);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.preferredCity !== undefined)
      patch.preferredCity = args.preferredCity;
    if (args.preferredChannel !== undefined)
      patch.preferredChannel = args.preferredChannel;
    if (args.marketingOptIn !== undefined)
      patch.marketingOptIn = args.marketingOptIn;

    await ctx.db.patch(user._id, patch);
  },
});

async function ownAppointments(ctx: QueryCtx) {
  const current = await getCurrentOpusUser(ctx);
  if (!current) return [];
  // Only the authenticated person's relationship roots are global. Every booking read is org-scoped.
  const links = await ctx.db
    .query("customers")
    .withIndex("by_opus_user", (q) => q.eq("opusUserId", current.user._id))
    .collect();
  const orgIds = [
    ...new Set(
      links.filter((link) => !link.isDeleted).map((link) => link.orgId),
    ),
  ];
  const groups = await Promise.all(
    orgIds.map(async (orgId) => {
      const [org, settings, bookings] = await Promise.all([
        ctx.db.get(orgId),
        ctx.db
          .query("org_settings")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .first(),
        ctx.db
          .query("bookings")
          .withIndex("by_org_opus_user_start", (q) =>
            q.eq("orgId", orgId).eq("opusUserId", current.user._id),
          )
          .order("desc")
          .collect(),
      ]);
      if (!org || org.isDeleted || !isActiveIndustry(org.industry)) return [];
      const now = wallClockNow(settings?.timezone ?? "Europe/Skopje");
      return Promise.all(
        bookings
          .filter((booking) => !booking.isDeleted)
          .map(async (booking) => {
            const [service, staff, review] = await Promise.all([
              ctx.db.get(booking.serviceId),
              ctx.db.get(booking.staffId),
              ctx.db
                .query("reviews")
                .withIndex("by_org_booking", (q) =>
                  q.eq("orgId", orgId).eq("bookingId", booking._id),
                )
                .first(),
            ]);
            return {
              _id: booking._id,
              orgId,
              customerId: booking.customerId,
              opusUserId: current.user._id,
              createdAt: booking.createdAt,
              orgName: org.name,
              orgSlug: org.slug,
              orgLogoUrl: org.logoUrl,
              serviceName:
                service?.orgId === orgId ? service.name : "Appointment",
              staffName: staff?.orgId === orgId ? staff.displayName : "",
              serviceDurationMins:
                service?.orgId === orgId ? service.durationMins : 0,
              hasReview: Boolean(
                review &&
                !review.isDeleted &&
                review.opusUserId === current.user._id,
              ),
              startAt: booking.startAt,
              endAt: booking.endAt,
              status: booking.status,
              priceMinorUnits: booking.priceMinorUnits,
              currency: booking.currency,
              canCancel: Boolean(
                settings &&
                booking.status === "confirmed" &&
                booking.startAt - now >=
                  settings.cancellationWindowHours * 3_600_000,
              ),
              cancellationWindowHours: settings?.cancellationWindowHours ?? 24,
              isUpcoming:
                booking.endAt > now &&
                ["confirmed", "checked_in"].includes(booking.status),
            };
          }),
      );
    }),
  );
  return groups.flat().sort((a, b) => b.startAt - a.startAt);
}

export const getMyBookings = query({ args: {}, handler: ownAppointments });

export const updateProfile = mutation({
  args: { name: v.string(), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentOpusUser(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 100)
      throw new ConvexError("Enter a name between 2 and 100 characters.");
    const phone = args.phone?.trim()
      ? normalizePublicBookingPhone(args.phone)
      : undefined;
    if (phone && !isValidPublicBookingPhone(phone))
      throw new ConvexError("Enter a valid phone number.");
    await ctx.db.patch(user._id, { name, phone, updatedAt: Date.now() });
    return null;
  },
});

export const claimBooking = mutation({
  args: { bookingId: v.id("bookings"), token: v.string() },
  handler: async (ctx, { bookingId, token }) => {
    const user = await ensureCurrentOpusUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking || booking.isDeleted)
      throw new ConvexError("This appointment link is unavailable.");
    if (booking.opusUserId === user._id) return true;
    await requireClientAccounts(ctx, booking.orgId);
    const hash = await hashClientClaimToken(token);
    if (
      !hash ||
      !booking.clientClaimTokenHash ||
      !constantTimeStringEqual(hash, booking.clientClaimTokenHash) ||
      !booking.clientClaimTokenExpiresAt ||
      booking.clientClaimTokenExpiresAt <= Date.now() ||
      !booking.clientVerifiedEmail ||
      normalizeBookingEmail(booking.clientVerifiedEmail) !==
        normalizeBookingEmail(user.email) ||
      booking.opusUserId
    )
      throw new ConvexError(
        "This appointment link is invalid or expired. Sign in with the email used for this booking.",
      );
    const customer = await ctx.db.get(booking.customerId);
    if (
      !customer ||
      customer.isDeleted ||
      customer.orgId !== booking.orgId ||
      (customer.opusUserId && customer.opusUserId !== user._id)
    )
      throw new ConvexError(
        "This appointment cannot be linked to your account.",
      );
    await ctx.db.patch(bookingId, {
      opusUserId: user._id,
      clientClaimTokenHash: undefined,
      clientClaimTokenExpiresAt: undefined,
      updatedAt: Date.now(),
    });
    if (!customer.opusUserId)
      await ctx.db.patch(customer._id, {
        opusUserId: user._id,
        updatedAt: Date.now(),
      });
    await ctx.db.insert("audit_log", {
      orgId: booking.orgId,
      actorType: "opus_user",
      actorId: user._id,
      action: "booking.account_claimed",
      resourceType: "bookings",
      resourceId: bookingId,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const cancelMyBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const { user } = await requireCurrentOpusUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking || booking.isDeleted || booking.opusUserId !== user._id)
      throw new ConvexError("Appointment not found.");
    const settings = await requireClientAccounts(ctx, booking.orgId);
    if (
      booking.status !== "confirmed" ||
      booking.startAt - wallClockNow(settings.timezone) <
        settings.cancellationWindowHours * 3_600_000
    )
      throw new ConvexError(
        "Online cancellation is closed. Contact the studio to change this appointment.",
      );
    return cancelBookingRecord(
      ctx,
      booking,
      { type: "opus_user", id: user._id },
      "Cancelled by the client",
    );
  },
});
