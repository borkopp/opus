import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, components, internal } from "../../convex/_generated/api";
import betterAuthTest from "@convex-dev/better-auth/test";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import {
  defaultPushPreferences,
  inQuietHours,
} from "../../../shared/push-notifications";
import { wallClockTimestampToInstant } from "../../convex/lib/bookingTime";
import {
  mobilePushConfigured,
  validWebPushSubscription,
} from "../../convex/lib/staffPush";
import { handoff } from "../../convex/ai/state";

const webSend = vi.hoisted(() => vi.fn());
vi.mock("web-push", () => ({ default: { sendNotification: webSend } }));
const NOW = Date.parse("2026-10-05T07:00:00Z");
const START = Date.parse("2026-10-07T10:00:00Z");
const MOBILE = "11111111-1111-4111-8111-111111111111";
const BROWSER = "22222222-2222-4222-8222-222222222222";
const TOKEN = "ExpoPushToken[local-test-push-token]";
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/local-test",
  keys: { p256dh: "B" + "a".repeat(86), auth: "b".repeat(22) },
};
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("EXPO_PUSH_ENABLED", "true");
  vi.stubEnv("EXPO_PUSH_ACCESS_TOKEN", "mock-not-a-real-credential");
  vi.stubEnv("WEB_PUSH_ENABLED", "true");
  vi.stubEnv("WEB_PUSH_VAPID_PUBLIC_KEY", "B" + "a".repeat(86));
  vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "a".repeat(43));
  fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ data: { status: "ok", id: "mock-ticket" } }),
        { status: 200 },
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  webSend.mockReset();
  webSend.mockResolvedValue({ statusCode: 201 });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function setup() {
  const t = convexTest(schema, convexModules);
  betterAuthTest.register(t);
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        userId: "push-owner",
        token: "push-test-session",
        expiresAt: NOW + 14 * 86400000,
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
  });
  const owner = t.withIdentity({
    subject: "push-owner",
    email: "push-owner@example.invalid",
    sessionId: session._id,
  });
  const userId = await owner.mutation(api.users.ensureUser, {});
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Push test studio",
    category: "hair_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Haircut",
    durationMins: 30,
    priceMinorUnits: 1500,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  const staffId = await t.run(async (ctx) => {
    const service = await ctx.db.get(serviceId);
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .unique();
    await ctx.db.patch(settings!._id, {
      staffNewBookingEmailEnabled: false,
      staffReminderEmailEnabled: false,
      emailEnabled: false,
      smsEnabled: false,
    });
    return service!.staffIds[0];
  });
  const register = () =>
    owner.mutation(api.pushNotifications.registerMobile, {
      deviceId: MOBILE,
      token: TOKEN,
      locale: "en",
    });
  const book = (startAt = START) =>
    owner.mutation(api.bookings.createManualBooking, {
      orgId,
      serviceIds: [serviceId],
      staffId,
      startAt,
      customerName: "Private client name",
    });
  const queue = () =>
    t.run(async (ctx) =>
      (
        await ctx.db
          .query("notifications")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect()
      ).filter((n) => n.channel === "push"),
    );
  const process = (notificationId: Id<"notifications">) =>
    t.action(internal.notifications.processIndividualNotification, {
      notificationId,
    });
  return {
    t,
    owner,
    userId,
    orgId,
    serviceId,
    staffId,
    register,
    book,
    queue,
    process,
    session,
  };
}

describe("Expo provider configuration", () => {
  it("requires a token on cloud deployments even if the local test flag is copied", () => {
    vi.stubEnv("EXPO_PUSH_ACCESS_TOKEN", "");
    vi.stubEnv("EXPO_PUSH_ALLOW_LOCAL_WITHOUT_ACCESS_TOKEN", "true");
    for (const url of [
      "https://studio.convex.cloud",
      "http://192.168.1.20:3210",
      "http://localhost.evil.example:3210",
      "http://person:password@localhost:3210",
      "",
    ]) {
      vi.stubEnv("CONVEX_CLOUD_URL", url);
      expect(mobilePushConfigured()).toBe(false);
    }
    vi.stubEnv("CONVEX_CLOUD_URL", "http://127.0.0.1:3210");
    expect(mobilePushConfigured()).toBe(true);
    vi.stubEnv("EXPO_PUSH_ALLOW_LOCAL_WITHOUT_ACCESS_TOKEN", "false");
    expect(mobilePushConfigured()).toBe(false);
    vi.stubEnv("EXPO_PUSH_ACCESS_TOKEN", "mock-not-a-real-credential");
    expect(mobilePushConfigured()).toBe(true);
    vi.stubEnv("EXPO_PUSH_ENABLED", "false");
    expect(mobilePushConfigured()).toBe(false);
  });

  it("delivers an authorized local test without an invalid bearer header", async () => {
    vi.stubEnv("EXPO_PUSH_ACCESS_TOKEN", "");
    vi.stubEnv("EXPO_PUSH_ALLOW_LOCAL_WITHOUT_ACCESS_TOKEN", "true");
    vi.stubEnv("CONVEX_CLOUD_URL", "http://127.0.0.1:3210");
    const { register, book, queue, process } = await setup();
    await register();
    await book();
    const notification = (await queue()).find(
      (n) => n.pushEvent === "new_booking",
    )!;
    expect(await process(notification._id)).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      "Authorization",
    );
  });
});

describe("staff push permissions and preferences", () => {
  it("derives identity/studio, validates preferences, and never returns token or subscription keys", async () => {
    const { t, owner, orgId, register } = await setup();
    await expect(
      t.query(api.pushNotifications.getSettings, {}),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      owner.query(api.pushNotifications.getSettings, { orgId } as never),
    ).rejects.toThrow();
    await register();
    await owner.mutation(api.pushNotifications.registerBrowser, {
      deviceId: BROWSER,
      subscription,
      locale: "mk",
    });
    const settings = await owner.query(api.pushNotifications.getSettings, {});
    expect(settings.devices).toHaveLength(2);
    expect(JSON.stringify(settings)).not.toContain(TOKEN);
    expect(JSON.stringify(settings)).not.toContain(subscription.keys.auth);
    await expect(
      owner.mutation(api.pushNotifications.savePreferences, {
        preferences: { ...settings.preferences, reminderMinutes: 7 },
      }),
    ).rejects.toThrow("supported reminder");
    await expect(
      owner.mutation(api.pushNotifications.savePreferences, {
        preferences: {
          ...settings.preferences,
          quietHours: true,
          quietStart: "25:00",
        },
      }),
    ).rejects.toThrow("quiet-hour");
    const stranger = t.withIdentity({
      subject: "push-stranger",
      email: "stranger@example.invalid",
    });
    await stranger.mutation(api.users.ensureUser, {});
    await expect(
      stranger.query(api.pushNotifications.getSettings, {}),
    ).rejects.toThrow("No active business");
  });

  it("allows personal staff settings but rejects broader appointment or AI access", async () => {
    const { t, owner, orgId, register, book, queue } = await setup();
    const staffSession = await t.mutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: "push-staff",
            token: "push-staff-session",
            expiresAt: NOW + 14 * 86400000,
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
      },
    );
    const staff = t.withIdentity({
      subject: "push-staff",
      email: "staff@example.invalid",
      sessionId: staffSession._id,
    });
    const staffUserId = await staff.mutation(api.users.ensureUser, {});
    await t.run(async (ctx) => {
      await ctx.db.patch(staffUserId, { activeOrgId: orgId });
      await ctx.db.insert("staff_members", {
        orgId,
        userId: staffUserId,
        role: "staff",
        bookingAccess: "own",
        displayName: "Personal staff",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
    });
    const settings = await staff.query(api.pushNotifications.getSettings, {});
    expect(settings).toMatchObject({
      ownOnly: true,
      preferences: { scope: "mine", aiHandoffs: false },
    });
    await expect(
      staff.mutation(api.pushNotifications.savePreferences, {
        preferences: { ...settings.preferences, scope: "studio" },
      }),
    ).rejects.toThrow("own appointments");
    await staff.mutation(api.pushNotifications.registerMobile, {
      deviceId: BROWSER,
      token: "ExpoPushToken[personal-staff-token]",
      locale: "en",
    });
    await register();
    await book();
    expect((await queue()).every((n) => n.pushUserId !== staffUserId)).toBe(
      true,
    );
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: {
        ...defaultPushPreferences(),
        newBookings: false,
        reminders: false,
      },
    });
    expect(
      (await staff.query(api.pushNotifications.getSettings, {})).preferences
        .newBookings,
    ).toBe(true);
  });

  it("rejects browser endpoints used for SSRF and refuses unconfigured provider registration", async () => {
    const { owner } = await setup();
    for (const endpoint of [
      "http://127.0.0.1/push",
      "https://localhost/push",
      "https://evil.example/push",
      "https://fcm.googleapis.com.evil.example/push",
      "https://user:password@fcm.googleapis.com/push",
      "https://fcm.googleapis.com:8443/push",
    ])
      await expect(
        owner.mutation(api.pushNotifications.registerBrowser, {
          deviceId: BROWSER,
          subscription: { ...subscription, endpoint },
          locale: "en",
        }),
      ).rejects.toThrow("Invalid browser");
    expect(validWebPushSubscription(subscription)).toBe(true);
    vi.stubEnv("EXPO_PUSH_ENABLED", "false");
    await expect(
      owner.mutation(api.pushNotifications.registerMobile, {
        deviceId: MOBILE,
        token: TOKEN,
        locale: "en",
      }),
    ).rejects.toThrow("not configured");
    expect(
      (await owner.query(api.pushNotifications.getSettings, {}))
        .mobileAvailable,
    ).toBe(false);
  });

  it("reuses an installation, prevents duplicate tokens, and revokes it even after staff access is removed", async () => {
    const { t, owner, register, orgId, staffId } = await setup();
    await register();
    await register();
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toHaveLength(1);
    await owner.mutation(api.pushNotifications.registerMobile, {
      deviceId: BROWSER,
      token: TOKEN,
      locale: "en",
    });
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toHaveLength(1);
    await t.run((ctx) => ctx.db.patch(staffId, { isActive: false }));
    await owner.mutation(api.pushNotifications.unregisterDevice, {
      deviceId: BROWSER,
    });
    const devices = await t.run((ctx) =>
      ctx.db
        .query("staff_push_devices")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(devices.every((d) => d.isDeleted && d.expoToken === undefined)).toBe(
      true,
    );
  });

  it("cannot revoke another person's device and enforces the active device limit on reactivation", async () => {
    const { t, owner, register, orgId, userId, session } = await setup();
    await register();
    const stranger = t.withIdentity({
      subject: "device-stranger",
      email: "device-stranger@example.invalid",
    });
    await stranger.mutation(api.users.ensureUser, {});
    await stranger.mutation(api.pushNotifications.unregisterDevice, {
      deviceId: MOBILE,
    });
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toHaveLength(1);
    await owner.mutation(api.pushNotifications.unregisterDevice, {
      deviceId: MOBILE,
    });
    await t.run(async (ctx) => {
      for (let i = 0; i < 20; i++)
        await ctx.db.insert("staff_push_devices", {
          orgId,
          userId,
          authSessionId: session._id,
          deviceId: `other-${i}`,
          kind: "expo",
          expoToken: `ExpoPushToken[test-device-token-${i}]`,
          locale: "en",
          lastSeenAt: NOW,
          isDeleted: false,
          createdAt: NOW,
          updatedAt: NOW,
        });
    });
    await expect(register()).rejects.toThrow("Too many notification devices");
  });
});

describe("queued push delivery", () => {
  it("queues both channels, hides client details by default, deduplicates workers, and tracks receipt acceptance separately", async () => {
    const { t, owner, register, book, queue, process } = await setup();
    await register();
    await owner.mutation(api.pushNotifications.registerBrowser, {
      deviceId: BROWSER,
      subscription,
      locale: "mk",
    });
    const bookingId = await book();
    const notifications = (await queue()).filter(
      (n) => n.pushEvent === "new_booking",
    );
    expect(notifications).toHaveLength(2);
    for (const notification of notifications)
      expect(await process(notification._id)).toBe("sent");
    expect(await process(notifications[0]._id)).toBe("ignored");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(webSend).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][1].body)).not.toContain(
      "Private client name",
    );
    expect(String(webSend.mock.calls[0][1])).not.toContain(
      "Private client name",
    );
    expect(String(webSend.mock.calls[0][1])).toContain("Нов термин");
    const expo = (await queue()).find((n) => n.deliveryProvider === "expo")!;
    expect(expo.pushReceiptStatus).toBe("accepted");
    expect(expo.deliveredAt).toBeUndefined();
    const device = await t.run((ctx) => ctx.db.get(expo.pushDeviceId!));
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ data: { "mock-ticket": { status: "ok" } } }),
        { status: 200 },
      ),
    );
    await t.action(internal.pushDelivery.checkReceipt, {
      notificationId: expo._id,
      deviceVersion: device!.updatedAt,
      attempt: 0,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(expo._id)))?.pushReceiptStatus,
    ).toBe("provider_accepted");
    expect(
      await owner.mutation(api.pushNotifications.openNotification, {
        notificationId: expo._id,
      }),
    ).toMatchObject({ kind: "appointment", id: bookingId, date: "2026-10-07" });
    const stranger = t.withIdentity({
      subject: "push-foreign",
      email: "foreign@example.invalid",
    });
    await stranger.mutation(api.users.ensureUser, {});
    expect(
      await stranger.mutation(api.pushNotifications.openNotification, {
        notificationId: expo._id,
      }),
    ).toBeNull();
  });

  it("checks live opt-outs, quiet hours, membership and assignment again before sending", async () => {
    const { t, owner, register, book, queue, process, staffId } = await setup();
    await register();
    await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: { ...defaultPushPreferences(), mobileEnabled: false },
    });
    expect(await process(n._id)).toBe("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: {
        ...defaultPushPreferences(),
        quietHours: true,
        quietStart: "08:00",
        quietEnd: "10:00",
      },
    });
    await book(START + 3600000);
    const quiet = (await queue()).find(
      (n) => n.pushEvent === "new_booking" && n.status === "pending",
    )!;
    expect(await process(quiet._id)).toBe("cancelled");
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: defaultPushPreferences(),
    });
    await book(START + 2 * 3600000);
    const revoked = (await queue()).find(
      (n) => n.pushEvent === "new_booking" && n.status === "pending",
    )!;
    await t.run((ctx) => ctx.db.patch(staffId, { isActive: false }));
    expect(await process(revoked._id)).toBe("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      inQuietHours(
        { ...defaultPushPreferences(), quietHours: true },
        Date.parse("2026-10-05T21:00:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(true);
  });

  it.each([
    { newBookings: true, changes: true },
    { newBookings: true, changes: false },
    { newBookings: false, changes: true },
    { newBookings: false, changes: false },
  ])(
    "uses only the reschedule preference (newBookings=$newBookings, changes=$changes)",
    async ({ newBookings, changes }) => {
      const { owner, orgId, book, queue, process } = await setup();
      await owner.mutation(api.pushNotifications.registerBrowser, {
        deviceId: BROWSER,
        subscription,
        locale: "en",
      });
      await owner.mutation(api.pushNotifications.savePreferences, {
        preferences: { ...defaultPushPreferences(), newBookings, changes },
      });
      const bookingId = await book();
      const replacementId = await owner.mutation(
        api.bookings.rescheduleBooking,
        {
          orgId,
          bookingId,
          newStartAt: START + 3600000,
        },
      );
      const alerts = (await queue()).filter(
        (notification) =>
          notification.bookingId === replacementId &&
          notification.pushEvent !== "booking_reminder",
      );
      expect(alerts.map((notification) => notification.pushEvent)).toEqual(
        changes ? ["booking_changed"] : [],
      );
      if (changes) expect(await process(alerts[0]._id)).toBe("sent");
      expect(webSend).toHaveBeenCalledTimes(changes ? 1 : 0);
      const dashboardNotifications = await owner.query(
        api.dashboardNotifications.list,
        { orgId },
      );
      expect(
        dashboardNotifications.find(
          (notification) => notification.bookingId === replacementId,
        )?.title,
      ).toBe("Booking Rescheduled");
    },
  );

  it("schedules a real studio-time reminder, replaces rescheduled reminders, and suppresses cancelled ones", async () => {
    const { owner, orgId, register, book, queue, process } = await setup();
    await register();
    const bookingId = await book();
    const old = (await queue()).find(
      (n) => n.pushEvent === "booking_reminder",
    )!;
    expect(old.scheduledFor).toBe(
      wallClockTimestampToInstant(START, "Europe/Skopje") - 30 * 60000,
    );
    expect(await process(old._id)).toBe("ignored");
    const replacementId = await owner.mutation(api.bookings.rescheduleBooking, {
      orgId,
      bookingId,
      newStartAt: START + 3600000,
    });
    expect(
      (await queue()).filter(
        (n) =>
          n.pushEvent === "booking_reminder" &&
          n.pushBookingStartAt === START + 3600000,
      ),
    ).toHaveLength(1);
    const changed = (await queue()).find(
      (n) => n.pushEvent === "booking_changed",
    )!;
    expect(await process(changed._id)).toBe("sent");
    await owner.mutation(api.bookings.cancelBooking, {
      orgId,
      bookingId: replacementId,
    });
    const current = (await queue()).find(
      (n) => n.pushEvent === "booking_reminder" && n.status === "pending",
    );
    if (current) {
      vi.setSystemTime(current.scheduledFor);
      expect(await process(current._id)).toBe("cancelled");
    }
    expect(
      (await queue()).some((n) => n.pushEvent === "booking_cancelled"),
    ).toBe(true);
  });

  it("reconciles existing appointments after a device or reminder setting is connected", async () => {
    const { owner, register, book, queue } = await setup();
    await book(START - 86400000);
    expect(await queue()).toHaveLength(0);
    await register();
    expect(
      (await queue()).filter((n) => n.pushEvent === "booking_reminder"),
    ).toHaveLength(1);
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: { ...defaultPushPreferences(), reminderMinutes: 60 },
    });
    expect(
      (await queue()).filter(
        (n) =>
          n.pushEvent === "booking_reminder" && n.pushReminderMinutes === 60,
      ),
    ).toHaveLength(1);
  });

  it("retries temporary failures, invalidates expired tokens, and honors private previews and sound", async () => {
    const { t, owner, register, book, queue, process } = await setup();
    await register();
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: {
        ...defaultPushPreferences(),
        showPreview: true,
        sound: false,
      },
    });
    await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    expect(await process(n._id)).toBe("retrying");
    const retry = await t.run((ctx) => ctx.db.get(n._id));
    vi.setSystemTime(retry!.scheduledFor);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { status: "error", details: { error: "DeviceNotRegistered" } },
        }),
        { status: 200 },
      ),
    );
    expect(await process(n._id)).toBe("failed");
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(payload.body).toContain("Private client name");
    expect(payload.sound).toBeNull();
    expect(payload.channelId).toBe("opus-appointments-silent");
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toHaveLength(0);
  });

  it("limits retries and removes expired browser subscriptions without claiming delivery", async () => {
    const { t, owner, book, queue, process } = await setup();
    await owner.mutation(api.pushNotifications.registerBrowser, {
      deviceId: BROWSER,
      subscription,
      locale: "en",
    });
    await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    webSend.mockRejectedValue({ statusCode: 503 });
    expect(await process(n._id)).toBe("retrying");
    vi.setSystemTime((await t.run((ctx) => ctx.db.get(n._id)))!.scheduledFor);
    expect(await process(n._id)).toBe("retrying");
    vi.setSystemTime((await t.run((ctx) => ctx.db.get(n._id)))!.scheduledFor);
    expect(await process(n._id)).toBe("failed");
    expect((await t.run((ctx) => ctx.db.get(n._id)))!.attemptCount).toBe(3);
    await book(START + 3600000);
    const next = (await queue()).find(
      (n) => n.pushEvent === "new_booking" && n.status === "pending",
    )!;
    webSend.mockRejectedValue({ statusCode: 410 });
    expect(await process(next._id)).toBe("failed");
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toEqual([]);
    expect(
      (await t.run((ctx) => ctx.db.get(next._id)))!.deliveredAt,
    ).toBeUndefined();
  });

  it("keeps browser credential versions stable across key order and locale refreshes", async () => {
    const { t, owner, orgId } = await setup();
    const registerBrowser = (value: typeof subscription, locale: "en" | "mk") =>
      owner.mutation(api.pushNotifications.registerBrowser, {
        deviceId: BROWSER,
        subscription: value,
        locale,
      });
    const device = () =>
      t.run((ctx) =>
        ctx.db
          .query("staff_push_devices")
          .withIndex("by_org_device", (q) =>
            q.eq("orgId", orgId).eq("deviceId", BROWSER),
          )
          .unique(),
      );
    await registerBrowser(subscription, "en");
    const version = (await device())!.updatedAt;
    vi.setSystemTime(NOW + 1000);
    await registerBrowser(
      {
        keys: {
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
        },
        endpoint: subscription.endpoint,
      },
      "mk",
    );
    expect(await device()).toMatchObject({
      updatedAt: version,
      lastSeenAt: NOW + 1000,
      locale: "mk",
    });
    await registerBrowser(
      { ...subscription, keys: { ...subscription.keys, auth: "c".repeat(22) } },
      "mk",
    );
    expect((await device())!.updatedAt).toBeGreaterThan(version);
  });

  it("invalidates a dead receipt after routine refresh, but preserves a newly rotated token", async () => {
    const { t, owner, register, book, queue, process } = await setup();
    await register();
    await book();
    const first = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    await process(first._id);
    const version = (await t.run((ctx) => ctx.db.get(first.pushDeviceId!)))!
      .updatedAt;
    vi.setSystemTime(NOW + 1000);
    await register();
    expect(
      (await t.run((ctx) => ctx.db.get(first.pushDeviceId!)))!.updatedAt,
    ).toBe(version);
    await t.mutation(internal.pushQueue.recordReceipt, {
      notificationId: first._id,
      result: "failed",
      invalidDevice: true,
      deviceVersion: version,
    });
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toEqual([]);
    vi.setSystemTime(NOW + 2000);
    await register();
    await book(START + 3600000);
    const second = (await queue()).find(
      (n) => n.pushEvent === "new_booking" && n.status === "pending",
    )!;
    await process(second._id);
    const previous = (await t.run((ctx) => ctx.db.get(second.pushDeviceId!)))!
      .updatedAt;
    vi.setSystemTime(NOW + 3000);
    await owner.mutation(api.pushNotifications.registerMobile, {
      deviceId: MOBILE,
      token: "ExpoPushToken[new-rotated-token]",
      locale: "en",
    });
    await t.mutation(internal.pushQueue.recordReceipt, {
      notificationId: second._id,
      result: "failed",
      invalidDevice: true,
      deviceVersion: previous,
    });
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toHaveLength(1);
  });

  it("leaves missing Expo receipts unknown after bounded retries", async () => {
    const { t, register, book, queue, process } = await setup();
    await register();
    await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    await process(n._id);
    const device = await t.run((ctx) => ctx.db.get(n.pushDeviceId!));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    await t.action(internal.pushDelivery.checkReceipt, {
      notificationId: n._id,
      deviceVersion: device!.updatedAt,
      attempt: 3,
    });
    expect((await t.run((ctx) => ctx.db.get(n._id)))!).toMatchObject({
      status: "sent",
      pushReceiptStatus: "unknown",
    });
  });

  it("rechecks a personal-only role and the studio when opening or delivering an old alert", async () => {
    const { t, owner, register, book, queue, process, staffId, orgId } =
      await setup();
    await register();
    const bookingId = await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    await t.run(async (ctx) => {
      const other = await ctx.db.insert("staff_members", {
        orgId,
        role: "staff",
        displayName: "Other staff",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await ctx.db.patch(bookingId, { staffId: other });
      await ctx.db.patch(staffId, { role: "staff", bookingAccess: "own" });
    });
    expect(await process(n._id)).toBe("cancelled");
    expect(
      await owner.mutation(api.pushNotifications.openNotification, {
        notificationId: n._id,
      }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suppresses alerts after session expiry even when a cached identity still names the user", async () => {
    const { t, owner, register, book, queue, process, session } = await setup();
    await register();
    await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    await t.mutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "session",
        where: [{ field: "_id", value: session._id }],
        update: { expiresAt: NOW - 1 },
      },
    });
    expect(await process(n._id)).toBe("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await owner.query(api.pushNotifications.getSettings, {})).devices,
    ).toEqual([]);
    await expect(register()).rejects.toThrow("Sign in again");
  });

  it("opens the original verified studio when the person is currently in a different studio", async () => {
    const { t, owner, register, book, queue, userId, orgId } = await setup();
    await register();
    const bookingId = await book();
    const n = (await queue()).find((n) => n.pushEvent === "new_booking")!;
    await t.run(async (ctx) => {
      const next = await ctx.db.insert("orgs", {
        name: "Other push studio",
        slug: "other-push-studio",
        industry: "beauty_wellness",
        plan: "free",
        listingStatus: "unpublished",
        source: "customer",
        reviewCount: 0,
        averageRating: 0,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await ctx.db.insert("staff_members", {
        orgId: next,
        userId,
        role: "owner",
        displayName: "Other studio owner",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await ctx.db.patch(userId, { activeOrgId: next });
    });
    expect(
      await owner.mutation(api.pushNotifications.openNotification, {
        notificationId: n._id,
      }),
    ).toMatchObject({ kind: "appointment", id: bookingId });
    expect((await t.run((ctx) => ctx.db.get(userId)))!.activeOrgId).toBe(orgId);
  });

  it("queues actual Pro AI handoffs independently of appointment scope and suppresses resolved conversations", async () => {
    const { t, owner, register, orgId, queue, process } = await setup();
    await t.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    await owner.mutation(api.pushNotifications.savePreferences, {
      preferences: { ...defaultPushPreferences(), scope: "mine" },
    });
    await register();
    const conversationId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("ai_conversations", {
        orgId,
        channel: "instagram",
        channelThreadId: "push-ai-local",
        status: "active",
        bookingIds: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await handoff(ctx, (await ctx.db.get(id))!, "Needs a staff reply");
      return id;
    });
    const n = (await queue()).find((n) => n.pushEvent === "ai_handoff")!;
    expect(n).toBeDefined();
    expect(
      await owner.mutation(api.pushNotifications.openNotification, {
        notificationId: n._id,
      }),
    ).toEqual({ kind: "ai_inbox", id: conversationId });
    await t.run((ctx) => ctx.db.patch(conversationId, { status: "resolved" }));
    expect(await process(n._id)).toBe("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("studio quiet hours", () => {
  it("supports daytime and overnight windows with exclusive end times and a DST change", () => {
    const overnight = { ...defaultPushPreferences(), quietHours: true };
    expect(
      inQuietHours(
        overnight,
        Date.parse("2026-10-05T20:00:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(true);
    expect(
      inQuietHours(
        overnight,
        Date.parse("2026-10-05T06:00:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(false);
    expect(
      inQuietHours(
        overnight,
        Date.parse("2026-10-26T06:30:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(true);
    expect(
      inQuietHours(
        overnight,
        Date.parse("2026-10-26T07:00:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(false);
    const daytime = { ...overnight, quietStart: "12:00", quietEnd: "14:00" };
    expect(
      inQuietHours(
        daytime,
        Date.parse("2026-10-05T10:00:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(true);
    expect(
      inQuietHours(
        daytime,
        Date.parse("2026-10-05T12:00:00Z"),
        "Europe/Skopje",
      ),
    ).toBe(false);
  });
});
