// This module is copied into ONLY the disposable backend by e2e-environment.mjs.
// It is outside convex/ so inspection and legacy-data fixtures cannot ship with the app.
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
} from "../../../convex/_generated/server";

export const studioSnapshot = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!org) return null;
    const orgId = org._id;
    const [
      settings,
      staff,
      services,
      bookings,
      customers,
      notifications,
      auditLog,
    ] = await Promise.all([
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .unique(),
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("customers")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    ]);
    return {
      org,
      settings,
      staff,
      services,
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        orgId: booking.orgId,
        customerId: booking.customerId,
        staffId: booking.staffId,
        serviceId: booking.serviceId,
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        source: booking.source,
        priceMinorUnits: booking.priceMinorUnits,
        currency: booking.currency,
        isDeleted: booking.isDeleted,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason,
      })),
      customers,
      notifications,
      auditLog,
    };
  },
});

export const hospitalitySnapshot = internalQuery({
  args: { slug: v.string(), clientEmail: v.optional(v.string()) },
  handler: async (ctx, { slug, clientEmail }) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!org) return null;
    const orgId = org._id;
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    let clientIdentity = null;
    if (clientEmail) {
      const email = clientEmail.trim().toLowerCase();
      const customer = customers.find((row) => row.email === email);
      const client = customer?.opusUserId
        ? await ctx.db.get(customer.opusUserId)
        : null;
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();
      const bySubject = client?.authUserId
        ? await ctx.db
            .query("users")
            .withIndex("by_auth_user_id", (q) =>
              q.eq("authUserId", client.authUserId),
            )
            .collect()
        : [];
      const businessUserIds = new Set(
        [...byEmail, ...bySubject].map((user) => user._id),
      );
      const staff = await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      // Expose only evidence booleans/counts, never authentication subjects.
      clientIdentity = {
        hasLinkedClientAccount: Boolean(client && client.email === email),
        hasAuthenticatedClient: Boolean(client?.authUserId),
        businessUserCount: businessUserIds.size,
        venueStaffMembershipCount: staff.filter(
          (member) => member.userId && businessUserIds.has(member.userId),
        ).length,
      };
    }
    return {
      org,
      clientIdentity,
      settings: await ctx.db
        .query("reservation_settings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .unique(),
      tables: await ctx.db
        .query("tables")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      combinations: await ctx.db
        .query("table_combinations")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      reservations: (
        await ctx.db
          .query("reservations")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect()
      ).map(
        ({
          manageTokenHash,
          manageTokenCiphertext,
          requestFingerprint,
          ...reservation
        }) => {
          void manageTokenHash;
          void manageTokenCiphertext;
          void requestFingerprint;
          return reservation;
        },
      ),
      allocations: await ctx.db
        .query("reservation_allocations")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
      customers,
      auditLog: await ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    };
  },
});

/** Historical data cannot be created through the supported UI. This fixture
 * adds one unconverted row only to a previously created disposable E2E venue. */
export const insertLegacyReservation = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    if (!slug.startsWith("e2e-restaurant-"))
      throw new Error("E2E venue required.");
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (
      !org ||
      org.industry !== "hospitality" ||
      org.venueType !== "restaurant"
    )
      throw new Error("E2E restaurant unavailable.");
    const table = await ctx.db
      .query("tables")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    const customer = (
      await ctx.db
        .query("customers")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect()
    ).find((row) => !row.isDeleted);
    if (!table || !customer)
      throw new Error("E2E journey must create tables and a guest first.");
    const now = Date.now();
    const startAt = Math.ceil((now + 86_400_000) / 60_000) * 60_000;
    return ctx.db.insert("reservations", {
      orgId: org._id,
      floorPlanId: table.floorPlanId,
      tableId: table._id,
      customerId: customer._id,
      startAt,
      endAt: startAt + 30 * 60_000,
      durationMins: 30,
      partySize: 2,
      status: "confirmed",
      source: "manual",
      autoAssigned: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Advance only the timestamps of visits created by the attention E2E journey.
 * This module is installed solely in a disposable backend. Real staff actions
 * still create, arrive, seat, complete and release every visit in the browser. */
export const advanceReservationAttention = internalMutation({
  args: {
    slug: v.string(),
    reservationId: v.id("reservations"),
    stage: v.union(
      v.literal("late"),
      v.literal("ending_soon"),
      v.literal("overdue"),
      v.literal("cleaning_ready"),
      v.literal("cleaning_boundary"),
    ),
  },
  handler: async (ctx, { slug, reservationId, stage }) => {
    if (!slug.startsWith("e2e-access-cafe-"))
      throw new Error("Disposable attention journey venue required.");
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    const reservation = await ctx.db.get(reservationId);
    if (
      !org ||
      org.industry !== "hospitality" ||
      !reservation ||
      reservation.orgId !== org._id ||
      reservation.isDeleted ||
      reservation.schemaVersion !== 2 ||
      reservation.timeModel !== "utc" ||
      !reservation.guestName?.startsWith("Attention ")
    )
      throw new Error("Owned, current attention journey reservation required.");
    const allocations = (
      await ctx.db
        .query("reservation_allocations")
        .withIndex("by_org_reservation_active", (q) =>
          q
            .eq("orgId", org._id)
            .eq("reservationId", reservationId)
            .eq("isActive", true),
        )
        .collect()
    ).filter((allocation) => !allocation.isDeleted);
    const now = Date.now();
    const minute = 60_000;
    if (stage === "cleaning_ready" || stage === "cleaning_boundary") {
      if (
        reservation.status !== "completed" ||
        !allocations.length ||
        allocations.some((allocation) => allocation.kind !== "cleaning")
      )
        throw new Error("Complete the visit through staff UI first.");
      const completedAt =
        stage === "cleaning_boundary"
          ? now - 3 * minute + 5_000
          : now - 4 * minute;
      await ctx.db.patch(reservationId, { completedAt, updatedAt: now });
      for (const allocation of allocations)
        await ctx.db.patch(allocation._id, {
          startAt: completedAt,
          endAt: completedAt + 3 * minute,
          updatedAt: now,
        });
    } else {
      const seated = stage !== "late";
      if (
        reservation.status !== (seated ? "seated" : "confirmed") ||
        !allocations.length ||
        allocations.some((allocation) => allocation.kind === "cleaning")
      )
        throw new Error("Create and seat the visit through staff UI first.");
      const settings = await ctx.db
        .query("reservation_settings")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .unique();
      const grace = settings?.noShowGraceMins ?? 15;
      const elapsed =
        stage === "late" ? grace + 5 : stage === "ending_soon" ? 20 : 35;
      const durationMins = stage === "late" ? Math.max(30, grace + 30) : 30;
      const startAt = Math.floor(now / minute) * minute - elapsed * minute;
      const endAt = startAt + durationMins * minute;
      await ctx.db.patch(reservationId, {
        startAt,
        endAt,
        durationMins,
        bufferMins: 3,
        ...(seated ? { arrivedAt: startAt, seatedAt: startAt } : {}),
        updatedAt: now,
      });
      for (const allocation of allocations)
        await ctx.db.patch(allocation._id, {
          startAt,
          endAt: endAt + 3 * minute,
          updatedAt: now,
        });
    }
    return { asOf: now };
  },
});
