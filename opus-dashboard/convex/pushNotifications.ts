import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { requireActiveOrg, requireUser } from "./lib/auth";
import { hasPersonalBookingAccess } from "./lib/staffAccess";
import {
  pushPreferencesValidator,
  webPushSubscriptionValidator,
} from "./lib/pushValidators";
import {
  browserPushConfigured,
  mobilePushConfigured,
  readPushPreferences,
  reconcilePersonalPushReminders,
  validWebPushSubscription,
} from "./lib/staffPush";
import { PUSH_REMINDER_MINUTES } from "../../shared/push-notifications";
import { reviewStudioAccessAllowed } from "./lib/appReview";

const locale = v.union(v.literal("en"), v.literal("mk"), v.literal("sq"));
function validateDeviceId(value: string) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new ConvexError("Invalid notification device.");
}

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, org, staffMember, user } = await requireActiveOrg(ctx);
    const ownOnly = hasPersonalBookingAccess(staffMember);
    const preferences = await readPushPreferences(
      ctx,
      orgId,
      user._id,
      ownOnly,
    );
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    const devices = await ctx.db
      .query("staff_push_devices")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", user._id),
      )
      .collect();
    return {
      preferences,
      ownOnly,
      aiAvailable: org.plan === "paid" && !ownOnly,
      timezone: settings?.timezone ?? "Europe/Skopje",
      mobileAvailable: mobilePushConfigured(),
      browserAvailable: browserPushConfigured(),
      browserPublicKey: browserPushConfigured()
        ? process.env.WEB_PUSH_VAPID_PUBLIC_KEY!
        : null,
      devices: devices
        .filter((d) => !d.isDeleted)
        .map((d) => ({
          id: d.deviceId,
          kind: d.kind,
          lastSeenAt: d.lastSeenAt,
        })),
    };
  },
});

export const savePreferences = mutation({
  args: { preferences: pushPreferencesValidator },
  handler: async (ctx, { preferences }) => {
    const { orgId, user, staffMember } = await requireActiveOrg(ctx);
    if (
      !PUSH_REMINDER_MINUTES.some(
        (value) => value === preferences.reminderMinutes,
      )
    )
      throw new ConvexError("Choose a supported reminder time.");
    if (
      ![preferences.quietStart, preferences.quietEnd].every((value) =>
        /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
      ) ||
      (preferences.quietHours &&
        preferences.quietStart === preferences.quietEnd)
    )
      throw new ConvexError("Choose different, valid quiet-hour times.");
    if (
      hasPersonalBookingAccess(staffMember) &&
      (preferences.scope !== "mine" || preferences.aiHandoffs)
    )
      throw new ConvexError(
        "Your alerts are limited to your own appointments.",
      );
    const existing = await ctx.db
      .query("staff_notification_preferences")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", user._id),
      )
      .unique();
    const now = Date.now();
    if (existing)
      await ctx.db.patch(existing._id, {
        preferences,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: now,
      });
    else
      await ctx.db.insert("staff_notification_preferences", {
        orgId,
        userId: user._id,
        preferences,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "user",
      actorId: user._id,
      action: "push.preferences_updated",
      resourceType: "users",
      resourceId: user._id,
      createdAt: now,
    });
    await reconcilePersonalPushReminders(ctx, orgId, user._id);
  },
});

type DeviceInput = {
  deviceId: string;
  locale: "en" | "mk" | "sq";
  kind: "expo" | "web";
  expoToken?: string;
  subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
};
async function register(ctx: MutationCtx, input: DeviceInput) {
  validateDeviceId(input.deviceId);
  const { orgId, user, identity } = await requireActiveOrg(ctx);
  const authSessionId =
    typeof identity.sessionId === "string" ? identity.sessionId : null;
  if (!authSessionId)
    throw new ConvexError("Sign in again to connect notifications.");
  const session = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "session",
    where: [{ field: "_id", value: authSessionId }],
  });
  if (
    !session ||
    session.userId !== user.authUserId ||
    session.expiresAt <= Date.now()
  )
    throw new ConvexError("Sign in again to connect notifications.");
  const existing = await ctx.db
    .query("staff_push_devices")
    .withIndex("by_org_device", (q) =>
      q.eq("orgId", orgId).eq("deviceId", input.deviceId),
    )
    .unique();
  const devices = await ctx.db
    .query("staff_push_devices")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  if (
    (!existing || existing.isDeleted || existing.userId !== user._id) &&
    devices.filter((d) => d.userId === user._id && !d.isDeleted).length >= 20
  )
    throw new ConvexError(
      "Too many notification devices. Disconnect an old device first.",
    );
  const now = Date.now();
  // Avoid duplicates after reinstall/storage resets. Never return another user's tokens.
  for (const device of devices)
    if (
      device._id !== existing?._id &&
      !device.isDeleted &&
      ((input.expoToken && device.expoToken === input.expoToken) ||
        (input.subscription &&
          device.subscription?.endpoint === input.subscription.endpoint))
    )
      await ctx.db.patch(device._id, {
        isDeleted: true,
        deletedAt: now,
        expoToken: undefined,
        subscription: undefined,
        updatedAt: now,
      });
  // Receipt invalidation must survive routine refreshes but never revoke a rotated credential.
  const sameCredential =
    existing &&
    !existing.isDeleted &&
    existing.userId === user._id &&
    existing.authSessionId === authSessionId &&
    existing.kind === input.kind &&
    existing.expoToken === input.expoToken &&
    existing.subscription?.endpoint === input.subscription?.endpoint &&
    existing.subscription?.keys.p256dh === input.subscription?.keys.p256dh &&
    existing.subscription?.keys.auth === input.subscription?.keys.auth;
  const data = {
    ...input,
    authSessionId,
    userId: user._id,
    isDeleted: false,
    deletedAt: undefined,
    lastSeenAt: now,
    updatedAt: sameCredential
      ? existing.updatedAt
      : Math.max(now, (existing?.updatedAt ?? 0) + 1),
  };
  if (existing) await ctx.db.patch(existing._id, data);
  else
    await ctx.db.insert("staff_push_devices", {
      ...data,
      orgId,
      createdAt: now,
    });
  if (!existing || existing.isDeleted || existing.userId !== user._id)
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "user",
      actorId: user._id,
      action: "push.device_connected",
      resourceType: "users",
      resourceId: user._id,
      after: { kind: input.kind },
      createdAt: now,
    });
  await reconcilePersonalPushReminders(ctx, orgId, user._id);
}

export const registerMobile = mutation({
  args: { deviceId: v.string(), token: v.string(), locale },
  handler: async (ctx, args) => {
    if (!mobilePushConfigured())
      throw new ConvexError("Mobile push is not configured yet.");
    if (!/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,200}\]$/.test(args.token))
      throw new ConvexError("Invalid push token.");
    await register(ctx, {
      deviceId: args.deviceId,
      expoToken: args.token,
      subscription: undefined,
      kind: "expo",
      locale: args.locale,
    });
  },
});
export const registerBrowser = mutation({
  args: {
    deviceId: v.string(),
    subscription: webPushSubscriptionValidator,
    locale,
  },
  handler: async (ctx, args) => {
    if (!browserPushConfigured())
      throw new ConvexError("Browser push is not configured yet.");
    if (!validWebPushSubscription(args.subscription))
      throw new ConvexError("Invalid browser push subscription.");
    await register(ctx, { ...args, expoToken: undefined, kind: "web" });
  },
});

/** Also works after losing active studio access. Identity is always server-derived. */
export const unregisterDevice = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    validateDeviceId(deviceId);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .first();
    if (!user || user.isDeleted) return;
    const memberships = await ctx.db
      .query("staff_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const orgId of new Set(memberships.map((m) => m.orgId))) {
      const device = await ctx.db
        .query("staff_push_devices")
        .withIndex("by_org_device", (q) =>
          q.eq("orgId", orgId).eq("deviceId", deviceId),
        )
        .unique();
      if (!device || device.userId !== user._id || device.isDeleted) continue;
      await ctx.db.patch(device._id, {
        isDeleted: true,
        deletedAt: Date.now(),
        expoToken: undefined,
        subscription: undefined,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("audit_log", {
        orgId,
        actorType: "user",
        actorId: user._id,
        action: "push.device_disconnected",
        resourceType: "users",
        resourceId: user._id,
        after: { kind: device.kind },
        createdAt: Date.now(),
      });
    }
  },
});

/** A notification tap resolves a current membership and destination, never an arbitrary URL. */
export const openNotification = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const { user } = await requireUser(ctx);
    const notification = await ctx.db.get(notificationId);
    if (
      !notification ||
      notification.channel !== "push" ||
      notification.pushUserId !== user._id
    )
      return null;
    const org = await ctx.db.get(notification.orgId);
    const member = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", notification.orgId).eq("userId", user._id),
      )
      .first();
    if (
      !org ||
      org.isDeleted ||
      !reviewStudioAccessAllowed(user, org) ||
      !member ||
      member.isDeleted ||
      !member.isActive
    )
      return null;
    if (notification.bookingId) {
      const booking = await ctx.db.get(notification.bookingId);
      if (
        !booking ||
        booking.orgId !== org._id ||
        booking.isDeleted ||
        (hasPersonalBookingAccess(member) && booking.staffId !== member._id)
      )
        return null;
      await ctx.db.patch(user._id, {
        activeOrgId: org._id,
        updatedAt: Date.now(),
      });
      return {
        kind: "appointment" as const,
        id: booking._id,
        date: new Date(booking.startAt).toISOString().slice(0, 10),
      };
    }
    if (
      notification.pushConversationId &&
      org.plan === "paid" &&
      !hasPersonalBookingAccess(member)
    ) {
      const conversation = await ctx.db.get(notification.pushConversationId);
      if (!conversation || conversation.orgId !== org._id) return null;
      await ctx.db.patch(user._id, {
        activeOrgId: org._id,
        updatedAt: Date.now(),
      });
      return { kind: "ai_inbox" as const, id: conversation._id };
    }
    return null;
  },
});
