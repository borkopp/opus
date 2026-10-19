import { paginationOptsValidator } from "convex/server";
import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";
import { isActiveIndustry } from "./lib/productScope";
import { compactWallClockDateTime } from "./lib/bookingTime";
import { queueStaffPushEvent } from "./lib/staffPush";
import { isVisibleCalendarBooking } from "../../shared/calendar";

const notificationType = v.union(
  v.literal("new_booking"),
  v.literal("booking_changed"),
  v.literal("booking_cancelled"),
  v.literal("no_show"),
  v.literal("ai_handoff"),
);
type Notification = Doc<"dashboard_notifications">;

async function requireInboxAccess(ctx: QueryCtx, orgId: Id<"orgs">) {
  const auth = await requireAuth(ctx, orgId);
  if (!isActiveIndustry(auth.org.industry)) {
    throw new ConvexError("This feature is available to beauty studios only.");
  }
  return auth;
}

function normalizedType(notification: Pick<Notification, "type" | "title">) {
  return notification.type === "new_booking" &&
    notification.title === "Booking Rescheduled"
    ? ("booking_changed" as const)
    : notification.type;
}

export const create = internalMutation({
  args: {
    orgId: v.id("orgs"),
    type: v.union(
      v.literal("new_booking"),
      v.literal("booking_changed"),
      v.literal("booking_cancelled"),
      v.literal("no_show"),
    ),
    title: v.string(),
    body: v.string(),
    bookingId: v.optional(v.id("bookings")),
    customerId: v.optional(v.id("customers")),
    queuePush: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const type = normalizedType(args);
    await ctx.db.insert("dashboard_notifications", {
      orgId: args.orgId,
      type,
      title: args.title,
      body: args.body,
      bookingId: args.bookingId,
      customerId: args.customerId,
      isRead: false,
      isDismissed: false,
      createdAt: Date.now(),
    });
    if (args.queuePush ?? true) {
      await queueStaffPushEvent(ctx, {
        orgId: args.orgId,
        event: type,
        bookingId: args.bookingId,
      });
    }
  },
});

async function readWatermark(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  userId: Id<"users">,
) {
  const state = await ctx.db
    .query("dashboard_inbox_states")
    .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", userId))
    .unique();
  return state && !state.isDeleted ? state.readThroughCreationTime : 0;
}

async function personalState(
  ctx: QueryCtx,
  notification: Notification,
  userId: Id<"users">,
  watermark: number,
) {
  const stored = await ctx.db
    .query("dashboard_notification_states")
    .withIndex("by_org_user_notification", (q) =>
      q
        .eq("orgId", notification.orgId)
        .eq("userId", userId)
        .eq("notificationId", notification._id),
    )
    .unique();
  const state = stored && !stored.isDeleted ? stored : null;
  const isDismissed = notification.isDismissed || Boolean(state?.isDismissed);
  return {
    isRead:
      isDismissed ||
      notification.isRead ||
      notification._creationTime <= watermark ||
      Boolean(state?.isRead),
    isDismissed,
  };
}

async function notificationDestination(
  ctx: QueryCtx,
  notification: Notification,
) {
  if (notification.type === "ai_handoff" && notification.conversationId) {
    const conversation = await ctx.db.get(notification.conversationId);
    return {
      href:
        conversation?.orgId === notification.orgId
          ? `/ai-inbox?conversation=${encodeURIComponent(conversation._id)}`
          : null,
      bookingDate: null,
    };
  }
  const booking = notification.bookingId
    ? await ctx.db.get(notification.bookingId)
    : null;
  if (
    !booking ||
    booking.orgId !== notification.orgId ||
    booking.isDeleted ||
    !isVisibleCalendarBooking(booking)
  )
    return { href: null, bookingDate: null };
  // Beauty bookings use UTC-shaped studio wall-clock values, not UTC instants.
  const compactDate = compactWallClockDateTime(booking.startAt).slice(0, 8);
  const bookingDate = `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
  return {
    href: `/beauty/bookings?booking=${encodeURIComponent(booking._id)}&date=${bookingDate}`,
    bookingDate,
  };
}

async function presentNotification(
  ctx: QueryCtx,
  notification: Notification,
  userId: Id<"users">,
  watermark: number,
) {
  const state = await personalState(ctx, notification, userId, watermark);
  return {
    ...notification,
    ...state,
    type: normalizedType(notification),
    ...(await notificationDestination(ctx, notification)),
  };
}

/** The bell keeps its existing API; its rows now reflect the signed-in person. */
export const list = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const { user } = await requireInboxAccess(ctx, orgId);
    const watermark = await readWatermark(ctx, orgId, user._id);
    const visible = [];
    const notifications = await ctx.db
      .query("dashboard_notifications")
      .withIndex("by_org_created", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(200);
    for (const notification of notifications) {
      if (notification.isDismissed) continue;
      const row = await presentNotification(
        ctx,
        notification,
        user._id,
        watermark,
      );
      if (!row.isDismissed) visible.push(row);
      if (visible.length === 50) break;
    }
    return visible;
  },
});

export const listPage = query({
  args: {
    orgId: v.id("orgs"),
    paginationOpts: paginationOptsValidator,
    unreadOnly: v.optional(v.boolean()),
    type: v.optional(notificationType),
  },
  handler: async (ctx, args) => {
    const { user } = await requireInboxAccess(ctx, args.orgId);
    const watermark = await readWatermark(ctx, args.orgId, user._id);
    const result = await ctx.db
      .query("dashboard_notifications")
      .withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      });
    const rows = await Promise.all(
      result.page.map((notification) =>
        presentNotification(ctx, notification, user._id, watermark),
      ),
    );
    // Keep the raw cursor/isDone: an empty filtered page can have older matches.
    return {
      ...result,
      page: rows.filter(
        (row) =>
          !row.isDismissed &&
          (!args.unreadOnly || !row.isRead) &&
          (!args.type || row.type === args.type),
      ),
    };
  },
});

const UNREAD_COUNT_LIMIT = 100;
const UNREAD_SCAN_LIMIT = 200;

async function unreadSummary(ctx: QueryCtx, orgId: Id<"orgs">) {
  const { user } = await requireInboxAccess(ctx, orgId);
  const watermark = await readWatermark(ctx, orgId, user._id);
  // Bound raw reads before considering legacy dismissals or personal states.
  // At most 201 notification reads and 200 personal-state lookups per call;
  // even a lifetime of individually read/dismissed alerts stays bounded.
  const candidates = await ctx.db
    .query("dashboard_notifications")
    .withIndex("by_org_unread", (q) =>
      q.eq("orgId", orgId).eq("isRead", false).gt("_creationTime", watermark),
    )
    .order("desc")
    .take(UNREAD_SCAN_LIMIT + 1);
  let count = 0;
  const scanned = Math.min(candidates.length, UNREAD_SCAN_LIMIT);
  for (let index = 0; index < scanned; index++) {
    const notification = candidates[index];
    if (notification.isDismissed) continue;
    const state = await personalState(ctx, notification, user._id, watermark);
    if (!state.isRead && !state.isDismissed) count += 1;
    if (count === UNREAD_COUNT_LIMIT) {
      return { count, hasMore: index + 1 < candidates.length };
    }
  }
  // hasMore means older rows were not counted; it does not assert they are
  // unread. Only a confirmed count of 100 may produce a "99+" unread badge.
  return { count, hasMore: candidates.length > scanned };
}

export const getUnreadSummary = query({
  args: { orgId: v.id("orgs") },
  handler: (ctx, { orgId }) => unreadSummary(ctx, orgId),
});

/** Old tabs retain the numeric API, with a bounded confirmed lower bound. */
export const getUnreadCount = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => (await unreadSummary(ctx, orgId)).count,
});

async function updatePersonalState(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  notificationId: Id<"dashboard_notifications">,
  dismissed: boolean,
) {
  const { user } = await requireInboxAccess(ctx, orgId);
  const notification = await ctx.db.get(notificationId);
  if (!notification || notification.orgId !== orgId)
    throw new ConvexError("Not found.");
  const existing = await ctx.db
    .query("dashboard_notification_states")
    .withIndex("by_org_user_notification", (q) =>
      q
        .eq("orgId", orgId)
        .eq("userId", user._id)
        .eq("notificationId", notificationId),
    )
    .unique();
  const now = Date.now();
  const data = {
    isRead: true,
    isDismissed:
      dismissed || (!existing?.isDeleted && Boolean(existing?.isDismissed)),
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: now,
  };
  if (existing) await ctx.db.patch(existing._id, data);
  else
    await ctx.db.insert("dashboard_notification_states", {
      ...data,
      orgId,
      userId: user._id,
      notificationId,
      createdAt: now,
    });
}

export const markRead = mutation({
  args: {
    orgId: v.id("orgs"),
    notificationId: v.id("dashboard_notifications"),
  },
  handler: (ctx, args) =>
    updatePersonalState(ctx, args.orgId, args.notificationId, false),
});

export const markAllRead = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const { user } = await requireInboxAccess(ctx, orgId);
    const latest = await ctx.db
      .query("dashboard_notifications")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .first();
    if (!latest) return;
    const existing = await ctx.db
      .query("dashboard_inbox_states")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", user._id),
      )
      .unique();
    const now = Date.now();
    const data = {
      readThroughCreationTime: Math.max(
        latest._creationTime,
        existing?.isDeleted ? 0 : (existing?.readThroughCreationTime ?? 0),
      ),
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, data);
    else
      await ctx.db.insert("dashboard_inbox_states", {
        ...data,
        orgId,
        userId: user._id,
        createdAt: now,
      });
  },
});

export const dismiss = mutation({
  args: {
    orgId: v.id("orgs"),
    notificationId: v.id("dashboard_notifications"),
  },
  handler: (ctx, args) =>
    updatePersonalState(ctx, args.orgId, args.notificationId, true),
});
