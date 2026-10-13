import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { localDateTimeInstants } from "../../convex/lib/reservationTime";
import type { Id } from "../../convex/_generated/dataModel";

const backend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof backend>;
const date = "2026-10-15";
const startAt = localDateTimeInstants(date, "12:00", "Europe/Skopje")[0];
const otp = "481516";
let sent: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: { content: string }[];
}[];

async function venue(t: Backend, key = "venue") {
  const owner = t.withIdentity({
    subject: key,
    email: `${key}@example.com`,
    emailVerified: true,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} venue`,
    category: "hair_salon",
  });
  const profile = await owner.query(api.users.getMyProfile);
  const rows = await t.run(async (ctx) => {
    const org = (await ctx.db.get(orgId))!;
    await ctx.db.patch(orgId, {
      industry: "hospitality",
      venueType: "restaurant",
      websiteStatus: "published",
      address: "Test Street 10",
      city: "Skopje",
      phone: "+38970123456",
    });
    const settingsId = await ctx.db.insert("reservation_settings", {
      orgId,
      schemaVersion: 2,
      timezone: "Europe/Skopje",
      bookingWindowDays: 60,
      minAdvanceBookingHours: 1,
      minPartySize: 1,
      maxPartySize: 4,
      defaultDurationMins: 90,
      minDurationMins: 30,
      maxDurationMins: 180,
      bufferMins: 15,
      slotIntervalMins: 15,
      cancellationWindowHours: 24,
      noShowGraceMins: 15,
      servicePeriods: [
        {
          name: "Lunch",
          startTime: "09:00",
          endTime: "23:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
      walkInsAccepted: true,
      walkInBufferMins: 0,
      reminderHoursBefore: [24, 2],
      updatedAt: Date.now(),
    });
    const areaId = await ctx.db.insert("floor_plans", {
      orgId,
      name: "Dining room",
      canvasWidth: 100,
      canvasHeight: 100,
      isActive: true,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const tableId = await ctx.db.insert("tables", {
      orgId,
      floorPlanId: areaId,
      label: "A",
      capacity: 4,
      minCapacity: 1,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      shape: "rectangle",
      status: "available",
      isActive: true,
      sortOrder: 0,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return {
      orgId,
      slug: org.slug,
      settingsId,
      tableId,
      areaId,
      staffId: profile!.staffId!,
    };
  });
  return { ...rows, owner };
}
type Venue = Awaited<ReturnType<typeof venue>>;
const details = (
  s: Venue,
  key = "request-reservation-0001",
  email = "guest@example.com",
) => ({
  slug: s.slug,
  date,
  startAt,
  partySize: 2,
  name: "Guest Name",
  email,
  phone: `+38970${Array.from(email)
    .reduce((sum, character) => sum + character.charCodeAt(0), 0)
    .toString()
    .padStart(6, "0")}`,
  idempotencyKey: key,
});
async function reserve(t: Backend, s: Venue, key?: string, email?: string) {
  const args = details(s, key, email);
  const challenge = await t.action(api.reservationPublic.requestOtp, {
    slug: s.slug,
    email: args.email,
  });
  const result = await t.action(api.reservationPublic.confirm, {
    ...args,
    challengeId: challenge.challengeId,
    otp,
  });
  return { ...result, args, challengeId: challenge.challengeId };
}
async function rows(t: Backend, orgId: Id<"orgs">) {
  return t.run(async (ctx) => ({
    reservations: await ctx.db
      .query("reservations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect(),
    customers: await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect(),
    notifications: await ctx.db
      .query("notifications")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect(),
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T06:00:00Z"));
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", "reservation-tests-use-only-a-local-secret");
  vi.stubEnv("AUTH_TEST_OTP", otp);
  vi.stubEnv("AUTH_EMAIL_PROVIDERS", "resend");
  vi.stubEnv("BOOKING_EMAIL_PROVIDERS", "resend");
  vi.stubEnv("REMINDER_EMAIL_PROVIDERS", "resend");
  vi.stubEnv("AUTH_EMAIL_FROM", "auth@example.test");
  vi.stubEnv("BOOKING_EMAIL_FROM", "booking@example.test");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ id: `mail-${sent.length}` }), {
        status: 200,
      });
    }),
  );
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("reservation guest boundaries", () => {
  test("requires a published supported venue; retired flags have no effect and invalid inputs resolve safely", async () => {
    const t = backend(),
      s = await venue(t);
    expect(
      await t.query(api.reservationPublic.getVenue, { slug: s.slug }),
    ).toMatchObject({ acceptingReservations: true });
    expect(
      await t.query(api.reservationPublic.getSlots, {
        slug: s.slug,
        date: "bad-date",
        partySize: 2,
      }),
    ).toEqual([]);
    expect(
      await t.query(api.reservationPublic.getSlots, {
        slug: s.slug,
        date,
        partySize: 0,
      }),
    ).toEqual([]);
    expect(
      await t.query(api.reservationPublic.getManaged, {
        slug: s.slug,
        reservationId: "malformed",
      }),
    ).toBeNull();
    vi.stubEnv("HOSPITALITY_ENABLED", "false");
    vi.stubEnv("HOSPITALITY_NEW_BOOKINGS_ENABLED", "false");
    await t.run((ctx) =>
      ctx.db.patch(s.orgId, { hospitalityPilotEnabled: false }),
    );
    expect(await t.query(api.reservationPublic.isEnabled, {})).toBe(true);
    expect(
      await t.query(api.reservationPublic.getVenue, { slug: s.slug }),
    ).toMatchObject({ acceptingReservations: true });
    await t.run((ctx) =>
      ctx.db.patch(s.orgId, { websiteStatus: "unpublished" }),
    );
    expect(
      await t.query(api.reservationPublic.getVenue, { slug: s.slug }),
    ).toBeNull();
    await expect(
      t.action(api.reservationPublic.requestOtp, {
        slug: s.slug,
        email: "guest@example.com",
      }),
    ).rejects.toThrow("unavailable");
    expect((await rows(t, s.orgId)).notifications).toHaveLength(0);
    await t.run((ctx) =>
      ctx.db.patch(s.orgId, { websiteStatus: "published", venueType: "hotel" }),
    );
    expect(
      await t.query(api.reservationPublic.getVenue, { slug: s.slug }),
    ).toBeNull();
  });

  test("actual queued OTP uses reservation copy, redacts encrypted proof and persists failed attempts", async () => {
    const t = backend(),
      s = await venue(t);
    const challenge = await t.action(api.reservationPublic.requestOtp, {
      slug: s.slug,
      email: "GUEST@example.com",
    });
    expect(sent[0].text).toContain(otp);
    expect(sent[0].subject).not.toMatch(/appointment/i);
    const notification = (await rows(t, s.orgId)).notifications[0];
    expect(notification.status).toBe("sent");
    expect(notification.templateData).toEqual({ redacted: true });
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...details(s),
        challengeId: challenge.challengeId,
        otp: "000000",
      }),
    ).rejects.toThrow("incorrect");
    expect(
      await t.run((ctx) => ctx.db.get(challenge.challengeId)),
    ).toMatchObject({ attempts: 1, status: "pending", purpose: "reservation" });
    expect((await rows(t, s.orgId)).customers).toHaveLength(0);
    for (let attempt = 1; attempt < 5; attempt++)
      await expect(
        t.action(api.reservationPublic.confirm, {
          ...details(s),
          challengeId: challenge.challengeId,
          otp: "000000",
        }),
      ).rejects.toThrow();
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...details(s),
        challengeId: challenge.challengeId,
        otp,
      }),
    ).rejects.toThrow("no longer");
  });

  test("rejects expired, cross-venue and cross-purpose OTP challenges", async () => {
    const t = backend(),
      s = await venue(t),
      other = await venue(t, "other");
    const challenge = await t.action(api.reservationPublic.requestOtp, {
      slug: s.slug,
      email: "guest@example.com",
    });
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...details(other),
        challengeId: challenge.challengeId,
        otp,
      }),
    ).rejects.toThrow("no longer");
    await t.run((ctx) =>
      ctx.db.patch(challenge.challengeId, { purpose: undefined }),
    );
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...details(s),
        challengeId: challenge.challengeId,
        otp,
      }),
    ).rejects.toThrow("no longer");
    await t.run((ctx) =>
      ctx.db.patch(challenge.challengeId, {
        purpose: "reservation",
        expiresAt: Date.now() - 1,
      }),
    );
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...details(s),
        challengeId: challenge.challengeId,
        otp,
      }),
    ).rejects.toThrow("expired");
  });

  test("rate limits retries and does not create valid challenges after delivery failure", async () => {
    const t = backend(),
      s = await venue(t);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );
    await expect(
      t.action(api.reservationPublic.requestOtp, {
        slug: s.slug,
        email: "guest@example.com",
      }),
    ).rejects.toThrow("could not be sent");
    const challenge = await t.run((ctx) =>
      ctx.db
        .query("booking_email_verifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .first(),
    );
    expect(challenge?.status).toBe("delivery_failed");
    await expect(
      t.action(api.reservationPublic.requestOtp, {
        slug: s.slug,
        email: "guest@example.com",
      }),
    ).rejects.toThrow("wait");
  });

  test("periodic delivery cannot race fresh OTP requests but cleans expired orphaned payloads", async () => {
    const t = backend(),
      s = await venue(t);
    const challenge = await t.mutation(
      internal.reservationPublic.createChallenge,
      {
        slug: s.slug,
        email: "guest@example.com",
      },
    );
    expect(
      await t.action(internal.notifications.processNotifications, {}),
    ).toBeNull();
    expect(sent).toHaveLength(0);
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: challenge.notificationId,
      }),
    ).toBe("sent");
    const orphan = await t.mutation(
      internal.reservationPublic.createChallenge,
      {
        slug: s.slug,
        email: "orphan@example.com",
      },
    );
    vi.setSystemTime(orphan.expiresAt);
    await t.action(internal.notifications.processNotifications, {});
    expect(
      await t.run((ctx) => ctx.db.get(orphan.notificationId)),
    ).toMatchObject({
      status: "cancelled",
      templateData: { redacted: true },
    });
    expect(sent).toHaveLength(1);
  });

  test("retries return the same reservation and cannot rearm consumed proof for another booking", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s);
    const retry = await t.action(api.reservationPublic.confirm, {
      ...r.args,
      challengeId: r.challengeId,
      otp,
    });
    expect(retry).toEqual({
      reservationId: r.reservationId,
      managementToken: r.managementToken,
      manageUrl: r.manageUrl,
    });
    expect(r.manageUrl).toContain(`#token=${r.managementToken}`);
    expect(new URL(r.manageUrl).search).toBe("");
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...r.args,
        challengeId: r.challengeId,
        otp: "000000",
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.get(r.challengeId))).toMatchObject({
      status: "consumed",
    });
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...r.args,
        idempotencyKey: "another-request-0002",
        startAt: startAt + 7_200_000,
        challengeId: r.challengeId,
        otp,
      }),
    ).rejects.toThrow("no longer");
    expect((await rows(t, s.orgId)).reservations).toHaveLength(1);
    expect((await rows(t, s.orgId)).customers).toHaveLength(1);
  });

  test("competing verified guests allocate capacity atomically without orphan customers", async () => {
    const t = backend(),
      s = await venue(t);
    const guests = await Promise.all(
      ["first@example.com", "second@example.com"].map(async (email, index) => ({
        ...details(s, `concurrent-request-${index}`, email),
        challengeId: (
          await t.action(api.reservationPublic.requestOtp, {
            slug: s.slug,
            email,
          })
        ).challengeId,
        otp,
      })),
    );
    const results = await Promise.allSettled(
      guests.map((args) => t.action(api.reservationPublic.confirm, args)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const state = await rows(t, s.orgId);
    expect(state.reservations).toHaveLength(1);
    expect(state.customers).toHaveLength(1);
  });

  test("scoped guest proof is read-only; optional account claim exposes no other tenant history", async () => {
    const t = backend(),
      s = await venue(t),
      other = await venue(t, "other"),
      r = await reserve(t, s);
    const args = {
      slug: s.slug,
      reservationId: r.reservationId,
      token: r.managementToken,
    };
    const before = await rows(t, s.orgId),
      view = await t.query(api.reservationPublic.getManaged, args);
    expect(view).toMatchObject({
      reservation: { name: "Guest Name", status: "confirmed", revision: 1 },
      canClaim: true,
    });
    expect(JSON.stringify(view)).not.toMatch(
      /manageToken|verifiedEmail|staffNote|requestFingerprint/,
    );
    expect(await rows(t, s.orgId)).toEqual(before);
    expect(
      await t.query(api.reservationPublic.getManaged, {
        ...args,
        slug: other.slug,
      }),
    ).toBeNull();
    expect(
      await t.query(api.reservationPublic.getManaged, {
        ...args,
        token: "bad",
      }),
    ).toBeNull();
    const wrong = t.withIdentity({
      subject: "wrong-client",
      email: "wrong@example.com",
      emailVerified: true,
    });
    await expect(
      wrong.mutation(api.reservationPublic.claim, args),
    ).rejects.toThrow("email");
    const client = t.withIdentity({
      subject: "guest-client",
      email: "guest@example.com",
      emailVerified: true,
    });
    await client.mutation(api.reservationPublic.claim, args);
    expect(await client.query(api.reservationPublic.listMine, {})).toHaveLength(
      1,
    );
    expect(await client.query(api.opusUsers.getMyBookings, {})).toEqual([]);
    expect(await wrong.query(api.reservationPublic.listMine, {})).toEqual([]);
    await client.mutation(api.reservationPublic.revokeManagementLink, {
      slug: s.slug,
      reservationId: r.reservationId,
    });
    expect(await t.query(api.reservationPublic.getManaged, args)).toBeNull();
    expect(
      await client.query(api.reservationPublic.getManaged, {
        slug: s.slug,
        reservationId: r.reservationId,
      }),
    ).not.toBeNull();
  });

  test("signed-in client can reserve without another OTP, with its verified email only", async () => {
    const t = backend(),
      s = await venue(t),
      client = t.withIdentity({
        subject: "known-client",
        email: "guest@example.com",
        emailVerified: true,
      });
    await expect(
      client.action(api.reservationPublic.confirm, {
        ...details(s),
        email: "other@example.com",
      }),
    ).rejects.toThrow("email");
    const r = await client.action(api.reservationPublic.confirm, details(s));
    expect(await client.query(api.reservationPublic.listMine, {})).toHaveLength(
      1,
    );
    expect(
      (await rows(t, s.orgId)).notifications.some(
        (n) => n.type === "reservation_verification",
      ),
    ).toBe(false);
    expect(
      await t.query(api.reservationPublic.getManaged, {
        slug: s.slug,
        reservationId: r.reservationId,
      }),
    ).toBeNull();
  });

  test("one erased guest does not hide the account's other reservations", async () => {
    const t = backend(),
      s = await venue(t),
      client = t.withIdentity({
        subject: "known-client",
        email: "guest@example.com",
        emailVerified: true,
      });
    const r = await client.action(api.reservationPublic.confirm, details(s));
    await t.run(async (ctx) => {
      const row = (await ctx.db.get(r.reservationId))!;
      const customer = (await ctx.db.get(row.customerId))!;
      const { _id, _creationTime, ...fields } = customer;
      void _id;
      void _creationTime;
      const erased = await ctx.db.insert("customers", {
        ...fields,
        isDeleted: true,
        deletedAt: Date.now(),
      });
      const {
        _id: reservationId,
        _creationTime: created,
        ...reservationFields
      } = row;
      void reservationId;
      void created;
      await ctx.db.insert("reservations", {
        ...reservationFields,
        customerId: erased,
        requestId: "previous-erased-guest-0001",
      });
    });
    const mine = await client.query(api.reservationPublic.listMine, {});
    expect(mine.map((row) => row.reservation.id)).toEqual([r.reservationId]);
  });

  test("unpublishing preserves existing management; deleted venues and expired proofs deny access", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s),
      args = {
        slug: s.slug,
        reservationId: r.reservationId,
        token: r.managementToken,
      };
    await t.run((ctx) =>
      ctx.db.patch(s.orgId, { websiteStatus: "unpublished" }),
    );
    expect(
      await t.action(api.reservationPublic.confirm, {
        ...r.args,
        challengeId: r.challengeId,
        otp,
      }),
    ).toMatchObject({
      reservationId: r.reservationId,
      managementToken: r.managementToken,
    });
    await expect(
      t.action(api.reservationPublic.confirm, {
        ...r.args,
        idempotencyKey: "paused-new-request-0002",
        challengeId: r.challengeId,
        otp,
      }),
    ).rejects.toThrow("unavailable");
    expect(
      await t.query(api.reservationPublic.getVenue, { slug: s.slug }),
    ).toBeNull();
    expect(
      await t.query(api.reservationPublic.getManaged, args),
    ).not.toBeNull();
    const slots = await t.query(api.reservationPublic.managedSlots, {
      ...args,
      date,
    });
    expect(slots.length).toBeGreaterThan(0);
    const moved = await t.mutation(api.reservationPublic.reschedule, {
      ...args,
      expectedRevision: 1,
      date,
      startAt: startAt + 7_200_000,
    });
    expect(moved.revision).toBe(2);
    await t.run((ctx) => ctx.db.patch(s.orgId, { isDeleted: true }));
    expect(await t.query(api.reservationPublic.getManaged, args)).toBeNull();
    await t.run((ctx) => ctx.db.patch(s.orgId, { isDeleted: false }));
    await t.run((ctx) =>
      ctx.db.patch(r.reservationId, { manageTokenExpiresAt: Date.now() - 1 }),
    );
    expect(await t.query(api.reservationPublic.getManaged, args)).toBeNull();
  });

  test("failed reschedule preserves original; cancellation honors current revision and deadline", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s),
      args = {
        slug: s.slug,
        reservationId: r.reservationId,
        token: r.managementToken,
      };
    const other = t.withIdentity({
      subject: "other-client",
      email: "other@example.com",
      emailVerified: true,
    });
    await other.action(api.reservationPublic.confirm, {
      ...details(s, "second-reservation-0002", "other@example.com"),
      startAt: startAt + 7_200_000,
    });
    await expect(
      t.mutation(api.reservationPublic.reschedule, {
        ...args,
        expectedRevision: 1,
        date,
        startAt: startAt + 7_200_000,
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.get(r.reservationId))).toMatchObject({
      startAt,
      revision: 1,
      status: "confirmed",
    });
    await expect(
      t.mutation(api.reservationPublic.cancel, {
        ...args,
        expectedRevision: 0,
      }),
    ).rejects.toThrow("changed");
    vi.setSystemTime(startAt - 24 * 3_600_000);
    expect(
      await t.mutation(api.reservationPublic.cancel, {
        ...args,
        expectedRevision: 1,
      }),
    ).toMatchObject({ status: "cancelled", revision: 2 });
  });

  test("management availability preserves the booked duration when venue defaults change", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s);
    await t.run((ctx) =>
      ctx.db.patch(s.settingsId, { defaultDurationMins: 30 }),
    );
    const proof = {
      slug: s.slug,
      reservationId: r.reservationId,
      token: r.managementToken,
    };
    const slots = await t.query(api.reservationPublic.managedSlots, {
      ...proof,
      date,
    });
    const last = slots.at(-1)!;
    expect(last.startAt).toBe(
      localDateTimeInstants(date, "21:15", "Europe/Skopje")[0],
    );
    expect(last.endAt - last.startAt).toBe(90 * 60_000);
    await t.mutation(api.reservationPublic.reschedule, {
      ...proof,
      expectedRevision: 1,
      date,
      startAt: last.startAt,
    });
    expect(await t.run((ctx) => ctx.db.get(r.reservationId))).toMatchObject({
      durationMins: 90,
      startAt: last.startAt,
      endAt: last.endAt,
    });
  });
});

describe("reservation delivery", () => {
  test("keeps the submitted guest name private from matching CRM names in pages and email", async () => {
    const t = backend(),
      s = await venue(t);
    await t.run((ctx) =>
      ctx.db.insert("customers", {
        orgId: s.orgId,
        name: "Private CRM Alias",
        phone: details(s).phone,
        totalVisits: 6,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const r = await reserve(t, s);
    const view = await t.query(api.reservationPublic.getManaged, {
      slug: s.slug,
      reservationId: r.reservationId,
      token: r.managementToken,
    });
    expect(view?.reservation.name).toBe("Guest Name");
    const state = await rows(t, s.orgId);
    expect(state.customers).toHaveLength(1);
    expect(state.customers[0].name).toBe("Private CRM Alias");
    for (const n of state.notifications.filter((n) =>
      ["reservation_confirmation", "staff_reservation"].includes(n.type),
    ))
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: n._id,
      });
    expect(sent.slice(1)).toHaveLength(2);
    for (const message of sent.slice(1)) {
      expect(message.text).toContain("Guest Name");
      expect(message.text).not.toContain("Private CRM Alias");
    }
    expect(sent.at(-1)?.text).toContain("http://localhost:3000/hospitality");
  });

  test("confirmation uses UTC, stable unique ICS and fragment management link; free venue has configured reminders", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s);
    const state = await rows(t, s.orgId),
      confirmation = state.notifications.find(
        (n) => n.type === "reservation_confirmation",
      )!;
    expect(
      state.notifications.filter((n) => n.type === "reservation_reminder"),
    ).toHaveLength(2);
    expect(state.notifications.some((n) => n.channel === "push")).toBe(false);
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: confirmation._id,
      }),
    ).toBe("sent");
    const message = sent.at(-1)!;
    expect(message.text).toContain(r.manageUrl);
    const ics = Buffer.from(message.attachments![0].content, "base64").toString(
      "utf8",
    );
    expect(ics).toContain(
      `UID:reservation-${s.orgId}-${r.reservationId}@opus.mk`,
    );
    expect(ics).toContain("DTSTART:20261015T100000Z");
    expect(ics).toContain("SEQUENCE:1");
    await t.mutation(api.reservationPublic.reschedule, {
      slug: s.slug,
      reservationId: r.reservationId,
      token: r.managementToken,
      expectedRevision: 1,
      date,
      startAt: startAt + 7_200_000,
    });
    const changed = (await rows(t, s.orgId)).notifications.find(
      (n) => n.type === "reservation_changed",
    )!;
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: changed._id,
    });
    const updated = Buffer.from(
      sent.at(-1)!.attachments![0].content,
      "base64",
    ).toString("utf8");
    expect(updated).toContain(
      `UID:reservation-${s.orgId}-${r.reservationId}@opus.mk`,
    );
    expect(updated).toContain("SEQUENCE:2");
  });

  test("stale revisions, revoked staff recipients and deleted venues suppress queued emails", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s),
      state = await rows(t, s.orgId);
    const customer = state.notifications.find(
        (n) => n.type === "reservation_confirmation",
      )!,
      staff = state.notifications.find((n) => n.type === "staff_reservation")!;
    await t.run((ctx) => ctx.db.patch(s.staffId, { isActive: false }));
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: staff._id,
      }),
    ).toBe("cancelled");
    await t.mutation(api.reservationPublic.reschedule, {
      slug: s.slug,
      reservationId: r.reservationId,
      token: r.managementToken,
      expectedRevision: 1,
      date,
      startAt: startAt + 7_200_000,
    });
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: customer._id,
      }),
    ).toBe("cancelled");
    const changed = (await rows(t, s.orgId)).notifications.find(
      (n) => n.type === "reservation_changed",
    )!;
    await t.run((ctx) => ctx.db.patch(s.orgId, { isDeleted: true }));
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: changed._id,
      }),
    ).toBe("cancelled");
  });

  test("App Review isolation still suppresses reservation delivery", async () => {
    const t = backend(),
      s = await venue(t);
    await reserve(t, s);
    const notification = (await rows(t, s.orgId)).notifications.find(
      (n) => n.type === "reservation_confirmation",
    )!;
    vi.stubEnv("APP_REVIEW_ORG_ID", s.orgId);
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: notification._id,
      }),
    ).toBe("cancelled");
    expect(sent).toHaveLength(1);
  });

  test("reminder rechecks settings and actual UTC start instead of sending obsolete messages", async () => {
    const t = backend(),
      s = await venue(t);
    await reserve(t, s);
    const reminders = (await rows(t, s.orgId)).notifications.filter(
      (n) => n.type === "reservation_reminder",
    );
    vi.setSystemTime(startAt - 24 * 3_600_000);
    await t.run((ctx) =>
      ctx.db.patch(s.settingsId, { reminderHoursBefore: [2] }),
    );
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: reminders.find(
          (n) => n.templateData.hoursBefore === 24,
        )!._id,
      }),
    ).toBe("cancelled");
    vi.setSystemTime(startAt + 1);
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: reminders.find((n) => n.templateData.hoursBefore === 2)!
          ._id,
      }),
    ).toBe("cancelled");
  });

  test("cursor continuations reconcile more than 250 reservations without duplicate reminders", async () => {
    const t = backend(),
      s = await venue(t),
      r = await reserve(t, s);
    await t.run(async (ctx) => {
      const original = (await ctx.db.get(r.reservationId))!;
      const { _id, _creationTime, ...fields } = original;
      void _id;
      void _creationTime;
      // Existing historical rows exercise reminder pagination independently
      // of allocation; no new booking or provider sends run in this fixture.
      for (let index = 0; index < 250; index++)
        await ctx.db.insert("reservations", {
          ...fields,
          requestId: `historical-reservation-${index}`,
        });
    });
    const window = { orgId: s.orgId, from: Date.now(), through: startAt + 1 };
    expect(
      await t.mutation(internal.reservationNotifications.reconcileOrg, window),
    ).toEqual({ count: 100, isDone: false });
    for (let page = 0; page < 3; page++) {
      await vi.advanceTimersByTimeAsync(1);
      await t.finishInProgressScheduledFunctions();
    }
    const reminders = (await rows(t, s.orgId)).notifications.filter(
      (n) => n.type === "reservation_reminder",
    );
    expect(reminders).toHaveLength(502);
    expect(new Set(reminders.map((n) => n.dedupeKey)).size).toBe(502);
    expect(new Set(reminders.map((n) => n.reservationId)).size).toBe(251);
    await t.mutation(internal.reservationNotifications.reconcileOrg, window);
    for (let page = 0; page < 3; page++) {
      await vi.advanceTimersByTimeAsync(1);
      await t.finishInProgressScheduledFunctions();
    }
    expect(
      (await rows(t, s.orgId)).notifications.filter(
        (n) => n.type === "reservation_reminder",
      ),
    ).toHaveLength(502);
  });

  test("venue invitations use venue copy and reject revoked invites or deleted venues", async () => {
    const t = backend(),
      s = await venue(t);
    const invite = async (email: string) => {
      const inviteId = await s.owner.mutation(
        api.hospitality.inviteTeamMember,
        {
          name: "Team Member",
          email,
          role: "staff",
        },
      );
      const notification = (await rows(t, s.orgId)).notifications.find(
        (n) => n.type === "staff_invite" && n.recipientAddress === email,
      )!;
      return { inviteId, notificationId: notification._id };
    };
    const valid = await invite("team@example.com");
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: valid.notificationId,
      }),
    ).toBe("sent");
    expect(sent.at(-1)?.html).toContain("venue reservations");
    expect(sent.at(-1)?.html).toContain("Join the venue team");
    const revoked = await invite("revoked@example.com");
    await t.run((ctx) =>
      ctx.db.patch(revoked.inviteId, { status: "cancelled" }),
    );
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: revoked.notificationId,
      }),
    ).toBe("cancelled");
    const disabled = await invite("disabled@example.com");
    await t.run((ctx) => ctx.db.patch(s.orgId, { isDeleted: true }));
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: disabled.notificationId,
      }),
    ).toBe("cancelled");
    expect(sent).toHaveLength(1);
  });
});
