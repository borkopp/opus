import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { convexModules } from "../../convex-test.setup";
import schema from "../../convex/schema";
import {
  rankRecoveryOptions,
  type RecoveryOption,
} from "../../convex/lib/gapRecoveryRules";

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;
const DATE = "2026-09-17";
const at = (hour: number) => Date.parse(`${DATE}T00:00:00Z`) + hour * 3_600_000;
const OTP = "481516";

async function fixture(t: Backend) {
  const owner = t.withIdentity({
    subject: "recovery-owner",
    email: "owner@example.com",
    name: "Studio Owner",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Recovery Studio",
    category: "hair_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Haircut",
    durationMins: 45,
    priceMinorUnits: 180000,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  const { staffId, customerIds } = await t.run(async (ctx) => {
    await ctx.db.patch(orgId, { plan: "paid", websiteStatus: "published" });
    const settings = (await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first())!;
    await ctx.db.patch(settings._id, {
      gapOptimizerEnabled: true,
      gapOptimizerMinGapMins: 30,
      bufferTimeMins: 15,
      slotDurationMins: 15,
      timezone: "Europe/Skopje",
      locale: "mk-MK",
    });
    const staff = (await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first())!;
    const customerIds: Id<"customers">[] = [];
    for (let i = 0; i < 7; i++) {
      const id = await ctx.db.insert("customers", {
        orgId,
        name: `Client ${i}`,
        email: `client${i}@example.com`,
        phone: `+3897022200${i}`,
        totalVisits: i === 6 ? 999 : 0,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        marketingOptIn: false,
        whatsappOptIn: false,
        gapRecoveryEmailOptIn: i !== 6,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      customerIds.push(id);
    }
    return { staffId: staff._id, customerIds };
  });
  return { owner, orgId, serviceId, staffId, customerIds };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

async function insertBooking(
  t: Backend,
  f: Fixture,
  startAt: number,
  overrides: Partial<Doc<"bookings">> = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("bookings", {
      orgId: f.orgId,
      customerId: f.customerIds[6],
      staffId: f.staffId,
      serviceId: f.serviceId,
      startAt,
      endAt: startAt + 45 * 60_000,
      priceMinorUnits: 180000,
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

async function scan(f: Fixture) {
  await f.owner.action(api.ai.gapOptimizer.scanDayForOrg, {
    orgId: f.orgId,
    serviceDate: DATE,
    detectedBy: "manual_scan",
  });
  return f.owner.query(api.ai.gapOptimizerHelpers.getRecoveryDashboard, {
    orgId: f.orgId,
    serviceDate: DATE,
  });
}

async function approve(
  t: Backend,
  f: Fixture,
  candidateId?: Id<"gap_outreach_candidates">,
) {
  const id = candidateId ?? (await scan(f)).gaps[0].topCandidates[0]._id;
  const result = await f.owner.action(
    api.ai.gapOptimizer.approveAndSendCandidate,
    { orgId: f.orgId, candidateId: id },
  );
  const notification = (await t.run((ctx) =>
    ctx.db.get(result.notificationId),
  ))!;
  const token = new URL(notification.templateData.bookingLink).searchParams.get(
    "offer",
  )!;
  const candidate = (await t.run((ctx) => ctx.db.get(id)))!;
  const customer = (await t.run((ctx) => ctx.db.get(candidate.customerId)))!;
  return { ...result, notification, token, candidate, customer };
}

async function confirmArgs(
  t: Backend,
  f: Fixture,
  offer: Awaited<ReturnType<typeof approve>>,
) {
  const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
    orgId: f.orgId,
    email: offer.customer.email!,
    recoveryToken: offer.token,
  });
  return {
    orgId: f.orgId,
    serviceId: offer.candidate.serviceId!,
    staffId: f.staffId,
    startAt: offer.candidate.offerStartAt!,
    customerName: offer.customer.name,
    customerPhone: offer.customer.phone!,
    customerEmail: offer.customer.email!,
    challengeId: challenge.challengeId,
    otp: OTP,
    recoveryToken: offer.token,
  };
}

describe("manual opening recovery", () => {
  let t: Backend;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T06:00:00Z"));
    t = createBackend();
    vi.stubEnv("SITE_URL", "http://localhost:3000");
    vi.stubEnv("ROOT_DOMAIN", "opus.mk");
    vi.stubEnv("BOOKING_OTP_SECRET", "recovery-test-secret");
    vi.stubEnv("BETTER_AUTH_SECRET", "recovery-test-secret");
    vi.stubEnv("AUTH_TEST_OTP", OTP);
    vi.stubEnv("RESEND_API_KEY", "re_mock");
    vi.stubEnv("AUTH_EMAIL_FROM", "bookings@opus.mk");
    vi.stubEnv("REMINDER_EMAIL_PROVIDERS", "resend");
    vi.stubEnv("TRANSACTIONAL_EMAIL_PROVIDERS", "resend");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "mock-email" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("uses shared public slots, includes edge/empty-day openings, and rescans without duplicates", async () => {
    const f = await fixture(t);
    await insertBooking(t, f, at(12));
    const data = await scan(f);
    expect(data.gaps.map((g) => [g.gapStartAt, g.gapEndAt])).toEqual([
      [at(9), at(12)],
      [at(13), at(17)],
    ]);
    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: f.orgId,
      staffId: f.staffId,
      serviceId: f.serviceId,
      date: DATE,
    });
    expect(slots.some((s) => s.startAt === at(11.25))).toBe(false); // 45 min + buffer crosses the next booking
    expect(slots.some((s) => s.startAt === at(16.25))).toBe(false); // crosses closing time with buffer
    for (const gap of data.gaps)
      for (const candidate of gap.topCandidates)
        expect(
          slots.some(
            (s) =>
              s.startAt === candidate.startAt && s.endAt === candidate.endAt,
          ),
        ).toBe(true);
    const again = await scan(f);
    expect(
      again.gaps.map((g) => [g._id, g.topCandidates.map((c) => c._id)]),
    ).toEqual(data.gaps.map((g) => [g._id, g.topCandidates.map((c) => c._id)]));
    expect(fetchMock).not.toHaveBeenCalled();
    await f.owner.mutation(api.ai.gapOptimizerHelpers.dismissGap, {
      orgId: f.orgId,
      gapId: data.gaps[0]._id,
    });
    const dismissed = await scan(f);
    expect(dismissed.gaps.find((g) => g._id === data.gaps[0]._id)?.status).toBe(
      "dismissed",
    );
  });

  test("cancelling the only booking schedules detection of the full working day", async () => {
    const f = await fixture(t);
    const bookingId = await insertBooking(t, f, at(9));
    expect((await scan(f)).gaps[0].gapStartAt).toBe(at(10));
    await f.owner.mutation(api.bookings.cancelBooking, {
      orgId: f.orgId,
      bookingId,
    });
    await vi.advanceTimersByTimeAsync(1);
    await t.finishInProgressScheduledFunctions();
    expect(
      (await scan(f)).gaps.some(
        (g) =>
          g.gapStartAt === at(9) &&
          g.gapEndAt === at(17) &&
          g.hasBookableServices,
      ),
    ).toBe(true);
  });

  test("ranks completed service history and excludes future appointments without trusting CRM counters", async () => {
    const f = await fixture(t);
    for (const daysAgo of [90, 60, 30])
      await insertBooking(t, f, at(9) - daysAgo * 86_400_000, {
        customerId: f.customerIds[1],
        status: "completed",
      });
    await insertBooking(t, f, at(15), { customerId: f.customerIds[0] });
    const data = await scan(f);
    const candidates = data.gaps[0].topCandidates;
    expect(candidates[0].customerName).toBe("Client 1");
    expect(candidates[0].reasons[0].en).toContain("every 30 days");
    expect(candidates.some((c) => c.customerName === "Client 0")).toBe(false);
    expect(candidates.some((c) => c.customerName === "Client 6")).toBe(false);
    expect(
      candidates.find((c) => c.customerName === "Client 2")?.reasons[0].en,
    ).toContain("No completed history");
    const customer = (await t.run((ctx) => ctx.db.get(f.customerIds[1])))!;
    const history = await t.run((ctx) =>
      ctx.db
        .query("bookings")
        .withIndex("by_org_customer_start", (q) =>
          q.eq("orgId", f.orgId).eq("customerId", customer._id),
        )
        .collect(),
    );
    const tooEarly: RecoveryOption = {
      serviceId: f.serviceId,
      staffId: f.staffId,
      serviceName: "Haircut",
      startAt: at(9) - 20 * 86_400_000,
      endAt: at(9.75) - 20 * 86_400_000,
      priceMinorUnits: 180000,
      currency: "MKD",
    };
    expect(rankRecoveryOptions(customer, history, [tooEarly], at(8))).toEqual(
      [],
    );
  });

  test("approval is idempotent, allows one active offer per opening, and applies a customer cooldown", async () => {
    const f = await fixture(t);
    await insertBooking(t, f, at(12));
    const data = await scan(f);
    const first = data.gaps[0].topCandidates[0];
    const offer = await approve(t, f, first._id);
    expect(offer.candidate.status).toBe("queued");
    expect(new URL(offer.notification.templateData.bookingLink).hostname).toBe(
      "recovery-studio.opus.mk",
    );
    expect(
      await f.owner.action(api.ai.gapOptimizer.approveAndSendCandidate, {
        orgId: f.orgId,
        candidateId: first._id,
      }),
    ).toEqual({ notificationId: offer.notificationId });
    await expect(
      approve(t, f, data.gaps[0].topCandidates[1]._id),
    ).rejects.toThrow("already active");
    const otherGapSameClient = data.gaps[1].topCandidates.find(
      (c) => c.customerName === first.customerName,
    )!;
    await expect(approve(t, f, otherGapSameClient._id)).rejects.toThrow(
      "no longer eligible",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("the worker sends the localized offer, records provider status, and does not send twice", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: offer.notificationId,
      }),
    ).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(body.to).toEqual([offer.customer.email]);
    expect(body.html).toContain("Haircut");
    expect(body.html).toContain(
      offer.notification.templateData.bookingLink.replaceAll("&", "&amp;"),
    );
    expect(body.html).toContain("исклучете");
    expect(body.attachments).toBeUndefined();
    expect(
      (await t.run((ctx) => ctx.db.get(offer.candidate._id)))?.status,
    ).toBe("sent");
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("revoking consent invalidates the token and cancels pending delivery", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    await f.owner.mutation(
      api.ai.gapOptimizerHelpers.setRecoveryContactConsent,
      { orgId: f.orgId, customerId: offer.customer._id, optedIn: false },
    );
    expect(
      (
        await t.query(api.ai.gapOptimizerHelpers.getPublicOffer, {
          orgId: f.orgId,
          token: offer.token,
        })
      )?.available,
    ).toBe(false);
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await t.run((ctx) => ctx.db.get(offer.notificationId)))?.status,
    ).toBe("cancelled");
  });

  test("the worker rechecks changed prices and availability", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    await t.run((ctx) =>
      ctx.db.patch(f.serviceId, { priceMinorUnits: 190000 }),
    );
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await t.run((ctx) => ctx.db.get(offer.candidate._id)))?.status,
    ).toBe("expired");
  });

  test("terminal delivery failure is shown and an approved retry reuses the notification", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    await t.run((ctx) =>
      ctx.db.patch(offer.notificationId, { attemptCount: 2 }),
    );
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ message: "Provider unavailable" }), {
          status: 503,
        }),
    );
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(offer.candidate._id)))?.status,
    ).toBe("failed");
    const retry = await f.owner.action(
      api.ai.gapOptimizer.approveAndSendCandidate,
      { orgId: f.orgId, candidateId: offer.candidate._id },
    );
    expect(retry.notificationId).toBe(offer.notificationId);
    expect(
      (await t.run((ctx) => ctx.db.get(offer.notificationId)))?.templateData
        .bookingLink,
    ).toBe(offer.notification.templateData.bookingLink);
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ id: "retried" }), { status: 200 }),
    );
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(offer.candidate._id)))?.status,
    ).toBe("sent");
  });

  test("requires the offered email, exposes no customer details publicly, and books atomically once", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    const publicOffer = await t.query(
      api.ai.gapOptimizerHelpers.getPublicOffer,
      { orgId: f.orgId, token: offer.token },
    );
    expect(publicOffer?.available).toBe(true);
    expect(JSON.stringify(publicOffer)).not.toContain(offer.customer.email);
    expect(JSON.stringify(publicOffer)).not.toContain(offer.customer.name);
    await expect(
      t.action(api.publicBooking.requestBookingEmailOtp, {
        orgId: f.orgId,
        email: "someoneelse@example.com",
        recoveryToken: offer.token,
      }),
    ).rejects.toThrow("another email address");
    const args = await confirmArgs(t, f, offer);
    const results = await Promise.allSettled([
      t.action(api.publicBooking.confirmPublicBooking, args),
      t.action(api.publicBooking.confirmPublicBooking, args),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const candidate = (await t.run((ctx) => ctx.db.get(offer.candidate._id)))!;
    expect(candidate.status).toBe("booked");
    const booking = (await t.run((ctx) => ctx.db.get(candidate.bookedById!)))!;
    expect(booking.gapRecoveryCandidateId).toBe(candidate._id);
    expect(booking.customerId).toBe(offer.customer._id);
    const dashboard = await f.owner.query(
      api.ai.gapOptimizerHelpers.getRecoveryDashboard,
      { orgId: f.orgId, serviceDate: DATE },
    );
    expect(dashboard.filledCount).toBe(1);
    expect(dashboard.completedValue).toEqual([]);
    await t.run((ctx) => ctx.db.patch(booking._id, { status: "completed" }));
    expect(
      (
        await f.owner.query(api.ai.gapOptimizerHelpers.getRecoveryDashboard, {
          orgId: f.orgId,
          serviceDate: DATE,
        })
      ).completedValue,
    ).toEqual([{ currency: "MKD", amount: 180000 }]);
  });

  test("an organic booking invalidates the offer without taking recovery credit", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    const args = await confirmArgs(t, f, offer);
    await t.action(api.publicBooking.confirmPublicBooking, {
      ...args,
      recoveryToken: undefined,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(offer.candidate._id)))?.status,
    ).toBe("expired");
    const dashboard = await f.owner.query(
      api.ai.gapOptimizerHelpers.getRecoveryDashboard,
      { orgId: f.orgId, serviceDate: DATE },
    );
    expect(dashboard.filledCount).toBe(0);
  });

  test("expired links cannot book, while their unsubscribe control still works", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    vi.setSystemTime(offer.candidate.expiresAt! - 60_000);
    const args = await confirmArgs(t, f, offer);
    vi.setSystemTime(offer.candidate.expiresAt! + 1);
    expect(
      (
        await t.query(api.ai.gapOptimizerHelpers.getPublicOffer, {
          orgId: f.orgId,
          token: offer.token,
        })
      )?.available,
    ).toBe(false);
    await expect(
      t.action(api.publicBooking.confirmPublicBooking, args),
    ).rejects.toThrow("offer is no longer available");
    await t.mutation(api.ai.gapOptimizerHelpers.declinePublicOffer, {
      orgId: f.orgId,
      token: offer.token,
      unsubscribe: true,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(offer.customer._id)))
        ?.gapRecoveryEmailOptIn,
    ).toBe(false);
  });

  test("cross-tenant requests fail and disabled recovery cannot send existing offers", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    const outsider = t.withIdentity({
      subject: "other-owner",
      email: "other@example.com",
      name: "Other",
    });
    await outsider.mutation(api.users.ensureUser);
    const other = await outsider.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
      category: "hair_salon",
    });
    expect(
      await t.query(api.ai.gapOptimizerHelpers.getPublicOffer, {
        orgId: other.orgId,
        token: offer.token,
      }),
    ).toBeNull();
    await expect(
      outsider.action(api.ai.gapOptimizer.approveAndSendCandidate, {
        orgId: f.orgId,
        candidateId: offer.candidate._id,
      }),
    ).rejects.toThrow();
    await f.owner.mutation(api.orgSettings.updateGapOptimizerSettings, {
      orgId: f.orgId,
      gapOptimizerEnabled: false,
      gapOptimizerMinGapMins: 30,
    });
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("concurrent scans and approvals do not duplicate suggestions or offers", async () => {
    const f = await fixture(t);
    const [left, right] = await Promise.all([scan(f), scan(f)]);
    expect(left.gaps.map((g) => g._id)).toEqual(right.gaps.map((g) => g._id));
    const results = await Promise.allSettled(
      left.gaps[0].topCandidates
        .slice(0, 2)
        .map((candidate) => approve(t, f, candidate._id)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const notifications = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
        .collect(),
    );
    expect(
      notifications.filter((n) => n.type === "gap_fill_offer"),
    ).toHaveLength(1);
  });

  test("an offer and an independently verified ordinary booking compete for one slot", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    const offeredArgs = await confirmArgs(t, f, offer);
    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: f.orgId,
      email: "otherclient@example.com",
    });
    const ordinaryArgs = {
      ...offeredArgs,
      recoveryToken: undefined,
      challengeId: challenge.challengeId,
      customerEmail: "otherclient@example.com",
      customerName: "Other Client",
      customerPhone: "+38970999000",
    };
    const results = await Promise.allSettled([
      t.action(api.publicBooking.confirmPublicBooking, offeredArgs),
      t.action(api.publicBooking.confirmPublicBooking, ordinaryArgs),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const bookings = await t.run((ctx) =>
      ctx.db
        .query("bookings")
        .withIndex("by_org_start", (q) =>
          q.eq("orgId", f.orgId).eq("startAt", offeredArgs.startAt),
        )
        .collect(),
    );
    expect(bookings).toHaveLength(1);
  });

  test("a booking records opening-email permission only when the guest explicitly selects it", async () => {
    const f = await fixture(t);
    for (const [index, optedIn] of [false, true].entries()) {
      const customer = (await t.run((ctx) =>
        ctx.db.get(f.customerIds[index]),
      ))!;
      await f.owner.mutation(
        api.ai.gapOptimizerHelpers.setRecoveryContactConsent,
        { orgId: f.orgId, customerId: customer._id, optedIn: false },
      );
      const challenge = await t.action(
        api.publicBooking.requestBookingEmailOtp,
        { orgId: f.orgId, email: customer.email! },
      );
      await t.action(api.publicBooking.confirmPublicBooking, {
        orgId: f.orgId,
        serviceId: f.serviceId,
        staffId: f.staffId,
        startAt: at(9 + index),
        customerName: customer.name,
        customerPhone: customer.phone!,
        customerEmail: customer.email!,
        challengeId: challenge.challengeId,
        otp: OTP,
        ...(optedIn ? { gapRecoveryEmailOptIn: true } : {}),
      });
      const stored = (await t.run((ctx) => ctx.db.get(customer._id)))!;
      expect(stored.gapRecoveryEmailOptIn).toBe(optedIn);
      if (optedIn)
        expect(stored.gapRecoveryConsentSource).toBe("guest_booking");
    }
  });

  test("unbookable services, time off, booking windows, and the local lead time produce no false offers", async () => {
    const f = await fixture(t);
    await t.run((ctx) => ctx.db.patch(f.serviceId, { durationMins: 481 }));
    expect((await scan(f)).openCount).toBe(0);
    await t.run((ctx) => ctx.db.patch(f.serviceId, { durationMins: 45 }));
    await t.run((ctx) =>
      ctx.db.insert("availability_overrides", {
        orgId: f.orgId,
        staffId: f.staffId,
        date: DATE,
        type: "day_off",
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    expect((await scan(f)).openCount).toBe(0);
    await expect(
      f.owner.action(api.ai.gapOptimizer.scanDayForOrg, {
        orgId: f.orgId,
        serviceDate: "2026-09-24",
        detectedBy: "manual_scan",
      }),
    ).rejects.toThrow("next seven days");
    vi.setSystemTime(new Date("2026-09-16T07:00:00Z")); // 09:00 Skopje, not 07:00
    await f.owner.action(api.ai.gapOptimizer.scanDayForOrg, {
      orgId: f.orgId,
      serviceDate: "2026-09-16",
      detectedBy: "manual_scan",
    });
    const today = await f.owner.query(
      api.ai.gapOptimizerHelpers.getRecoveryDashboard,
      { orgId: f.orgId, serviceDate: "2026-09-16" },
    );
    expect(today.gaps[0].topCandidates[0].startAt).toBe(
      Date.parse("2026-09-16T09:30:00Z"),
    );
  });

  test("provider bounces remain visible and block further offers to that address", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    await t.mutation(internal.emailWebhooks.recordResendDeliveryEvent, {
      orgId: f.orgId,
      notificationId: offer.notificationId,
      emailId: "mock-email",
      eventType: "email.bounced",
      eventAt: Date.now(),
    });
    const dashboard = await f.owner.query(
      api.ai.gapOptimizerHelpers.getRecoveryDashboard,
      { orgId: f.orgId, serviceDate: DATE },
    );
    expect(
      dashboard.gaps[0].topCandidates.find(
        (candidate) => candidate._id === offer.candidate._id,
      ),
    ).toMatchObject({
      status: "failed",
      canApprove: false,
    });
    expect(dashboard.outreachSentCount).toBe(0);
    expect(
      (await t.run((ctx) => ctx.db.get(offer.customer._id)))
        ?.gapRecoveryUndeliverableEmail,
    ).toBe(offer.customer.email);
    await expect(
      f.owner.action(api.ai.gapOptimizer.approveAndSendCandidate, {
        orgId: f.orgId,
        candidateId: offer.candidate._id,
      }),
    ).rejects.toThrow();
  });

  test("a recipient complaint revokes opening-email permission", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: offer.notificationId,
    });
    await t.mutation(internal.emailWebhooks.recordResendDeliveryEvent, {
      orgId: f.orgId,
      notificationId: offer.notificationId,
      emailId: "mock-email",
      eventType: "email.complained",
      eventAt: Date.now(),
    });
    expect(
      (await t.run((ctx) => ctx.db.get(offer.customer._id)))
        ?.gapRecoveryEmailOptIn,
    ).toBe(false);
    expect(
      (
        await t.query(api.ai.gapOptimizerHelpers.getPublicOffer, {
          orgId: f.orgId,
          token: offer.token,
        })
      )?.available,
    ).toBe(false);
  });

  test("declining makes the next client available, and manual selection is always visible", async () => {
    const f = await fixture(t);
    const offer = await approve(t, f);
    await t.mutation(api.ai.gapOptimizerHelpers.declinePublicOffer, {
      orgId: f.orgId,
      token: offer.token,
      unsubscribe: false,
    });
    await f.owner.mutation(api.ai.gapOptimizerHelpers.chooseRecoveryCustomer, {
      orgId: f.orgId,
      gapId: offer.candidate.gapSuggestionId,
      customerId: f.customerIds[5],
    });
    const second = await f.owner.mutation(
      api.ai.gapOptimizerHelpers.chooseRecoveryCustomer,
      {
        orgId: f.orgId,
        gapId: offer.candidate.gapSuggestionId,
        customerId: f.customerIds[4],
      },
    );
    const dashboard = await f.owner.query(
      api.ai.gapOptimizerHelpers.getRecoveryDashboard,
      { orgId: f.orgId, serviceDate: DATE },
    );
    expect(dashboard.gaps[0].topCandidates[0]._id).toBe(second);
    expect(dashboard.gaps[0].activeOffer).toBe(false);
    await approve(t, f, second);
  });

  test("renamed services and timezone changes invalidate previously reviewed offers", async () => {
    const f = await fixture(t);
    const oldName = await approve(t, f);
    await t.run((ctx) => ctx.db.patch(f.serviceId, { name: "Cut and finish" }));
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId: oldName.notificationId,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(oldName.candidate._id)))?.status,
    ).toBe("expired");
    const oldTimezone = await approve(t, f);
    const settings = (await t.run((ctx) =>
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", f.orgId))
        .first(),
    ))!;
    await f.owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId: f.orgId,
      timezone: "UTC",
      currency: settings.currency,
      locale: settings.locale,
      slotDurationMins: settings.slotDurationMins,
      bookingWindowDays: settings.bookingWindowDays,
      cancellationWindowHours: settings.cancellationWindowHours,
      bufferTimeMins: settings.bufferTimeMins,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(oldTimezone.candidate._id)))?.status,
    ).toBe("expired");
    expect(
      (await t.run((ctx) => ctx.db.get(oldTimezone.notificationId)))?.status,
    ).toBe("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("legacy queued offers without a verified service and token are never delivered", async () => {
    const f = await fixture(t);
    const notificationId = await t.mutation(
      internal.notifications.scheduleNotification,
      {
        orgId: f.orgId,
        customerId: f.customerIds[0],
        channel: "email",
        type: "gap_fill_offer",
        recipientAddress: "client0@example.com",
        templateData: {
          draftedMessage: "Old AI draft",
          gapStartAt: at(9),
          gapEndAt: at(12),
        },
      },
    );
    await t.action(internal.notifications.processIndividualNotification, {
      notificationId,
    });
    expect((await t.run((ctx) => ctx.db.get(notificationId)))?.status).toBe(
      "cancelled",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
