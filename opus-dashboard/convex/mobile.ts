import { ConvexError, v } from "convex/values";
import { CALENDAR_DAY, isVisibleCalendarBooking } from "../../shared/calendar";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { requireActiveOrg, requireUser } from "./lib/auth";
import {
  assertBookingAccess,
  hasPersonalBookingAccess,
  requireBookingAccess,
} from "./lib/staffAccess";
import { isActiveIndustry } from "./lib/productScope";
import { wallClockNow } from "./lib/bookingTime";
import { computeSlotsForDate } from "./slots";
import type {
  MobileAppointment,
  MobileBootstrap,
  MobileOverview,
} from "../../shared/mobile";

async function studioAccess(ctx: QueryCtx) {
  const auth = await requireBookingAccess(ctx);
  if (!isActiveIndustry(auth.org.industry))
    throw new ConvexError("Mobile is available for beauty studios.");
  return auth;
}

export const bootstrap = query({
  args: {},
  handler: async (ctx): Promise<MobileBootstrap> => {
    await requireUser(ctx);
    // An account without an active staff membership can sign in, but cannot read studio data.
    let auth;
    try {
      auth = await requireActiveOrg(ctx);
    } catch (error) {
      if (!(error instanceof ConvexError)) throw error;
      return {
        available: false,
        message:
          "No active studio access. Ask your studio owner for an invitation or finish setup on the web dashboard.",
      };
    }
    if (!isActiveIndustry(auth.org.industry))
      return {
        available: false,
        message: "Mobile is available for beauty studios.",
      };
    const [settings, services, team] = await Promise.all([
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .first(),
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect(),
      ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", auth.orgId))
        .collect(),
    ]);
    const timezone = settings?.timezone ?? "Europe/Skopje";
    const now = wallClockNow(timezone);
    return {
      available: true,
      orgId: auth.orgId,
      name: auth.org.name,
      timezone,
      now,
      today: Math.floor(now / 86_400_000) * 86_400_000,
      plan: auth.org.plan,
      profile: {
        name: auth.staffMember.displayName,
        email: auth.user.email,
        role: auth.staffMember.role,
        bookingAccess: hasPersonalBookingAccess(auth.staffMember)
          ? "own"
          : "team",
        theme: auth.staffMember.dashboardTheme ?? "clarity",
      },
      services: services
        .filter(
          (s) =>
            !s.isDeleted &&
            s.isActive &&
            (!hasPersonalBookingAccess(auth.staffMember) ||
              s.staffIds.includes(auth.staffMember._id)),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          id: s._id,
          name: s.name,
          durationMins: s.durationMins,
          priceMinorUnits: s.priceMinorUnits,
          currency: s.currency,
          staffIds: hasPersonalBookingAccess(auth.staffMember)
            ? [auth.staffMember._id]
            : s.staffIds,
        })),
      team: team
        .filter(
          (s) =>
            !s.isDeleted &&
            s.isActive &&
            (!hasPersonalBookingAccess(auth.staffMember) ||
              s._id === auth.staffMember._id),
        )
        .map((s) => ({ id: s._id, name: s.displayName, role: s.role })),
    };
  },
});

async function appointment(
  ctx: QueryCtx,
  booking: Doc<"bookings">,
): Promise<MobileAppointment> {
  const [customer, staff, services] = await Promise.all([
    ctx.db.get(booking.customerId),
    ctx.db.get(booking.staffId),
    Promise.all(
      (booking.serviceIds ?? [booking.serviceId]).map((id) => ctx.db.get(id)),
    ),
  ]);
  const ownedCustomer =
    customer?.orgId === booking.orgId && !customer.isDeleted ? customer : null;
  return {
    id: booking._id,
    customerId: booking.customerId,
    customerName: ownedCustomer?.name ?? "Unavailable client",
    customerEmail: ownedCustomer?.email ?? null,
    customerPhone: ownedCustomer?.phone ?? null,
    staffId: booking.staffId,
    staffName:
      staff?.orgId === booking.orgId
        ? staff.displayName
        : "Unavailable team member",
    serviceIds: booking.serviceIds ?? [booking.serviceId],
    serviceName:
      services
        .filter((s) => s?.orgId === booking.orgId)
        .map((s) => s!.name)
        .join(" + ") || "Unavailable service",
    startAt: booking.startAt,
    endAt: booking.endAt,
    priceMinorUnits: booking.priceMinorUnits,
    currency: booking.currency,
    status: booking.status,
    note: booking.customerNote ?? null,
  };
}

export const calendar = query({
  args: { day: v.number(), endDay: v.optional(v.number()) },
  handler: async (ctx, { day, endDay }) => {
    const end = endDay ?? day + CALENDAR_DAY;
    const auth = await studioAccess(ctx);
    const { orgId } = auth;
    if (
      !Number.isFinite(day) ||
      day % 86_400_000 !== 0 ||
      !Number.isFinite(new Date(day).getTime()) ||
      !Number.isFinite(end) ||
      end % CALENDAR_DAY !== 0 ||
      !Number.isFinite(new Date(end).getTime()) ||
      end <= day ||
      end - day > 42 * CALENDAR_DAY
    )
      throw new ConvexError("Choose a valid calendar range of up to 42 days.");
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org_start", (q) =>
        q.eq("orgId", orgId).gte("startAt", day).lt("startAt", end),
      )
      .collect();
    return Promise.all(
      bookings
        .filter(
          (b) =>
            !b.isDeleted &&
            isVisibleCalendarBooking(b) &&
            (!hasPersonalBookingAccess(auth.staffMember) ||
              b.staffId === auth.staffMember._id),
        )
        .map((b) => appointment(ctx, b)),
    );
  },
});

export const getAppointment = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const auth = await studioAccess(ctx);
    const { orgId } = auth;
    const booking = await ctx.db.get(bookingId);
    if (!booking || booking.orgId !== orgId || booking.isDeleted) return null;
    assertBookingAccess(auth, booking);
    return appointment(ctx, booking);
  },
});

export const slots = query({
  args: {
    staffId: v.id("staff_members"),
    serviceId: v.id("services"),
    date: v.string(),
    refreshMinute: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await studioAccess(ctx);
    const { orgId } = auth;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date))
      throw new ConvexError("Choose a valid date.");
    await requireBookingAccess(ctx, orgId, args.staffId);
    // Uses the same working hours, exceptions, booking notice and conflicts as guest booking.
    return computeSlotsForDate(
      ctx,
      orgId,
      args.staffId,
      args.serviceId,
      args.date,
    );
  },
});

export const createAppointment = mutation({
  args: {
    staffId: v.id("staff_members"),
    serviceId: v.id("services"),
    startAt: v.number(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async (ctx, { serviceId, ...args }): Promise<string> => {
    const auth = await studioAccess(ctx);
    const { orgId } = auth;
    return ctx.runMutation(api.bookings.createManualBooking, {
      ...args,
      orgId,
      serviceIds: [serviceId],
    });
  },
});

export const changeAppointmentStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
  },
  handler: async (ctx, { bookingId, status }): Promise<boolean> => {
    const auth = await studioAccess(ctx);
    const { orgId } = auth;
    if (status === "completed")
      return ctx.runMutation(api.bookings.completeBooking, {
        orgId,
        bookingId,
      });
    if (status === "cancelled")
      return ctx.runMutation(api.bookings.cancelBooking, { orgId, bookingId });
    return ctx.runMutation(api.bookings.markNoShow, { orgId, bookingId });
  },
});

export const overview = query({
  args: { refreshMinute: v.number() },
  handler: async (ctx): Promise<MobileOverview> => {
    const auth = await studioAccess(ctx);
    const { orgId } = auth;
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const now = wallClockNow(settings?.timezone ?? "Europe/Skopje");
    const today = Math.floor(now / 86_400_000) * 86_400_000;
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org_start", (q) =>
        q
          .eq("orgId", orgId)
          .gte("startAt", today)
          .lt("startAt", today + 86_400_000),
      )
      .collect();
    const appointments = await Promise.all(
      bookings
        .filter(
          (b) =>
            !b.isDeleted &&
            isVisibleCalendarBooking(b) &&
            (!hasPersonalBookingAccess(auth.staffMember) ||
              b.staffId === auth.staffMember._id),
        )
        .map((b) => appointment(ctx, b)),
    );
    const active = appointments.filter((b) =>
      ["confirmed", "checked_in", "completed"].includes(b.status),
    );
    const completed = active.filter(
      (b) => b.status === "completed" && b.startAt <= now,
    );
    const amounts = new Map<string, number>();
    completed.forEach((b) =>
      amounts.set(
        b.currency,
        (amounts.get(b.currency) ?? 0) + b.priceMinorUnits,
      ),
    );
    return {
      today,
      count: active.length,
      completedCount: completed.length,
      completedValue: Array.from(amounts, ([currency, amountMinorUnits]) => ({
        currency,
        amountMinorUnits,
      })),
      next:
        active.find(
          (b) =>
            ["confirmed", "checked_in"].includes(b.status) && b.endAt > now,
        ) ?? null,
      appointments,
    };
  },
});
