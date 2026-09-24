import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { wallClockTimestampToInstant } from "../../convex/lib/bookingTime";

const backend = () => convexTest(schema, convexModules);
const NOW = Date.parse("2026-09-24T08:00:00Z");
const START = Date.parse("2026-09-28T10:00:00Z");
const account = `AC${"a".repeat(32)}`;
const messageId = `SM${"b".repeat(32)}`;
let t: ReturnType<typeof backend>;
let fetchMock: ReturnType<typeof vi.fn>;

async function studio(paid = true, enabled = true, name = "sms-owner") {
  const owner = t.withIdentity({
    subject: name,
    name: "Studio Owner",
    email: `${name}@example.com`,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "SMS Studio",
    category: "beauty_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Manicure",
    durationMins: 30,
    priceMinorUnits: 1200,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  const { settingsId, staffId } = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, { plan: paid ? "paid" : "free" });
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .unique();
    const service = await ctx.db.get(serviceId);
    if (!settings || !service) throw new Error("Missing fixture");
    await ctx.db.patch(settings._id, {
      smsEnabled: enabled,
      smsReminderHoursBefore: [24, 2],
      emailEnabled: false,
      staffNewBookingEmailEnabled: false,
      staffReminderEmailEnabled: false,
    });
    return { settingsId: settings._id, staffId: service.staffIds[0] };
  });
  const book = (phone: string | undefined = "070 123 456") =>
    owner.mutation(api.bookings.createManualBooking, {
      orgId,
      serviceIds: [serviceId],
      staffId,
      startAt: START,
      customerName: "Ana",
      customerPhone: phone,
    });
  const notifications = () =>
    t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
  return { owner, orgId, serviceId, staffId, settingsId, book, notifications };
}
async function process(id: Id<"notifications">) {
  return t.action(internal.notifications.processIndividualNotification, {
    notificationId: id,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  t = backend();
  vi.stubEnv("SITE_URL", "https://studio.opus.mk");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-sms-notifications-only");
  for (const [key, value] of Object.entries({
    SMS_ENABLED: "true",
    TWILIO_ACCOUNT_SID: account,
    TWILIO_AUTH_TOKEN: "test-token",
    TWILIO_FROM_NUMBER: "+15005550006",
    TWILIO_MESSAGING_SERVICE_SID: "",
    CONVEX_SITE_URL: "https://test.convex.site",
    TWILIO_STATUS_CALLBACK_URL: "",
  }))
    vi.stubEnv(key, value);
  fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ sid: messageId, status: "queued" }), {
        status: 201,
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Pro SMS access and booking lifecycle", () => {
  test("rejects Free activation through both settings APIs, anonymous and cross-tenant access", async () => {
    const a = await studio(false, false),
      b = await studio(true, false, "other");
    const args = {
      orgId: a.orgId,
      smsEnabled: true,
      smsReminderHoursBefore: [24],
    };
    await expect(
      a.owner.mutation(api.orgSettings.updateSmsNotificationSettings, args),
    ).rejects.toThrow("requires the paid plan");
    await expect(
      a.owner.mutation(api.orgSettings.updateNotificationSettings, {
        orgId: a.orgId,
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: false,
        reminderHoursBefore: [24],
      }),
    ).rejects.toThrow("requires the paid plan");
    await expect(
      t.mutation(api.orgSettings.updateSmsNotificationSettings, args),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      b.owner.mutation(api.orgSettings.updateSmsNotificationSettings, args),
    ).rejects.toThrow("Unauthorised");
    await a.book();
    expect(await a.notifications()).toHaveLength(0);
  });
  test("validates owner settings, keeps email independent, and requires provider configuration", async () => {
    const a = await studio(true, false);
    const save = (hours: number[]) =>
      a.owner.mutation(api.orgSettings.updateSmsNotificationSettings, {
        orgId: a.orgId,
        smsEnabled: true,
        smsReminderHoursBefore: hours,
      });
    await expect(save([0, 1.5, 337])).rejects.toThrow("whole hours");
    await expect(save(Array(9).fill(24))).rejects.toThrow("no more than");
    await save([2, 24, 2]);
    expect(await t.run((ctx) => ctx.db.get(a.settingsId))).toMatchObject({
      smsEnabled: true,
      smsReminderHoursBefore: [24, 2],
      emailEnabled: false,
    });
    vi.stubEnv("SMS_ENABLED", "false");
    await expect(save([24])).rejects.toThrow("not configured");
    await expect(
      a.owner.mutation(api.orgSettings.updateSmsNotificationSettings, {
        orgId: a.orgId,
        smsEnabled: false,
        smsReminderHoursBefore: [],
      }),
    ).resolves.toBe(true);
    expect(
      await a.owner.query(api.orgSettings.getOrgSettings, { orgId: a.orgId }),
    ).toMatchObject({ smsAvailable: false });
  });
  test.each(["disabled", "invalid-phone", "missing-phone", "provider-off"])(
    "skips SMS for %s without failing a booking",
    async (scenario) => {
      const a = await studio(true, scenario !== "disabled");
      if (scenario === "provider-off") vi.stubEnv("SMS_ENABLED", "false");
      await a.book(
        scenario === "invalid-phone"
          ? "123"
          : scenario === "missing-phone"
            ? ""
            : "070123456",
      );
      expect(await a.notifications()).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  test("queues one confirmation and independent timezone-correct reminders, and deduplicates reconciliation", async () => {
    const a = await studio();
    await a.book();
    await t.mutation(internal.notifications.reconcileBookingRemindersForOrg, {
      orgId: a.orgId,
    });
    await t.mutation(internal.notifications.reconcileBookingRemindersForOrg, {
      orgId: a.orgId,
    });
    const queued = await a.notifications();
    expect(queued).toHaveLength(3);
    expect(
      queued.every(
        (n) => n.channel === "sms" && n.recipientAddress === "+38970123456",
      ),
    ).toBe(true);
    const reminder = queued.find((n) => n.templateData.hoursBefore === 24)!;
    expect(reminder.scheduledFor).toBe(
      wallClockTimestampToInstant(START, "Europe/Skopje") - 24 * 3_600_000,
    );
    await expect(process(reminder._id)).resolves.toBe("ignored");
    vi.setSystemTime(reminder.scheduledFor);
    await expect(process(reminder._id)).resolves.toBe("sent");
    expect(
      new URLSearchParams(fetchMock.mock.calls[0][1].body).get("Body"),
    ).toContain("Потсетник за термин");
  });
  test.each(["downgrade", "disabled", "phone-changed", "provider-off"])(
    "suppresses pending SMS after %s",
    async (scenario) => {
      const a = await studio();
      const bookingId = await a.book();
      const confirmation = (await a.notifications()).find(
        (n) => n.type === "booking_confirmation",
      )!;
      await t.run(async (ctx) => {
        if (scenario === "downgrade")
          await ctx.db.patch(a.orgId, { plan: "free" });
        if (scenario === "disabled")
          await ctx.db.patch(a.settingsId, { smsEnabled: false });
        if (scenario === "phone-changed") {
          const booking = await ctx.db.get(bookingId);
          await ctx.db.patch(booking!.customerId, { phone: "+38970111111" });
        }
      });
      if (scenario === "provider-off") vi.stubEnv("SMS_ENABLED", "false");
      await expect(process(confirmation._id)).resolves.toBe("cancelled");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  test("cancellation and rescheduling suppress old reminders and send their own updates", async () => {
    const a = await studio();
    const originalId = await a.book();
    const oldReminder = (await a.notifications()).find(
      (n) => n.type === "booking_reminder",
    )!;
    const newId = await a.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: a.orgId,
      bookingId: originalId,
      newStartAt: START + 3_600_000,
    });
    let queued = await a.notifications();
    expect(
      queued.filter(
        (n) => n.bookingId === newId && n.type === "booking_rescheduled",
      ),
    ).toHaveLength(1);
    expect(
      queued.filter(
        (n) => n.bookingId === newId && n.type === "booking_confirmation",
      ),
    ).toHaveLength(0);
    vi.setSystemTime(oldReminder.scheduledFor);
    await expect(process(oldReminder._id)).resolves.toBe("cancelled");
    const newReminder = queued.find(
      (n) => n.bookingId === newId && n.type === "booking_reminder",
    )!;
    await a.owner.mutation(api.bookings.cancelBooking, {
      orgId: a.orgId,
      bookingId: newId,
    });
    queued = await a.notifications();
    const cancelled = queued.find(
      (n) => n.bookingId === newId && n.type === "booking_cancelled",
    )!;
    await expect(process(cancelled._id)).resolves.toBe("sent");
    vi.setSystemTime(newReminder.scheduledFor);
    await expect(process(newReminder._id)).resolves.toBe("cancelled");
  });
  test.each(["completed", "expired", "changed-hours", "changed-timezone"])(
    "suppresses %s reminders",
    async (scenario) => {
      const a = await studio(),
        bookingId = await a.book();
      const reminder = (await a.notifications()).find(
        (n) => n.type === "booking_reminder",
      )!;
      vi.setSystemTime(
        scenario === "expired" ? START + 86_400_000 : reminder.scheduledFor,
      );
      await t.run(async (ctx) => {
        if (scenario === "completed")
          await ctx.db.patch(bookingId, { status: "completed" });
        if (scenario === "changed-hours")
          await ctx.db.patch(a.settingsId, { smsReminderHoursBefore: [] });
        if (scenario === "changed-timezone")
          await ctx.db.patch(a.settingsId, { timezone: "Europe/London" });
      });
      await expect(process(reminder._id)).resolves.toBe("cancelled");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe("SMS delivery and callbacks", () => {
  test("Free cannot queue active SMS even with legacy enabled settings", async () => {
    const a = await studio(false, true);
    const bookingId = await a.book();
    expect(await a.notifications()).toHaveLength(0);
    const booking = await t.run((ctx) => ctx.db.get(bookingId));
    const id = await t.mutation(internal.notifications.scheduleNotification, {
      orgId: a.orgId,
      bookingId,
      customerId: booking!.customerId,
      channel: "sms",
      type: "booking_confirmation",
      recipientAddress: "+38970123456",
      templateData: {},
    });
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      status: "cancelled",
      failureReason: "SMS notifications require Pro.",
    });
    await expect(process(id)).resolves.toBe("ignored");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test("enabling SMS backfills upcoming reminders without old confirmations", async () => {
    const a = await studio(true, false);
    await a.book();
    vi.setSystemTime(START - 30 * 3_600_000);
    await a.owner.mutation(api.orgSettings.updateSmsNotificationSettings, {
      orgId: a.orgId,
      smsEnabled: true,
      smsReminderHoursBefore: [24, 2],
    });
    await t.mutation(internal.notifications.reconcileBookingRemindersForOrg, {
      orgId: a.orgId,
    });
    const queued = await a.notifications();
    expect(queued).toHaveLength(2);
    expect(queued.every((n) => n.type === "booking_reminder")).toBe(true);
  });
  test("sends once with concurrent workers and keeps acceptance distinct from delivery", async () => {
    const a = await studio();
    await a.book();
    const n = (await a.notifications())[0];
    await Promise.all([process(n._id), process(n._id)]);
    await process(n._id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await t.run((ctx) => ctx.db.get(n._id))).toMatchObject({
      status: "sent",
      deliveryStatus: "accepted",
      deliveryProvider: "twilio",
      externalMessageId: messageId,
    });
  });
  test("retries a 429 on schedule with bounded attempts", async () => {
    const a = await studio();
    await a.book();
    const n = (await a.notifications())[0];
    fetchMock.mockImplementation(
      async () => new Response("{}", { status: 429 }),
    );
    await expect(process(n._id)).resolves.toBe("retrying");
    await expect(process(n._id)).resolves.toBe("ignored");
    vi.setSystemTime(NOW + 60_000);
    await expect(process(n._id)).resolves.toBe("retrying");
    vi.setSystemTime(NOW + 6 * 60_000);
    await expect(process(n._id)).resolves.toBe("failed");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  test("does not resend an ambiguous submission after a crash", async () => {
    const a = await studio();
    await a.book();
    const n = (await a.notifications())[0];
    await t.run((ctx) =>
      ctx.db.patch(n._id, {
        smsDispatchStartedAt: NOW,
        processingStartedAt: NOW,
      }),
    );
    vi.setSystemTime(NOW + 3 * 60_000);
    await expect(process(n._id)).resolves.toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test("rejects forged receipts, accepts signed delivery, and ignores regressions and other tenants", async () => {
    const a = await studio(),
      b = await studio(true, true, "other");
    await a.book();
    const n = (await a.notifications())[0];
    await process(n._id);
    const query = new URLSearchParams({
      orgId: a.orgId,
      notificationId: n._id,
    });
    const path = `/webhooks/twilio?${query}`;
    const params = new URLSearchParams({
      AccountSid: account,
      MessageSid: messageId,
      MessageStatus: "delivered",
      To: n.recipientAddress,
    });
    const signature = createHmac("sha1", "test-token")
      .update(
        `https://test.convex.site${path}` +
          [...params.keys()]
            .sort()
            .map((key) => key + params.get(key))
            .join(""),
      )
      .digest("base64");
    expect(
      (await t.fetch(path, { method: "POST", body: params.toString() })).status,
    ).toBe(401);
    expect(
      (
        await t.fetch(path, {
          method: "POST",
          body: params.toString(),
          headers: {
            "x-twilio-signature": signature,
            "content-type": "application/x-www-form-urlencoded",
          },
        })
      ).status,
    ).toBe(200);
    expect(await t.run((ctx) => ctx.db.get(n._id))).toMatchObject({
      status: "delivered",
      deliveryStatus: "delivered",
    });
    const event = {
      orgId: a.orgId,
      notificationId: n._id,
      messageId,
      recipient: n.recipientAddress,
      status: "sent",
    };
    await expect(
      t.mutation(internal.smsWebhooks.recordTwilioDeliveryEvent, event),
    ).resolves.toBe("ignored");
    await expect(
      t.mutation(internal.smsWebhooks.recordTwilioDeliveryEvent, {
        ...event,
        orgId: b.orgId,
      }),
    ).resolves.toBe("ignored");
    await expect(
      t.mutation(internal.smsWebhooks.recordTwilioDeliveryEvent, {
        ...event,
        status: "failed",
      }),
    ).resolves.toBe("ignored");
  });
  test("a receipt can arrive before the send response or reconcile a timeout", async () => {
    const a = await studio();
    await a.book();
    const n = (await a.notifications())[0];
    fetchMock.mockImplementation(async () => {
      await t.mutation(internal.smsWebhooks.recordTwilioDeliveryEvent, {
        orgId: a.orgId,
        notificationId: n._id,
        messageId,
        recipient: n.recipientAddress,
        status: "delivered",
      });
      throw new Error("Network disconnected");
    });
    await process(n._id);
    expect(await t.run((ctx) => ctx.db.get(n._id))).toMatchObject({
      status: "delivered",
      deliveryProvider: "twilio",
    });
  });
});
