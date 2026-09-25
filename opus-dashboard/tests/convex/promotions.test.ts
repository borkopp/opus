import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { convexModules } from "../../convex-test.setup";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;
const DATE = "2026-09-26";

async function studio(t: Backend, name = "Luna") {
  const owner = t.withIdentity({ subject: name, email: `${name}@example.com` });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name,
    category: "nail_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Gel nails",
    durationMins: 45,
    priceMinorUnits: 120000,
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
    await ctx.db.patch(orgId, {
      plan: "free",
      address: "Test Street 10",
      city: "Skopje",
      country: "MK",
      coordinates: { lat: 41.99, lng: 21.43 },
      phone: "+38970123456",
      websiteStatus: "published",
    });
    const settings = (await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first())!;
    await ctx.db.patch(settings._id, {
      bufferTimeMins: 15,
      slotDurationMins: 15,
      bookingWindowDays: 7,
      timezone: "Europe/Skopje",
    });
    return (await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first())!._id;
  });
  return { owner, orgId, serviceId, staffId };
}

describe("Free studio promotion tools", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T06:00:00Z"));
    vi.stubEnv("ROOT_DOMAIN", "opus.mk");
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test("requires active membership, supports Free and Pro, and derives the tenant", async () => {
    const t = backend();
    await expect(
      t.query(api.promotions.getWorkspace, { language: "mk" }),
    ).rejects.toThrow("Unauthenticated");
    const a = await studio(t),
      b = await studio(t, "Mila");
    const id = await a.owner.mutation(api.promotions.saveReply, {
      title: "Welcome",
      body: "Hello from {{studio_name}}",
      language: "en",
    });
    const free = await a.owner.query(api.promotions.getWorkspace, {
      language: "en",
    });
    expect(free).toMatchObject({
      orgId: a.orgId,
      name: "Luna",
      published: true,
      bookingUrl: "https://luna.opus.mk/book",
      today: "2026-09-25",
      maxDate: "2026-10-01",
      canManageReplies: true,
    });
    expect(free.replies[0]).toMatchObject({ id, text: "Hello from Luna" });
    expect(
      (await b.owner.query(api.promotions.getWorkspace, { language: "en" }))
        .replies,
    ).toEqual([]);
    await expect(
      b.owner.mutation(api.promotions.saveReply, {
        id,
        expectedUpdatedAt: free.replies[0].updatedAt,
        title: "Stolen",
        body: "Changed",
        language: "en",
      }),
    ).rejects.toThrow("Reply not found");
    await expect(
      b.owner.mutation(api.promotions.removeReply, {
        id,
        expectedUpdatedAt: free.replies[0].updatedAt,
      }),
    ).rejects.toThrow("Reply not found");
    await t.run((ctx) => ctx.db.patch(a.orgId, { plan: "paid" }));
    expect(
      (await a.owner.query(api.promotions.getWorkspace, { language: "en" }))
        .replies[0].id,
    ).toBe(id);
    await t.run((ctx) => ctx.db.patch(a.staffId, { isActive: false }));
    await expect(
      a.owner.query(api.promotions.getWorkspace, { language: "en" }),
    ).rejects.toThrow("Unauthorised");
  });

  test("updates dynamic details, prevents stale edits, soft-deletes and audits", async () => {
    const t = backend(),
      a = await studio(t);
    const id = await a.owner.mutation(api.promotions.saveReply, {
      title: "Booking",
      body: "{{studio_name}}: {{booking_link}}",
      language: "mk",
    });
    const first = (
      await a.owner.query(api.promotions.getWorkspace, { language: "mk" })
    ).replies[0];
    await t.run((ctx) => ctx.db.patch(a.orgId, { name: "Luna Studio" }));
    expect(
      (await a.owner.query(api.promotions.getWorkspace, { language: "mk" }))
        .replies[0].text,
    ).toBe("Luna Studio: https://luna.opus.mk/book");
    await a.owner.mutation(api.promotions.saveReply, {
      id,
      expectedUpdatedAt: first.updatedAt,
      title: "New title",
      body: first.body,
      language: "mk",
    });
    await expect(
      a.owner.mutation(api.promotions.saveReply, {
        id,
        expectedUpdatedAt: first.updatedAt,
        title: "Old edit",
        body: "Old",
        language: "mk",
      }),
    ).rejects.toThrow("This reply changed");
    const current = (
      await a.owner.query(api.promotions.getWorkspace, { language: "mk" })
    ).replies[0];
    await a.owner.mutation(api.promotions.removeReply, {
      id,
      expectedUpdatedAt: current.updatedAt,
    });
    expect(
      (await a.owner.query(api.promotions.getWorkspace, { language: "mk" }))
        .replies,
    ).toEqual([]);
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      isDeleted: true,
      deletedAt: expect.any(Number),
    });
    const audit = await t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", a.orgId))
        .collect(),
    );
    expect(
      audit.filter((row) => row.resourceId === id).map((row) => row.action),
    ).toEqual([
      "promotion.reply.created",
      "promotion.reply.updated",
      "promotion.reply.removed",
    ]);
  });

  test("staff can read replies but only owners and managers can manage them", async () => {
    const t = backend(),
      a = await studio(t);
    const id = await a.owner.mutation(api.promotions.saveReply, {
      title: "Team",
      body: "Hello",
      language: "en",
    });
    const reply = (
      await a.owner.query(api.promotions.getWorkspace, { language: "en" })
    ).replies[0];
    await t.run((ctx) => ctx.db.patch(a.staffId, { role: "staff" }));
    expect(
      await a.owner.query(api.promotions.getWorkspace, { language: "en" }),
    ).toMatchObject({
      canManageReplies: false,
      replies: [expect.objectContaining({ id })],
    });
    await expect(
      a.owner.mutation(api.promotions.saveReply, {
        title: "Not allowed",
        body: "Hello",
        language: "en",
      }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      a.owner.mutation(api.promotions.removeReply, {
        id,
        expectedUpdatedAt: reply.updatedAt,
      }),
    ).rejects.toThrow("Unauthorised");
  });

  test("rejects invalid templates and keeps missing details visible", async () => {
    const t = backend(),
      a = await studio(t);
    await expect(
      a.owner.mutation(api.promotions.saveReply, {
        title: " ",
        body: "Hello",
        language: "en",
      }),
    ).rejects.toThrow("Enter a title");
    await expect(
      a.owner.mutation(api.promotions.saveReply, {
        title: "Invalid",
        body: "{{customer_email}}",
        language: "en",
      }),
    ).rejects.toThrow("supported studio details");
    await expect(
      a.owner.mutation(api.promotions.saveReply, {
        title: "Long",
        body: "a".repeat(2001),
        language: "en",
      }),
    ).rejects.toThrow("2,000");
    await t.run((ctx) =>
      ctx.db.patch(a.orgId, { websiteStatus: "unpublished", phone: undefined }),
    );
    const data = await a.owner.query(api.promotions.getWorkspace, {
      language: "mk",
    });
    expect(data.published).toBe(false);
    expect(
      data.starters.find((reply) => reply.key === "booking")?.missing,
    ).toContain("booking_link");
    expect(
      data.starters.find((reply) => reply.key === "directions")?.missing,
    ).toContain("phone");
  });

  test("promotes exactly public bookable slots and removes a newly booked opening", async () => {
    const t = backend(),
      a = await studio(t);
    const args = {
      serviceId: a.serviceId,
      staffId: a.staffId,
      date: DATE,
      refreshMinute: 0,
    };
    const shared = await a.owner.query(api.promotions.getOpenings, args);
    const publicSlots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: a.orgId,
      serviceId: a.serviceId,
      staffId: a.staffId,
      date: DATE,
    });
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.map((slot) => slot.startAt)).toEqual(
      publicSlots.map((slot) => slot.startAt),
    );
    expect(shared[0]).toMatchObject({
      priceMinorUnits: 120000,
      currency: "MKD",
      staffId: a.staffId,
    });
    const startAt = shared[0].startAt;
    await a.owner.mutation(api.bookings.createManualBooking, {
      orgId: a.orgId,
      staffId: a.staffId,
      serviceIds: [a.serviceId],
      customerName: "Ana",
      startAt,
    });
    const fresh = await a.owner.query(api.promotions.getOpenings, {
      ...args,
      refreshMinute: 1,
    });
    expect(fresh.every((slot) => slot.startAt >= startAt + 60 * 60_000)).toBe(
      true,
    );
    expect(
      await a.owner.query(api.promotions.getOpenings, {
        ...args,
        date: "2026-10-02",
      }),
    ).toEqual([]);
    expect(
      await a.owner.query(api.promotions.getOpenings, {
        ...args,
        date: "2026-02-31",
      }),
    ).toEqual([]);
    await t.run((ctx) => ctx.db.patch(a.serviceId, { isOpusVisible: false }));
    expect(await a.owner.query(api.promotions.getOpenings, args)).toEqual([]);
  });

  test("does not promote another studio, unpublished sites, hospitality, or elapsed slots", async () => {
    const t = backend(),
      a = await studio(t),
      b = await studio(t, "Mila");
    const args = {
      serviceId: a.serviceId,
      staffId: a.staffId,
      date: DATE,
      refreshMinute: 0,
    };
    expect(await b.owner.query(api.promotions.getOpenings, args)).toEqual([]);
    expect(
      await a.owner.query(api.promotions.getOpenings, {
        ...args,
        staffId: b.staffId,
      }),
    ).toEqual([]);
    vi.setSystemTime(new Date("2026-09-26T14:00:00Z")); // 16:00 studio wall clock
    const late = await a.owner.query(api.promotions.getOpenings, {
      ...args,
      refreshMinute: 100,
    });
    expect(late).toEqual([]); // 45-minute service + buffer cannot fit after notice
    await t.run((ctx) =>
      ctx.db.patch(a.orgId, { websiteStatus: "unpublished" }),
    );
    expect(await a.owner.query(api.promotions.getOpenings, args)).toEqual([]);
    await t.run((ctx) => ctx.db.patch(a.orgId, { industry: "hospitality" }));
    await expect(
      a.owner.query(api.promotions.getWorkspace, { language: "en" }),
    ).rejects.toThrow("beauty studios");
  });
});
