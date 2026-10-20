import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import { scheduleBookingCompletion } from "../../convex/lib/bookingCompletion";
import { wallClockTimestampToInstant } from "../../convex/lib/bookingTime";
import type { Id } from "../../convex/_generated/dataModel";
import type { Doc } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;

async function studio(t: Backend, key = "completion") {
  const owner = t.withIdentity({
    subject: `${key}-owner`,
    email: `${key}-owner@example.com`,
    name: "Studio Owner",
  });
  const ownerUserId = await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} studio`,
    category: "beauty_salon",
  });
  const fixture = await t.run(async (ctx) => {
    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", ownerUserId),
      )
      .unique();
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .unique();
    if (!staff || !settings) throw new Error("Studio fixture is incomplete.");
    await ctx.db.patch(settings._id, { timezone: "Europe/Skopje" });
    const serviceId = await ctx.db.insert("services", {
      orgId,
      name: "Treatment",
      durationMins: 30,
      priceMinorUnits: 1_800,
      currency: "MKD",
      staffIds: [staff._id],
      isOpusVisible: true,
      popularityScore: 0,
      isActive: true,
      isDeleted: false,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const customerId = await ctx.db.insert("customers", {
      orgId,
      name: "Appointment Client",
      email: "client@example.com",
      totalVisits: 3,
      totalSpendMinorUnits: 600,
      noShowCount: 1,
      noShowRiskScore: 1 / 3,
      whatsappOptIn: false,
      marketingOptIn: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return {
      staffId: staff._id,
      settingsId: settings._id,
      serviceId,
      customerId,
    };
  });
  return { ...fixture, t, owner, ownerUserId, orgId };
}

type Studio = Awaited<ReturnType<typeof studio>>;

async function booking(
  s: Studio,
  overrides: Partial<
    Pick<
      Doc<"bookings">,
      "status" | "startAt" | "endAt" | "isDeleted" | "priceMinorUnits"
    >
  > = {},
) {
  return s.t.run((ctx) =>
    ctx.db.insert("bookings", {
      orgId: s.orgId,
      customerId: s.customerId,
      staffId: s.staffId,
      serviceId: s.serviceId,
      startAt: Date.parse("2026-10-20T09:30:00Z"),
      endAt: Date.parse("2026-10-20T10:00:00Z"),
      priceMinorUnits: 1_800,
      currency: "MKD",
      surgePriceApplied: false,
      status: "confirmed",
      source: "manual",
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    }),
  );
}

async function completedAudits(s: Studio) {
  return s.t.run((ctx) =>
    ctx.db
      .query("audit_log")
      .withIndex("by_org_action", (q) =>
        q.eq("orgId", s.orgId).eq("action", "booking.completed"),
      )
      .collect(),
  );
}

async function schedule(s: Studio, bookingId: Id<"bookings">) {
  return s.t.run(async (ctx) => {
    const row = await ctx.db.get(bookingId);
    const settings = await ctx.db.get(s.settingsId);
    if (!row || !settings) throw new Error("Missing fixture");
    return scheduleBookingCompletion(ctx, row, settings.timezone);
  });
}

async function job(s: Studio, bookingId: Id<"bookings">) {
  const row = await s.t.run((ctx) => ctx.db.get(bookingId));
  if (!row?.autoCompletionJobId || row.autoCompletionScheduledFor === undefined)
    throw new Error("Expected scheduled completion");
  return {
    orgId: s.orgId,
    bookingId,
    expectedEndAt: row.endAt,
    scheduledFor: row.autoCompletionScheduledFor,
  };
}

async function completeNow(s: Studio, bookingId: Id<"bookings">) {
  const args = await job(s, bookingId);
  vi.setSystemTime(args.scheduledFor);
  await s.t.mutation(internal.bookings.completeScheduledBooking, args);
  return args;
}

async function operationalStudio(t: Backend) {
  const s = await studio(t);
  await s.owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "08:00",
      close: "20:00",
      isClosed: false,
    })),
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(s.serviceId, { staffIds: [s.staffId] });
    await ctx.db.patch(s.settingsId, { bufferTimeMins: 0 });
  });
  return s;
}

describe("scheduled appointment completion", () => {
  let t: Backend;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T07:00:00Z"));
    vi.stubEnv("BOOKING_AUTO_COMPLETION_ENABLED", undefined);
    vi.stubEnv("BOOKING_AUTO_COMPLETION_ORG_IDS", undefined);
    t = createBackend();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test.each([
    { enabled: undefined, ids: undefined },
    { enabled: "", ids: "" },
    { enabled: "true", ids: "obsolete-studio-id" },
  ])(
    "schedules all studios by default with enabled=$enabled and obsolete allowlist=$ids",
    async ({ enabled, ids }) => {
      vi.stubEnv("BOOKING_AUTO_COMPLETION_ENABLED", enabled);
      vi.stubEnv("BOOKING_AUTO_COMPLETION_ORG_IDS", ids);
      const studios = [await studio(t), await studio(t, "other")];
      for (const s of studios) {
        const bookingId = await booking(s);
        expect(await schedule(s, bookingId)).toBe(true);
        await t.mutation(internal.bookings.setupAutomaticCompletionForOrg, {
          orgId: s.orgId,
        });
        expect((await job(s, bookingId)).scheduledFor).toBe(
          wallClockTimestampToInstant(
            Date.parse("2026-10-20T10:00:00Z"),
            "Europe/Skopje",
          ),
        );
        expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
          "confirmed",
        );
        expect(await completedAudits(s)).toHaveLength(0);
      }
    },
  );

  test("an explicit global off switch prevents new jobs and setup for every studio", async () => {
    vi.stubEnv("BOOKING_AUTO_COMPLETION_ENABLED", "false");
    const studios = [await studio(t), await studio(t, "other")];
    vi.stubEnv(
      "BOOKING_AUTO_COMPLETION_ORG_IDS",
      studios.map((s) => s.orgId).join(","),
    );
    await expect(
      t.mutation(internal.bookings.setupAutomaticCompletionForAllStudios, {}),
    ).rejects.toThrow("Automatic completion is temporarily disabled.");
    for (const s of studios) {
      const bookingId = await booking(s);
      expect(await schedule(s, bookingId)).toBe(false);
      await expect(
        t.mutation(internal.bookings.setupAutomaticCompletionForOrg, {
          orgId: s.orgId,
        }),
      ).rejects.toThrow();
      expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
        status: "confirmed",
      });
      expect(
        (await t.run((ctx) => ctx.db.get(bookingId)))?.autoCompletionJobId,
      ).toBeUndefined();
      expect(await completedAudits(s)).toHaveLength(0);
      expect(
        (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
      ).toBe(600);
    }
  });

  test.each([
    {
      season: "summer",
      endAt: "2026-07-20T10:00:00Z",
      realEnd: "2026-07-20T08:00:00Z",
    },
    {
      season: "winter",
      endAt: "2026-12-20T10:00:00Z",
      realEnd: "2026-12-20T09:00:00Z",
    },
  ])(
    "runs automatically at the $season end instant without the buffer",
    async ({ endAt, realEnd }) => {
      vi.setSystemTime(Date.parse(realEnd) - 1_000);
      const s = await studio(t);

      await t.run((ctx) => ctx.db.patch(s.settingsId, { bufferTimeMins: 30 }));
      const bookingId = await booking(s, {
        startAt: Date.parse(endAt) - 1_800_000,
        endAt: Date.parse(endAt),
      });
      expect(await schedule(s, bookingId)).toBe(true);
      expect((await job(s, bookingId)).scheduledFor).toBe(Date.parse(realEnd));
      await vi.advanceTimersByTimeAsync(999);
      expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
        "confirmed",
      );
      await vi.advanceTimersByTimeAsync(1);
      await t.finishInProgressScheduledFunctions();
      expect(await t.run((ctx) => ctx.db.get(bookingId))).toMatchObject({
        status: "completed",
        updatedAt: Date.parse(realEnd),
      });
      expect(await completedAudits(s)).toEqual([
        expect.objectContaining({
          resourceId: bookingId,
          actorType: "system",
          actorId: "automatic-completion",
        }),
      ]);
    },
  );

  test("deduplicates jobs and completes legacy checked-in records once without customer messages", async () => {
    const s = await studio(t);

    const bookingId = await booking(s, { status: "checked_in" });
    expect(await schedule(s, bookingId)).toBe(true);
    const initial = await t.run((ctx) => ctx.db.get(bookingId));
    expect(await schedule(s, bookingId)).toBe(false);
    expect(
      (await t.run((ctx) => ctx.db.get(bookingId)))?.autoCompletionJobId,
    ).toBe(initial?.autoCompletionJobId);
    const args = await completeNow(s, bookingId);
    await t.mutation(internal.bookings.completeScheduledBooking, args);
    await s.owner.mutation(api.bookings.completeBooking, {
      orgId: s.orgId,
      bookingId,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
    ).toBe(2_400);
    expect(await completedAudits(s)).toHaveLength(1);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("notifications")
          .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
          .collect(),
      ),
    ).toEqual([]);
  });

  test("does not cancel its own pending scheduler record when executing", async () => {
    const s = await studio(t);

    const bookingId = await booking(s);
    await schedule(s, bookingId);
    const row = await t.run((ctx) => ctx.db.get(bookingId));
    const taskId = row!.autoCompletionJobId!;
    // Invoke the callback directly against a pending scheduler record to verify
    // it clears its booking linkage without trying to cancel itself.
    expect((await t.run((ctx) => ctx.db.system.get(taskId)))?.state.kind).toBe(
      "pending",
    );
    await completeNow(s, bookingId);
    expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
      "completed",
    );
    expect((await t.run((ctx) => ctx.db.system.get(taskId)))?.state.kind).toBe(
      "pending",
    );
    expect(await completedAudits(s)).toHaveLength(1);
  });

  test("rechecks the global off switch at execution, preserving the booking", async () => {
    const s = await studio(t);
    const bookingId = await booking(s);
    await schedule(s, bookingId);
    const args = await job(s, bookingId);
    vi.stubEnv("BOOKING_AUTO_COMPLETION_ENABLED", "false");
    vi.setSystemTime(args.scheduledFor);
    await t.mutation(internal.bookings.completeScheduledBooking, args);
    const row = await t.run((ctx) => ctx.db.get(bookingId));
    expect(row?.status).toBe("confirmed");
    expect(row?.autoCompletionJobId).toBeUndefined();
    expect(row?.autoCompletionScheduledFor).toBeUndefined();
    expect(await completedAudits(s)).toHaveLength(0);
    expect(
      (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
    ).toBe(600);
  });

  test("an obsolete studio allowlist does not prevent scheduled completion", async () => {
    const s = await studio(t);
    const bookingId = await booking(s);
    await schedule(s, bookingId);
    vi.stubEnv("BOOKING_AUTO_COMPLETION_ORG_IDS", "some-other-studio");
    await completeNow(s, bookingId);
    expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
      "completed",
    );
    expect(await completedAudits(s)).toHaveLength(1);
  });

  test.each([
    "cancelled",
    "no_show",
    "completed",
    "deleted",
    "org-deleted",
    "hospitality",
    "wrong-org",
    "changed-end",
  ])("ignores a stale job when the booking is %s", async (scenario) => {
    const s = await studio(t);
    const other = await studio(t, "other");

    const bookingId = await booking(s);
    await schedule(s, bookingId);
    const args = await job(s, bookingId);
    await t.run(async (ctx) => {
      if (
        scenario === "cancelled" ||
        scenario === "no_show" ||
        scenario === "completed"
      )
        await ctx.db.patch(bookingId, { status: scenario });
      if (scenario === "deleted")
        await ctx.db.patch(bookingId, {
          isDeleted: true,
          deletedAt: Date.now(),
        });
      if (scenario === "org-deleted")
        await ctx.db.patch(s.orgId, { isDeleted: true, deletedAt: Date.now() });
      if (scenario === "hospitality")
        await ctx.db.patch(s.orgId, { industry: "hospitality" });
      if (scenario === "changed-end")
        await ctx.db.patch(bookingId, {
          endAt: args.expectedEndAt + 3_600_000,
        });
    });
    vi.setSystemTime(args.scheduledFor);
    await t.mutation(internal.bookings.completeScheduledBooking, {
      ...args,
      orgId: scenario === "wrong-org" ? other.orgId : s.orgId,
    });
    expect(await completedAudits(s)).toHaveLength(0);
    expect(
      (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
    ).toBe(600);
  });

  test("corrects an automatically completed visit to no-show exactly once", async () => {
    const s = await studio(t);

    const bookingId = await booking(s);
    await schedule(s, bookingId);
    const args = await completeNow(s, bookingId);
    await s.owner.mutation(api.bookings.markNoShow, {
      orgId: s.orgId,
      bookingId,
    });
    await expect(
      s.owner.mutation(api.bookings.markNoShow, { orgId: s.orgId, bookingId }),
    ).rejects.toThrow("Cannot mark no_show");
    await t.mutation(internal.bookings.completeScheduledBooking, args);
    expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
      "no_show",
    );
    expect(await t.run((ctx) => ctx.db.get(s.customerId))).toMatchObject({
      totalSpendMinorUnits: 600,
      noShowCount: 2,
      noShowRiskScore: 2 / 3,
    });
  });

  test("manual completion stays compatible, cancels its job and queues only one review", async () => {
    const s = await studio(t);

    const bookingId = await booking(s);
    await schedule(s, bookingId);
    const queued = await t.run((ctx) => ctx.db.get(bookingId));
    const staleArgs = await job(s, bookingId);
    const args = { orgId: s.orgId, bookingId };
    await s.owner.mutation(api.bookings.completeBooking, args);
    await s.owner.mutation(api.bookings.completeBooking, args);
    expect(
      (await t.run((ctx) => ctx.db.system.get(queued!.autoCompletionJobId!)))
        ?.state.kind,
    ).toBe("canceled");
    vi.setSystemTime(staleArgs.scheduledFor);
    await t.mutation(internal.bookings.completeScheduledBooking, staleArgs);
    const reviews = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org_booking", (q) =>
          q.eq("orgId", s.orgId).eq("bookingId", bookingId),
        )
        .collect(),
    );
    expect(reviews).toEqual([
      expect.objectContaining({ type: "review_request", status: "pending" }),
    ]);
    expect(await completedAudits(s)).toHaveLength(1);
    await s.owner.mutation(api.bookings.markNoShow, args);
    expect((await t.run((ctx) => ctx.db.get(reviews[0]._id)))?.status).toBe(
      "cancelled",
    );
    expect(
      (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
    ).toBe(600);
  });

  test("delivery rejects a review request if the completed appointment was corrected to no-show", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected provider request"));
    const s = await studio(t);
    const bookingId = await booking(s);
    await s.owner.mutation(api.bookings.completeBooking, {
      orgId: s.orgId,
      bookingId,
    });
    const review = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("notifications")
        .withIndex("by_org_booking", (q) =>
          q.eq("orgId", s.orgId).eq("bookingId", bookingId),
        )
        .unique();
      await ctx.db.patch(bookingId, { status: "no_show" });
      return row!;
    });
    vi.setSystemTime(review.scheduledFor);
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: review._id,
      }),
    ).toBe("cancelled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("keeps tenant and assigned-staff authorization on completed-booking corrections", async () => {
    const s = await studio(t);
    const other = await studio(t, "other");

    const bookingId = await booking(s);
    await schedule(s, bookingId);
    await completeNow(s, bookingId);
    await expect(
      other.owner.mutation(api.bookings.markNoShow, {
        orgId: s.orgId,
        bookingId,
      }),
    ).rejects.toThrow("Unauthorised");
    const personal = t.withIdentity({
      subject: "restricted",
      email: "restricted@example.com",
    });
    const userId = await personal.mutation(api.users.ensureUser);
    await t.run(async (ctx) => {
      await ctx.db.insert("staff_members", {
        orgId: s.orgId,
        userId,
        displayName: "Restricted",
        specialties: [],
        role: "staff",
        bookingAccess: "own",
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(userId, { activeOrgId: s.orgId });
    });
    await expect(
      personal.mutation(api.bookings.markNoShow, { orgId: s.orgId, bookingId }),
    ).rejects.toThrow("own appointments");
    expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
      "completed",
    );
  });

  test.each(["legacy", "quick"])(
    "atomically schedules the %s manual creation path and rescheduling by default",
    async (path) => {
      const s = await operationalStudio(t);

      const startAt = Date.parse("2026-10-21T10:00:00Z");
      const bookingId =
        path === "legacy"
          ? await s.owner.mutation(api.bookings.createBooking, {
              orgId: s.orgId,
              staffId: s.staffId,
              serviceId: s.serviceId,
              customerId: s.customerId,
              startAt,
              source: "manual",
            })
          : await s.owner.mutation(api.bookings.createManualBooking, {
              orgId: s.orgId,
              staffId: s.staffId,
              serviceIds: [s.serviceId],
              startAt,
              customerName: "New Client",
            });
      const original = await t.run((ctx) => ctx.db.get(bookingId));
      expect((await job(s, bookingId)).scheduledFor).toBe(
        wallClockTimestampToInstant(original!.endAt, "Europe/Skopje"),
      );
      const newBookingId = await s.owner.mutation(
        api.bookings.rescheduleBooking,
        { orgId: s.orgId, bookingId, newStartAt: startAt + 3_600_000 },
      );
      expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
        "cancelled",
      );
      expect(
        (
          await t.run((ctx) =>
            ctx.db.system.get(original!.autoCompletionJobId!),
          )
        )?.state.kind,
      ).toBe("canceled");
      expect((await job(s, newBookingId)).scheduledFor).toBe(
        original!.autoCompletionScheduledFor! + 3_600_000,
      );
      const replacement = await t.run((ctx) => ctx.db.get(newBookingId));
      await s.owner.mutation(api.bookings.cancelBooking, {
        orgId: s.orgId,
        bookingId: newBookingId,
      });
      expect(
        (
          await t.run((ctx) =>
            ctx.db.system.get(replacement!.autoCompletionJobId!),
          )
        )?.state.kind,
      ).toBe("canceled");
    },
  );

  test("existing clients can create bookings while automatic completion is globally disabled", async () => {
    vi.stubEnv("BOOKING_AUTO_COMPLETION_ENABLED", "false");
    const s = await operationalStudio(t);
    const bookingId = await s.owner.mutation(api.bookings.createManualBooking, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId],
      startAt: Date.parse("2026-10-21T10:00:00Z"),
      customerName: "Existing App Client",
    });
    const row = await t.run((ctx) => ctx.db.get(bookingId));
    expect(row?.status).toBe("confirmed");
    expect(row?.autoCompletionJobId).toBeUndefined();
    expect(row?.autoCompletionScheduledFor).toBeUndefined();
  });

  test("a failed booking transaction leaves neither a booking nor a completion job", async () => {
    const s = await operationalStudio(t);

    const args = {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId],
      startAt: Date.parse("2026-10-21T10:00:00Z"),
      customerName: "Client",
    };
    await s.owner.mutation(api.bookings.createManualBooking, args);
    const before = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    await expect(
      s.owner.mutation(api.bookings.createManualBooking, args),
    ).rejects.toThrow();
    const after = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(after).toHaveLength(before.length);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
          .collect(),
      ),
    ).toHaveLength(1);
  });

  test("explicit setup schedules future legacy bookings in batches without rewriting past history", async () => {
    const s = await studio(t);

    const past = await booking(s, {
      startAt: Date.parse("2026-10-19T09:00:00Z"),
      endAt: Date.parse("2026-10-19T09:30:00Z"),
    });
    const future = [];
    for (let index = 0; index < 105; index++) future.push(await booking(s));
    await t.mutation(internal.bookings.setupAutomaticCompletionForOrg, {
      orgId: s.orgId,
    });
    await vi.advanceTimersByTimeAsync(0);
    await t.finishInProgressScheduledFunctions();
    for (const id of future)
      expect(
        (await t.run((ctx) => ctx.db.get(id)))?.autoCompletionJobId,
      ).toBeDefined();
    const firstJobs = await Promise.all(
      future.map((id) => t.run((ctx) => ctx.db.get(id))),
    );
    await t.mutation(internal.bookings.setupAutomaticCompletionForOrg, {
      orgId: s.orgId,
    });
    await vi.advanceTimersByTimeAsync(0);
    await t.finishInProgressScheduledFunctions();
    const nextJobs = await Promise.all(
      future.map((id) => t.run((ctx) => ctx.db.get(id))),
    );
    expect(nextJobs.map((row) => row?.autoCompletionJobId)).toEqual(
      firstJobs.map((row) => row?.autoCompletionJobId),
    );
    expect(
      (await t.run((ctx) => ctx.db.get(past)))?.autoCompletionJobId,
    ).toBeUndefined();
    expect((await t.run((ctx) => ctx.db.get(past)))?.status).toBe("confirmed");
    expect(await completedAudits(s)).toHaveLength(0);
    expect(
      (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
    ).toBe(600);
  });

  test("all-studio setup paginates active beauty studios and preserves past history", async () => {
    const studios: Studio[] = [];
    const future: Id<"bookings">[] = [];
    for (let index = 0; index < 27; index++) {
      const s = await studio(t, `setup-${index}`);
      studios.push(s);
      future.push(await booking(s));
    }
    const historical = await booking(studios[0], {
      startAt: Date.parse("2026-10-19T09:00:00Z"),
      endAt: Date.parse("2026-10-19T09:30:00Z"),
    });
    const deleted = await studio(t, "deleted");
    const dormant = await studio(t, "dormant");
    const createdAfterSetup = await studio(t, "created-later");
    const excluded = await Promise.all(
      [deleted, dormant, createdAfterSetup].map((s) => booking(s)),
    );
    const startedAt = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.patch(deleted.orgId, {
        isDeleted: true,
        deletedAt: startedAt,
      });
      await ctx.db.patch(dormant.orgId, { industry: "hospitality" });
      await ctx.db.patch(createdAfterSetup.orgId, {
        createdAt: startedAt + 1_000,
      });
    });
    const firstPage = await t.mutation(
      internal.bookings.setupAutomaticCompletionForAllStudios,
      {},
    );
    expect(firstPage).toMatchObject({
      scanned: 25,
      studiosScheduled: 25,
      isDone: false,
    });
    expect(firstPage.nextCursor).not.toBeNull();
    const queued = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    const setupJobs = queued.filter((task) =>
      task.name.startsWith("bookings:setupAutomaticCompletion"),
    );
    expect(setupJobs).toHaveLength(26);
    expect(
      setupJobs.every((task) => task.args[0].startedAt === startedAt),
    ).toBe(true);
    // Drain setup continuations and tenant workers; appointments end in an hour.
    await vi.advanceTimersByTimeAsync(10);
    await t.finishInProgressScheduledFunctions();
    for (const id of future)
      expect(
        (await t.run((ctx) => ctx.db.get(id)))?.autoCompletionJobId,
      ).toBeDefined();
    for (const id of [...excluded, historical]) {
      const row = await t.run((ctx) => ctx.db.get(id));
      expect(row?.autoCompletionJobId).toBeUndefined();
      expect(row?.status).toBe("confirmed");
    }
    for (const s of studios) {
      expect(await completedAudits(s)).toHaveLength(0);
      expect(
        (await t.run((ctx) => ctx.db.get(s.customerId)))?.totalSpendMinorUnits,
      ).toBe(600);
    }
  });

  test("all-studio setup keeps appointments eligible if they end before their tenant worker runs", async () => {
    vi.setSystemTime(new Date("2026-10-20T07:59:59Z"));
    const s = await studio(t);
    const bookingId = await booking(s);
    const startedAt = Date.now();
    await t.mutation(
      internal.bookings.setupAutomaticCompletionForAllStudios,
      {},
    );
    const tasks = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    const setup = tasks.find(
      (task) => task.name === "bookings:setupAutomaticCompletionForOrg",
    );
    expect(setup?.args).toEqual([{ orgId: s.orgId, startedAt }]);
    // Model a delayed tenant setup without draining its scheduler callback.
    vi.setSystemTime(new Date("2026-10-20T08:01:00Z"));
    await t.mutation(
      internal.bookings.setupAutomaticCompletionForOrg,
      setup!.args[0],
    );
    const completion = await job(s, bookingId);
    expect(completion.scheduledFor).toBe(Date.parse("2026-10-20T08:00:00Z"));
    await t.mutation(internal.bookings.completeScheduledBooking, completion);
    expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
      "completed",
    );
    expect(await completedAudits(s)).toHaveLength(1);
  });

  test.each(["Europe/London", "Asia/Dubai"])(
    "timezone changes rearm pending appointments for %s",
    async (timezone) => {
      const s = await operationalStudio(t);

      const bookingId = await booking(s);
      const historical = await booking(s, {
        // Past in Skopje, but future after changing the studio to London.
        startAt: Date.parse("2026-10-20T08:00:00Z"),
        endAt: Date.parse("2026-10-20T08:30:00Z"),
      });
      await schedule(s, bookingId);
      const initial = await t.run((ctx) => ctx.db.get(bookingId));
      await s.owner.mutation(api.orgSettings.updateOrgSettings, {
        orgId: s.orgId,
        timezone,
      });
      await vi.advanceTimersByTimeAsync(0);
      await t.finishInProgressScheduledFunctions();
      const row = await t.run((ctx) => ctx.db.get(bookingId));
      expect(
        (await t.run((ctx) => ctx.db.system.get(initial!.autoCompletionJobId!)))
          ?.state.kind,
      ).toBe("canceled");
      const expected = wallClockTimestampToInstant(row!.endAt, timezone);
      if (expected <= Date.now()) {
        // A zero-delay task created by the setup timer runs on the next tick.
        await vi.advanceTimersByTimeAsync(1);
        await t.finishInProgressScheduledFunctions();
        expect((await t.run((ctx) => ctx.db.get(bookingId)))?.status).toBe(
          "completed",
        );
      } else {
        expect(row?.autoCompletionScheduledFor).toBe(expected);
        expect(row?.status).toBe("confirmed");
      }
      expect((await t.run((ctx) => ctx.db.get(historical)))?.status).toBe(
        "confirmed",
      );
      expect(
        (await t.run((ctx) => ctx.db.get(historical)))?.autoCompletionJobId,
      ).toBeUndefined();
    },
  );
});
