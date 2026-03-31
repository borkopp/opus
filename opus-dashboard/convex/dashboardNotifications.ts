import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL — called from booking mutations (createBooking, cancelBooking, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const create = internalMutation({
  args: {
    orgId: v.id("orgs"),
    type: v.union(
      v.literal("new_booking"),
      v.literal("booking_cancelled"),
      v.literal("no_show"),
    ),
    title: v.string(),
    body: v.string(),
    bookingId: v.optional(v.id("bookings")),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("dashboard_notifications", {
      orgId: args.orgId,
      type: args.type,
      title: args.title,
      body: args.body,
      bookingId: args.bookingId,
      customerId: args.customerId,
      isRead: false,
      isDismissed: false,
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the 50 most recent non-dismissed notifications for the navbar dropdown. */
export const list = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    return ctx.db
      .query("dashboard_notifications")
      .withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .filter((q) => q.eq(q.field("isDismissed"), false))
      .take(50);
  },
});

/** Count of unread, non-dismissed notifications — drives the bell badge. */
export const getUnreadCount = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    const unread = await ctx.db
      .query("dashboard_notifications")
      .withIndex("by_org_unread", (q) =>
        q.eq("orgId", args.orgId).eq("isRead", false),
      )
      .filter((q) => q.eq(q.field("isDismissed"), false))
      .collect();
    return unread.length;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const markRead = mutation({
  args: {
    orgId: v.id("orgs"),
    notificationId: v.id("dashboard_notifications"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.orgId !== args.orgId) throw new ConvexError("Not found.");
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    const unread = await ctx.db
      .query("dashboard_notifications")
      .withIndex("by_org_unread", (q) =>
        q.eq("orgId", args.orgId).eq("isRead", false),
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});

export const dismiss = mutation({
  args: {
    orgId: v.id("orgs"),
    notificationId: v.id("dashboard_notifications"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.orgId !== args.orgId) throw new ConvexError("Not found.");
    await ctx.db.patch(args.notificationId, { isDismissed: true, isRead: true });
  },
});
