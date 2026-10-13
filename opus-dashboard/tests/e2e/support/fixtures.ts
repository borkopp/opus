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
