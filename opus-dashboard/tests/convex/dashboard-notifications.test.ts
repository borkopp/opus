import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import type { FunctionReturnType } from "convex/server";
import { api, internal } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const NOW = Date.parse("2026-10-19T10:00:00Z");
const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("EXPO_PUSH_ENABLED", "false");
  vi.stubEnv("WEB_PUSH_ENABLED", "false");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function studio(t: Backend, key = "one") {
  const owner = t.withIdentity({
    subject: `inbox-${key}`,
    email: `inbox-${key}@example.invalid`,
    name: "Inbox owner",
  });
  const userId = await owner.mutation(api.users.ensureUser, {});
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `Inbox ${key}`,
    category: "hair_salon",
  });
  return { owner, userId, orgId };
}

async function teammate(
  t: Backend,
  orgId: Id<"orgs">,
  bookingAccess: "team" | "own" = "team",
) {
  const staff = t.withIdentity({
    subject: `staff-${orgId}-${bookingAccess}`,
    email: `${bookingAccess}@example.invalid`,
    name: "Teammate",
  });
  const userId = await staff.mutation(api.users.ensureUser, {});
  const staffId = await t.run(async (ctx) => {
    await ctx.db.patch(userId, { activeOrgId: orgId });
    return ctx.db.insert("staff_members", {
      orgId,
      userId,
      displayName: "Teammate",
      specialties: [],
      role: "staff",
      bookingAccess,
      isActive: true,
      isDeleted: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
  return { staff, userId, staffId };
}

function notification(
  t: Backend,
  orgId: Id<"orgs">,
  overrides: Partial<
    Omit<Doc<"dashboard_notifications">, "_id" | "_creationTime" | "orgId">
  > = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("dashboard_notifications", {
      orgId,
      type: "new_booking",
      title: "New Booking",
      body: "A booking was added.",
      isRead: false,
      isDismissed: false,
      createdAt: NOW,
      ...overrides,
    }),
  );
}

async function booking(
  t: Backend,
  business: Awaited<ReturnType<typeof studio>>,
) {
  const serviceId = await business.owner.mutation(
    api.activation.saveFirstService,
    {
      name: "Haircut",
      durationMins: 30,
      priceMinorUnits: 1500,
    },
  );
  return t.run(async (ctx) => {
    const service = await ctx.db.get(serviceId);
    const customerId = await ctx.db.insert("customers", {
      orgId: business.orgId,
      name: "Client",
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    return ctx.db.insert("bookings", {
      orgId: business.orgId,
      customerId,
      staffId: service!.staffIds[0],
      serviceId,
      startAt: Date.parse("2026-10-22T00:15:00Z"),
      endAt: Date.parse("2026-10-22T00:45:00Z"),
      priceMinorUnits: 1500,
      currency: "MKD",
      surgePriceApplied: false,
      status: "confirmed",
      source: "manual",
      isDeleted: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
}

describe("personal dashboard inbox", () => {
  it("keeps read and dismiss actions personal without changing legacy rows", async () => {
    const t = createBackend();
    const { owner, userId, orgId } = await studio(t);
    const { staff } = await teammate(t, orgId);
    const first = await notification(t, orgId);
    const second = await notification(t, orgId);
    await owner.mutation(api.dashboardNotifications.markRead, {
      orgId,
      notificationId: first,
    });
    await owner.mutation(api.dashboardNotifications.dismiss, {
      orgId,
      notificationId: second,
    });
    await owner.mutation(api.dashboardNotifications.markRead, {
      orgId,
      notificationId: second,
    });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(0);
    expect(
      await staff.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(2);
    expect(
      (await owner.query(api.dashboardNotifications.list, { orgId })).map(
        (row) => row._id,
      ),
    ).toEqual([first]);
    expect(
      await staff.query(api.dashboardNotifications.list, { orgId }),
    ).toHaveLength(2);
    expect(await t.run((ctx) => ctx.db.get(first))).toMatchObject({
      isRead: false,
      isDismissed: false,
    });
    expect(await t.run((ctx) => ctx.db.get(second))).toMatchObject({
      isRead: false,
      isDismissed: false,
    });
    const states = await t.run((ctx) =>
      ctx.db
        .query("dashboard_notification_states")
        .withIndex("by_org_user", (q) =>
          q.eq("orgId", orgId).eq("userId", userId),
        )
        .collect(),
    );
    expect(states).toHaveLength(2);
  });

  it("preserves legacy shared read and dismissed decisions for every teammate", async () => {
    const t = createBackend();
    const { owner, orgId } = await studio(t);
    const { staff } = await teammate(t, orgId);
    const read = await notification(t, orgId, { isRead: true });
    const dismissed = await notification(t, orgId, { isDismissed: true });
    await notification(t, orgId);
    for (const identity of [owner, staff]) {
      const rows = await identity.query(api.dashboardNotifications.list, {
        orgId,
      });
      expect(rows.find((row) => row._id === read)?.isRead).toBe(true);
      expect(rows.find((row) => row._id === dismissed)).toBeUndefined();
      expect(
        await identity.query(api.dashboardNotifications.getUnreadCount, {
          orgId,
        }),
      ).toBe(1);
    }
  });

  it("marks all existing items read with one personal watermark and keeps same-millisecond arrivals unread", async () => {
    const t = createBackend();
    const { owner, userId, orgId } = await studio(t);
    const { staff } = await teammate(t, orgId);
    const first = await notification(t, orgId);
    await notification(t, orgId);
    await owner.mutation(api.dashboardNotifications.markAllRead, { orgId });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(0);
    expect(
      await staff.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(2);
    const later = await notification(t, orgId);
    const rows = await owner.query(api.dashboardNotifications.list, { orgId });
    expect(rows.find((row) => row._id === first)?.isRead).toBe(true);
    expect(rows.find((row) => row._id === later)?.isRead).toBe(false);
    expect(
      await owner.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(1);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("dashboard_notification_states")
          .withIndex("by_org_user", (q) =>
            q.eq("orgId", orgId).eq("userId", userId),
          )
          .collect(),
      ),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("dashboard_inbox_states")
          .withIndex("by_org_user", (q) =>
            q.eq("orgId", orgId).eq("userId", userId),
          )
          .collect(),
      ),
    ).toHaveLength(1);
  });

  it("paginates past empty filtered pages to unread history older than the bell's 50 rows", async () => {
    const t = createBackend();
    const { owner, orgId } = await studio(t);
    const older: Id<"dashboard_notifications">[] = [];
    for (let index = 0; index < 65; index++) {
      const id = await notification(t, orgId, {
        createdAt: NOW + index,
        isRead: index >= 15,
      });
      if (index < 15) older.push(id);
    }
    expect(
      await owner.query(api.dashboardNotifications.list, { orgId }),
    ).toHaveLength(50);
    expect(
      await owner.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(15);
    let cursor: string | null = null;
    const found: Id<"dashboard_notifications">[] = [];
    let done = false;
    let pages = 0;
    while (!done) {
      const result: FunctionReturnType<
        typeof api.dashboardNotifications.listPage
      > = await owner.query(api.dashboardNotifications.listPage, {
        orgId,
        unreadOnly: true,
        paginationOpts: { cursor, numItems: 20 },
      });
      if (pages === 0) {
        expect(result.page).toEqual([]);
        expect(result.isDone).toBe(false);
      }
      found.push(...result.page.map((row) => row._id));
      cursor = result.continueCursor;
      done = result.isDone;
      pages++;
      expect(pages).toBeLessThan(10);
    }
    expect(found).toEqual(older.reverse());
  });

  it("normalizes historical reschedules, stores new ones distinctly, and filters them server-side", async () => {
    const t = createBackend();
    const { owner, orgId } = await studio(t);
    const legacy = await notification(t, orgId, {
      title: "Booking Rescheduled",
    });
    await notification(t, orgId);
    await owner.mutation(internal.dashboardNotifications.create, {
      orgId,
      type: "new_booking",
      title: "Booking Rescheduled",
      body: "Moved",
      queuePush: false,
    });
    const result = await owner.query(api.dashboardNotifications.listPage, {
      orgId,
      type: "booking_changed",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(result.page).toHaveLength(2);
    expect(result.page.every((row) => row.type === "booking_changed")).toBe(
      true,
    );
    expect(result.page.some((row) => row._id === legacy)).toBe(true);
    expect(
      await t.run((ctx) =>
        ctx.db.get(result.page.find((row) => row._id !== legacy)!._id),
      ),
    ).toMatchObject({ type: "booking_changed" });
  });

  it("reports 99+ only after confirming 100 unread notifications", async () => {
    const t = createBackend();
    const { owner, orgId } = await studio(t);
    await t.run(async (ctx) => {
      for (let index = 0; index < 100; index++) {
        await ctx.db.insert("dashboard_notifications", {
          orgId,
          type: "new_booking",
          title: "New Booking",
          body: "A booking was added.",
          isRead: false,
          isDismissed: false,
          createdAt: NOW + index,
        });
      }
    });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 100, hasMore: false });
    await notification(t, orgId);
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 100, hasMore: true });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(100);
  });

  it("bounds personally handled history without claiming unscanned rows are unread", async () => {
    const t = createBackend();
    const { owner, userId, orgId } = await studio(t);
    const { staff } = await teammate(t, orgId);
    const oldest = await notification(t, orgId);
    await t.run(async (ctx) => {
      for (let index = 0; index < 210; index++) {
        const notificationId = await ctx.db.insert("dashboard_notifications", {
          orgId,
          type: "new_booking",
          title: "New Booking",
          body: "A booking was added.",
          isRead: false,
          isDismissed: false,
          createdAt: NOW + index,
        });
        await ctx.db.insert("dashboard_notification_states", {
          orgId,
          userId,
          notificationId,
          isRead: true,
          isDismissed: index % 2 === 0,
          isDeleted: false,
          createdAt: NOW,
          updatedAt: NOW,
        });
      }
    });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 0, hasMore: true });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadCount, { orgId }),
    ).toBe(0);
    await owner.mutation(api.dashboardNotifications.markRead, {
      orgId,
      notificationId: oldest,
    });
    // Every item is now personally read. The bounded scan still correctly
    // reports uncertainty instead of inventing a positive unread badge.
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 0, hasMore: true });
    expect(
      await staff.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 100, hasMore: true });
    await notification(t, orgId);
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 1, hasMore: true });
    await owner.mutation(api.dashboardNotifications.markAllRead, { orgId });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 0, hasMore: false });
    await notification(t, orgId);
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 1, hasMore: false });
  });

  it("bounds raw legacy-dismissed rows before filtering them", async () => {
    const t = createBackend();
    const { owner, orgId } = await studio(t);
    await notification(t, orgId);
    await t.run(async (ctx) => {
      for (let index = 0; index < 210; index++) {
        await ctx.db.insert("dashboard_notifications", {
          orgId,
          type: "new_booking",
          title: "New Booking",
          body: "A booking was added.",
          isRead: false,
          isDismissed: true,
          createdAt: NOW + index,
        });
      }
    });
    // A query.filter(...).take(201) would incorrectly scan past all 210
    // dismissed rows and return the older unread item as an exact total.
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 0, hasMore: true });
    await owner.mutation(api.dashboardNotifications.markAllRead, { orgId });
    expect(
      await owner.query(api.dashboardNotifications.getUnreadSummary, { orgId }),
    ).toEqual({ count: 0, hasMore: false });
  });

  it("links the exact appointment on its studio wall-clock date, excluding deleted and foreign targets", async () => {
    const t = createBackend();
    const a = await studio(t),
      b = await studio(t, "two");
    const bookingId = await booking(t, a);
    const own = await notification(t, a.orgId, { bookingId });
    const foreign = await notification(t, b.orgId, { bookingId });
    const rows = await a.owner.query(api.dashboardNotifications.list, {
      orgId: a.orgId,
    });
    expect(rows.find((row) => row._id === own)).toMatchObject({
      bookingDate: "2026-10-22",
      href: `/beauty/bookings?booking=${bookingId}&date=2026-10-22`,
    });
    expect(
      (
        await b.owner.query(api.dashboardNotifications.list, { orgId: b.orgId })
      ).find((row) => row._id === foreign)?.href,
    ).toBeNull();
    await t.run((ctx) =>
      ctx.db.patch(bookingId, {
        status: "cancelled",
        cancellationReason: "Rescheduled",
      }),
    );
    expect(
      (
        await a.owner.query(api.dashboardNotifications.list, { orgId: a.orgId })
      )[0].href,
    ).toBeNull();
    // An ordinary cancellation remains inspectable in the calendar.
    await t.run((ctx) =>
      ctx.db.patch(bookingId, { cancellationReason: "Cancelled by business" }),
    );
    expect(
      (
        await a.owner.query(api.dashboardNotifications.list, { orgId: a.orgId })
      )[0].href,
    ).toBe(`/beauty/bookings?booking=${bookingId}&date=2026-10-22`);
    await t.run((ctx) =>
      ctx.db.patch(bookingId, { isDeleted: true, deletedAt: NOW }),
    );
    expect(
      (
        await a.owner.query(api.dashboardNotifications.list, { orgId: a.orgId })
      )[0].href,
    ).toBeNull();
  });

  it("preserves authentication, current studio membership, own-only, and hospitality boundaries", async () => {
    const t = createBackend();
    const a = await studio(t),
      b = await studio(t, "two");
    const { staff, staffId } = await teammate(t, a.orgId, "own");
    const foreign = await notification(t, b.orgId);
    await expect(
      t.query(api.dashboardNotifications.list, { orgId: a.orgId }),
    ).rejects.toThrow("Unauthenticated");
    await expect(
      a.owner.query(api.dashboardNotifications.listPage, {
        orgId: b.orgId,
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      a.owner.mutation(api.dashboardNotifications.dismiss, {
        orgId: a.orgId,
        notificationId: foreign,
      }),
    ).rejects.toThrow("Not found");
    await expect(
      staff.query(api.dashboardNotifications.getUnreadCount, {
        orgId: a.orgId,
      }),
    ).rejects.toThrow("own appointments only");
    await expect(
      staff.mutation(api.dashboardNotifications.markAllRead, {
        orgId: a.orgId,
      }),
    ).rejects.toThrow("own appointments only");
    await t.run((ctx) => ctx.db.patch(staffId, { isActive: false }));
    await expect(
      staff.query(api.dashboardNotifications.list, { orgId: a.orgId }),
    ).rejects.toThrow("Unauthorised");
    const blockedNotification = await notification(t, a.orgId);
    await t.run((ctx) => ctx.db.patch(a.orgId, { industry: "hospitality" }));
    await expect(
      a.owner.query(api.dashboardNotifications.list, { orgId: a.orgId }),
    ).rejects.toThrow("beauty studios only");
    await expect(
      a.owner.query(api.dashboardNotifications.listPage, {
        orgId: a.orgId,
        paginationOpts: { cursor: null, numItems: 20 },
      }),
    ).rejects.toThrow("beauty studios only");
    await expect(
      a.owner.query(api.dashboardNotifications.getUnreadCount, {
        orgId: a.orgId,
      }),
    ).rejects.toThrow("beauty studios only");
    await expect(
      a.owner.query(api.dashboardNotifications.getUnreadSummary, {
        orgId: a.orgId,
      }),
    ).rejects.toThrow("beauty studios only");
    for (const mutate of [
      api.dashboardNotifications.markRead,
      api.dashboardNotifications.dismiss,
    ]) {
      await expect(
        a.owner.mutation(mutate, {
          orgId: a.orgId,
          notificationId: blockedNotification,
        }),
      ).rejects.toThrow("beauty studios only");
    }
    await expect(
      a.owner.mutation(api.dashboardNotifications.markAllRead, {
        orgId: a.orgId,
      }),
    ).rejects.toThrow("beauty studios only");
  });
});
