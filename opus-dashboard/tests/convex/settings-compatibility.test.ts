import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;
const operational = {
  timezone: "Europe/Belgrade",
  currency: "EUR",
  locale: "en-GB",
  slotDurationMins: 15,
  quickBookingDurationMins: 45,
  bookingWindowDays: 90,
  cancellationWindowHours: 48,
  bufferTimeMins: 5,
};
const aiHours = [{ dayOfWeek: 1, startTime: "10:15", endTime: "16:45" }];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function studio(t: Backend, key = "one", paid = true) {
  const owner = t.withIdentity({
    subject: `settings-${key}`,
    email: `settings-${key}@example.com`,
    name: "Owner",
  });
  const userId = await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `Settings ${key}`,
    category: "beauty_salon",
  });
  const settingsId = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, {
      plan: paid ? "paid" : "free",
      phone: "+38970111222",
      logoUrl: "https://images.example.com/logo.png",
      websiteUrl: "https://legacy.example.com",
      instagramPageId: "legacy-page",
      tagline: "Original",
      bio: "Studio bio",
      address: "Street 12",
      city: "Skopje",
      country: "MK",
      coordinates: { lat: 41.9981, lng: 21.4254 },
    });
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    if (!settings) throw new Error("Missing settings");
    await ctx.db.patch(settings._id, {
      ...operational,
      reminderHoursBefore: [48, 3],
      emailEnabled: true,
      smsEnabled: true,
      smsReminderHoursBefore: [72, 1],
      staffNewBookingEmailEnabled: true,
      staffReminderEmailEnabled: true,
      staffReminderHoursBefore: [36, 2],
      staffEmailRecipientUserIds: [userId],
      dashboardNotificationsEnabled: false,
      dashboardSoundEnabled: false,
      dashboardToastEnabled: true,
      aiEnabled: false,
      aiInstagramEnabled: true,
      aiPersonaName: "Aria",
      aiConfidenceThreshold: 0.95,
      aiTone: "formal",
      aiLanguage: "mk",
      aiWorkingHoursEnabled: true,
      aiWorkingHours: aiHours,
      aiAwayMessage: "Call tomorrow",
      aiHandoffPhoneNumber: "+38970222333",
      aiStudioContext: "Original facts",
      aiSystemPrompt: "Original instructions",
    });
    return settings._id;
  });
  const settings = () => t.run((ctx) => ctx.db.get(settingsId));
  return { owner, orgId, userId, settings, settingsId };
}

describe("production settings compatibility", () => {
  test.each(["MKD", "EUR", "USD", "GBP"])(
    "changes currency to %s without altering booking rules or saved service prices",
    async (currency) => {
      const t = createBackend(),
        a = await studio(t);
      const serviceId = await a.owner.mutation(
        api.activation.saveFirstService,
        { name: "Haircut", durationMins: 30, priceMinorUnits: 2500 },
      );
      const beforeService = await t.run((ctx) => ctx.db.get(serviceId));
      await a.owner.mutation(api.orgSettings.updateOrgSettings, {
        orgId: a.orgId,
        currency,
      });
      expect(await a.settings()).toMatchObject({
        ...operational,
        currency,
        reminderHoursBefore: [48, 3],
        aiConfidenceThreshold: 0.95,
      });
      expect(await t.run((ctx) => ctx.db.get(serviceId))).toMatchObject({
        priceMinorUnits: beforeService?.priceMinorUnits,
        currency: beforeService?.currency,
      });
    },
  );
  test("partial booking saves preserve regional settings and concurrent currency changes", async () => {
    const t = createBackend(),
      a = await studio(t);
    await a.owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId: a.orgId,
      currency: "GBP",
    });
    await a.owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId: a.orgId,
      bufferTimeMins: 10,
    });
    expect(await a.settings()).toMatchObject({
      ...operational,
      currency: "GBP",
      bufferTimeMins: 10,
    });
  });
  test("still accepts the complete operational payload used by older clients", async () => {
    const t = createBackend(),
      a = await studio(t);
    await a.owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId: a.orgId,
      ...operational,
      currency: "USD",
      bookingWindowDays: 120,
    });
    expect(await a.settings()).toMatchObject({
      ...operational,
      currency: "USD",
      bookingWindowDays: 120,
    });
  });
  test("rejects calendar intervals that would make an existing service unbookable", async () => {
    const t = createBackend(),
      a = await studio(t);
    await a.owner.mutation(api.activation.saveFirstService, {
      name: "Haircut",
      durationMins: 30,
      priceMinorUnits: 2500,
    });
    await expect(
      a.owner.mutation(api.orgSettings.updateOrgSettings, {
        orgId: a.orgId,
        slotDurationMins: 20,
        quickBookingDurationMins: 40,
      }),
    ).rejects.toThrow("existing service durations");
    expect(await a.settings()).toMatchObject(operational);
  });
  test("profile edits and clearing optional copy preserve branding, legacy links and location", async () => {
    const t = createBackend(),
      a = await studio(t);
    const before = await t.run((ctx) => ctx.db.get(a.orgId));
    await a.owner.mutation(api.orgSettings.updateStudioProfile, {
      orgId: a.orgId,
      name: " Updated Studio ",
      tagline: "",
    });
    expect(await t.run((ctx) => ctx.db.get(a.orgId))).toMatchObject({
      name: "Updated Studio",
      logoUrl: before?.logoUrl,
      bio: before?.bio,
      phone: before?.phone,
      websiteUrl: before?.websiteUrl,
      instagramPageId: before?.instagramPageId,
      address: before?.address,
      coordinates: before?.coordinates,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(a.orgId)))?.tagline,
    ).toBeUndefined();
    expect(await a.settings()).toMatchObject(operational);
  });
  test("client reminders do not overwrite team, SMS or dashboard notification settings", async () => {
    const t = createBackend(),
      a = await studio(t);
    await a.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
      orgId: a.orgId,
      customerReminderHoursBefore: [72, 3],
    });
    expect(await a.settings()).toMatchObject({
      emailEnabled: true,
      reminderHoursBefore: [72, 3],
      smsEnabled: true,
      smsReminderHoursBefore: [72, 1],
      staffReminderEmailEnabled: true,
      staffReminderHoursBefore: [36, 2],
      staffEmailRecipientUserIds: [a.userId],
      dashboardSoundEnabled: false,
    });
  });
  test("a Free studio can change team mail without changing legacy client reminders", async () => {
    const t = createBackend(),
      a = await studio(t, "free", false);
    await a.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
      orgId: a.orgId,
      staffNewBookingEmailEnabled: false,
      staffReminderHoursBefore: [48, 2],
    });
    expect(await a.settings()).toMatchObject({
      emailEnabled: true,
      reminderHoursBefore: [48, 3],
      staffNewBookingEmailEnabled: false,
      staffReminderHoursBefore: [48, 2],
      smsReminderHoursBefore: [72, 1],
    });
    await expect(
      a.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
        orgId: a.orgId,
        customerReminderHoursBefore: [24, 2],
      }),
    ).rejects.toThrow("paid plan");
  });
  test("older complete email payloads and explicit recipient removal remain supported", async () => {
    const t = createBackend(),
      a = await studio(t);
    await a.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
      orgId: a.orgId,
      customerReminderEmailEnabled: false,
      customerReminderHoursBefore: [48, 3],
      staffNewBookingEmailEnabled: false,
      staffReminderEmailEnabled: true,
      staffReminderHoursBefore: [36, 2],
      staffEmailRecipientUserIds: [],
    });
    expect(await a.settings()).toMatchObject({
      emailEnabled: false,
      reminderHoursBefore: [48, 3],
      staffNewBookingEmailEnabled: false,
      staffReminderEmailEnabled: true,
      staffReminderHoursBefore: [36, 2],
      staffEmailRecipientUserIds: [],
      smsEnabled: true,
    });
  });
  test("context edits preserve stricter AI confidence, custom schedules and mixed legacy activation flags", async () => {
    const t = createBackend(),
      a = await studio(t);
    await a.owner.mutation(api.orgSettings.updateAiSettings, {
      orgId: a.orgId,
      aiStudioContext: "Updated facts",
    });
    expect(await a.settings()).toMatchObject({
      aiStudioContext: "Updated facts",
      aiConfidenceThreshold: 0.95,
      aiTone: "formal",
      aiLanguage: "mk",
      aiWorkingHoursEnabled: true,
      aiWorkingHours: aiHours,
      aiEnabled: false,
      aiInstagramEnabled: true,
      aiSystemPrompt: "Original instructions",
      aiHandoffPhoneNumber: "+38970222333",
    });
    await a.owner.mutation(api.orgSettings.updateAiSettings, {
      orgId: a.orgId,
      aiEnabled: true,
      aiInstagramEnabled: true,
    });
    expect(await a.settings()).toMatchObject({
      aiEnabled: true,
      aiInstagramEnabled: true,
      aiConfidenceThreshold: 0.95,
    });
  });
  test("new partial mutations retain owner and tenant authorization", async () => {
    const t = createBackend(),
      a = await studio(t),
      b = await studio(t, "two");
    const member = t.withIdentity({
      subject: "settings-staff",
      email: "settings-staff@example.com",
      name: "Staff",
    });
    const staffUserId = await member.mutation(api.users.ensureUser);
    await t.run(async (ctx) => {
      const ownerStaff = await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
        .first();
      if (!ownerStaff) throw new Error("Missing owner");
      const { _id, _creationTime, ...fields } = ownerStaff;
      void _id;
      void _creationTime;
      await ctx.db.insert("staff_members", {
        ...fields,
        userId: staffUserId,
        role: "staff",
        bookingAccess: "own",
      });
    });
    await expect(
      member.mutation(api.orgSettings.updateOrgSettings, {
        orgId: a.orgId,
        currency: "USD",
      }),
    ).rejects.toThrow();
    await expect(
      member.mutation(api.orgSettings.updateStudioProfile, {
        orgId: a.orgId,
        name: "Changed",
      }),
    ).rejects.toThrow();
    await expect(
      member.mutation(api.orgSettings.updateEmailNotificationSettings, {
        orgId: a.orgId,
        staffNewBookingEmailEnabled: false,
      }),
    ).rejects.toThrow();
    await expect(
      member.mutation(api.orgSettings.updateAiSettings, {
        orgId: a.orgId,
        aiStudioContext: "Changed",
      }),
    ).rejects.toThrow();
    await expect(
      b.owner.mutation(api.orgSettings.updateStudioProfile, {
        orgId: a.orgId,
        name: "Changed",
      }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      a.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
        orgId: a.orgId,
        staffEmailRecipientUserIds: [b.userId],
      }),
    ).rejects.toThrow("no longer have dashboard access");
    expect((await t.run((ctx) => ctx.db.get(a.orgId)))?.name).toBe(
      "Settings one",
    );
  });
});
