import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const backend = () => convexTest(schema, convexModules);
const NOW = Date.parse("2026-10-24T08:00:00Z");
const START = Date.parse("2026-10-26T10:00:00Z");
let t: ReturnType<typeof backend>;
let fetchMock: ReturnType<typeof vi.fn>;

async function studio() {
  const owner = t.withIdentity({
    subject: "retired-channel-owner",
    name: "Studio Owner",
    email: "owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Notification Studio",
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
  const staffId = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, { plan: "paid", trial: undefined });
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .unique();
    const service = await ctx.db.get(serviceId);
    if (!settings || !service) throw new Error("Missing fixture");
    // Existing preferences must remain harmless even when they were enabled.
    await ctx.db.patch(settings._id, {
      smsEnabled: true,
      smsReminderHoursBefore: [24, 2],
      emailEnabled: true,
      reminderHoursBefore: [24],
      staffNewBookingEmailEnabled: false,
      staffReminderEmailEnabled: false,
    });
    return service.staffIds[0];
  });
  const book = (email?: string) =>
    owner.mutation(api.bookings.createManualBooking, {
      orgId,
      serviceIds: [serviceId],
      staffId,
      startAt: START,
      customerName: "Ana",
      customerPhone: "+38970123456",
      customerEmail: email,
    });
  const notifications = () =>
    t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
  return { owner, orgId, book, notifications };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  t = backend();
  vi.stubEnv("SITE_URL", "https://studio.opus.mk");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-retired-notifications");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("AUTH_EMAIL_FROM", "bookings@opus.mk");
  // Old environment configuration cannot reactivate a removed provider.
  vi.stubEnv("SMS_ENABLED", "true");
  vi.stubEnv("TWILIO_ACCOUNT_SID", `AC${"a".repeat(32)}`);
  vi.stubEnv("TWILIO_AUTH_TOKEN", "retired-test-token");
  vi.stubEnv("TWILIO_FROM_NUMBER", "+15005550006");
  vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "");
  vi.stubEnv(
    "TWILIO_STATUS_CALLBACK_URL",
    "https://test.convex.site/webhooks/twilio",
  );
  fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ id: "email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("retired notification channels", () => {
  test.each(["sms", "whatsapp"])(
    "rejects new %s queue entries",
    async (channel) => {
      const a = await studio();
      await expect(
        t.mutation(internal.notifications.scheduleNotification, {
          orgId: a.orgId,
          // Exercise runtime validation with a stale caller's channel.
          channel: channel as "email",
          type: "booking_confirmation",
          recipientAddress: "+38970123456",
          templateData: {},
        }),
      ).rejects.toThrow();
      expect(await a.notifications()).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  test.each([false, true])(
    "cancels a legacy SMS without outbound calls, already dispatched: %s",
    async (dispatched) => {
      const a = await studio();
      const notificationId = await t.run((ctx) =>
        ctx.db.insert("notifications", {
          orgId: a.orgId,
          channel: "sms",
          type: "booking_confirmation",
          recipientAddress: "+38970123456",
          templateData: {},
          status: "pending",
          scheduledFor: NOW,
          createdAt: NOW,
          ...(dispatched ? { smsDispatchStartedAt: NOW - 1000 } : {}),
        }),
      );
      expect(
        await t.action(internal.notifications.processIndividualNotification, {
          notificationId,
        }),
      ).toBe("cancelled");
      expect(await t.run((ctx) => ctx.db.get(notificationId))).toMatchObject({
        channel: "sms",
        status: "cancelled",
        failureReason: "This notification channel is no longer supported.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        await t.action(internal.notifications.processIndividualNotification, {
          notificationId,
        }),
      ).toBe("ignored");
      const audit = await t.run((ctx) =>
        ctx.db
          .query("audit_log")
          .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
          .collect(),
      );
      expect(
        audit.some(
          (row) =>
            row.action === "notification.cancelled" &&
            row.resourceId === notificationId,
        ),
      ).toBe(true);
    },
  );

  test.each(["cancel", "complete", "reschedule"] as const)(
    "phone-only bookings can %s without recreating SMS",
    async (action) => {
      const a = await studio();
      const bookingId = await a.book();
      if (action === "cancel")
        await a.owner.mutation(api.bookings.cancelBooking, {
          orgId: a.orgId,
          bookingId,
        });
      if (action === "complete")
        await a.owner.mutation(api.bookings.completeBooking, {
          orgId: a.orgId,
          bookingId,
        });
      if (action === "reschedule")
        await a.owner.mutation(api.bookings.rescheduleBooking, {
          orgId: a.orgId,
          bookingId,
          newStartAt: START + 3_600_000,
        });
      expect(await a.notifications()).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  test("new bookings still schedule and deliver email with legacy SMS settings enabled", async () => {
    const a = await studio();
    const bookingId = await a.book("ana@example.com");
    const notifications = (await a.notifications()).filter(
      (row) => row.bookingId === bookingId,
    );
    expect(notifications.map((row) => row.channel)).toEqual(["email", "email"]);
    expect(notifications.map((row) => row.type).sort()).toEqual([
      "booking_confirmation",
      "booking_reminder",
    ]);
    const confirmation = notifications.find(
      (row) => row.type === "booking_confirmation",
    )!;
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: confirmation._id,
      }),
    ).toBe("sent");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("resend.com");
  });

  test("settings responses omit legacy SMS preferences", async () => {
    const a = await studio();
    const response = await a.owner.query(api.orgSettings.getOrgSettings, {
      orgId: a.orgId,
    });
    expect(response).not.toHaveProperty("smsAvailable");
    expect(response?.settings).not.toHaveProperty("smsEnabled");
    expect(response?.settings).not.toHaveProperty("smsReminderHoursBefore");
  });
});
