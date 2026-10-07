import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { api, components, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { createAuth } from "../../convex/betterAuth";
import {
  APP_REVIEW_EMAIL,
  APP_REVIEW_SLUG,
  appReviewOtp,
} from "../../convex/lib/appReview";
import {
  acceptsPublicBookings,
  isWebsitePublished,
} from "../../convex/lib/publication";

// Fixture only: never an operator credential or shipped mobile constant.
const FIXTURE_CODE = "271828";
beforeEach(() => {
  vi.stubEnv("APP_REVIEW_ENABLED", "false");
  vi.stubEnv("APP_REVIEW_EMAIL", APP_REVIEW_EMAIL);
  vi.stubEnv("APP_REVIEW_OTP", FIXTURE_CODE);
  vi.stubEnv("APP_REVIEW_EXPIRES_AT", String(Date.now() + 86_400_000));
  for (const name of [
    "APP_REVIEW_ORG_ID",
    "APP_REVIEW_USER_ID",
    "APP_REVIEW_AUTH_USER_ID",
    "AUTH_TEST_OTP",
  ])
    vi.stubEnv(name, "");
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "app-review-test-secret-not-an-operator-credential",
  );
  vi.stubEnv("CONVEX_SITE_URL", "http://localhost:3211");
  vi.stubEnv("AUTH_EMAIL_MODE", "console");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function fixture() {
  const t = convexTest(schema, convexModules);
  betterAuthTest.register(t);
  const binding = await t.mutation(internal.appReview.provision, {});
  vi.stubEnv("APP_REVIEW_ORG_ID", binding.orgId);
  vi.stubEnv("APP_REVIEW_USER_ID", binding.userId);
  vi.stubEnv("APP_REVIEW_AUTH_USER_ID", binding.authUserId);
  vi.stubEnv("APP_REVIEW_ENABLED", "true");
  const reviewer = t.withIdentity({
    subject: binding.authUserId,
    email: APP_REVIEW_EMAIL,
    emailVerified: true,
  });
  return { t, binding, reviewer };
}

async function request(
  t: Awaited<ReturnType<typeof fixture>>["t"],
  path: string,
  body: unknown,
) {
  return t.run(async (ctx) => {
    const response = await createAuth(ctx).handler(
      new Request(`http://localhost:3000/api/auth/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify(body),
      }),
    );
    return { status: response.status, body: await response.json() };
  });
}

describe("isolated App Review access", () => {
  it("provisions only new fictional beauty data and refuses to link an existing email", async () => {
    const { t, binding } = await fixture();
    expect(await t.query(internal.appReview.signInAvailable, {})).toBe(true);
    expect(await t.run((ctx) => ctx.db.get(binding.orgId))).toMatchObject({
      slug: APP_REVIEW_SLUG,
      websiteStatus: "unpublished",
      listingStatus: "unpublished",
    });
    const customers = await t.run((ctx) =>
      ctx.db
        .query("customers")
        .withIndex("by_org", (q) => q.eq("orgId", binding.orgId))
        .collect(),
    );
    expect(customers).toHaveLength(1);
    expect(customers[0].email).toBeUndefined();
    expect(customers[0].phone).toBeUndefined();
    vi.stubEnv("APP_REVIEW_ENABLED", "false");
    for (const name of [
      "APP_REVIEW_ORG_ID",
      "APP_REVIEW_USER_ID",
      "APP_REVIEW_AUTH_USER_ID",
    ])
      vi.stubEnv(name, "");
    await expect(t.mutation(internal.appReview.provision, {})).rejects.toThrow(
      "already exists",
    );
  });

  it("uses the fixed code only for the bound sign-in account while preserving hashed OTPs, attempts and expiry", async () => {
    const { t, binding } = await fixture();
    expect(
      (
        await request(t, "email-otp/send-verification-otp", {
          email: APP_REVIEW_EMAIL,
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    expect(console.info).not.toHaveBeenCalled();
    const verification = await t.query(components.betterAuth.adapter.findOne, {
      model: "verification",
      where: [
        { field: "identifier", value: `sign-in-otp-${APP_REVIEW_EMAIL}` },
      ],
    });
    expect(verification).toBeTruthy();
    expect(verification!.value).not.toContain(FIXTURE_CODE);
    expect(
      verification!.expiresAt - verification!.createdAt,
    ).toBeLessThanOrEqual(300_001);
    const wrong = await request(t, "sign-in/email-otp", {
      email: APP_REVIEW_EMAIL,
      otp: "000000",
    });
    expect(wrong.status).toBeGreaterThanOrEqual(400);
    const result = await request(t, "sign-in/email-otp", {
      email: APP_REVIEW_EMAIL,
      otp: FIXTURE_CODE,
    });
    expect(result.status).toBe(200);
    expect(result.body.user.id).toBe(binding.authUserId);
    expect(
      (
        await request(t, "sign-in/email-otp", {
          email: APP_REVIEW_EMAIL,
          otp: FIXTURE_CODE,
        })
      ).status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (
        await request(t, "email-otp/send-verification-otp", {
          email: APP_REVIEW_EMAIL,
          type: "forget-password",
        })
      ).status,
    ).toBe(403);
  });

  it("keeps ordinary email delivery and randomized verification unchanged", async () => {
    const { t } = await fixture();
    expect(
      (
        await request(t, "email-otp/send-verification-otp", {
          email: "ordinary@example.com",
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
    expect(console.info).toHaveBeenCalledOnce();
    const message = vi.mocked(console.info).mock.calls[0][0] as string;
    expect(message).not.toContain(FIXTURE_CODE);
    expect(message).toMatch(/OTP for ordinary@example.com: \d{6}$/);
  });

  it("keeps the request limiter and rejects an expired review challenge", async () => {
    const { t } = await fixture();
    for (let index = 0; index < 3; index++)
      expect(
        (
          await request(t, "email-otp/send-verification-otp", {
            email: APP_REVIEW_EMAIL,
            type: "sign-in",
          })
        ).status,
      ).toBe(200);
    expect(
      (
        await request(t, "email-otp/send-verification-otp", {
          email: APP_REVIEW_EMAIL,
          type: "sign-in",
        })
      ).status,
    ).toBe(429);
    await t.mutation(components.betterAuth.adapter.updateMany, {
      paginationOpts: { cursor: null, numItems: 100 },
      input: {
        model: "verification",
        where: [
          { field: "identifier", value: `sign-in-otp-${APP_REVIEW_EMAIL}` },
        ],
        update: { expiresAt: Date.now() - 1000 },
      },
    });
    expect(
      (
        await request(t, "sign-in/email-otp", {
          email: APP_REVIEW_EMAIL,
          otp: FIXTURE_CODE,
        })
      ).status,
    ).toBeGreaterThanOrEqual(400);
  });

  it("fails closed for disabled/expired/mismatched bindings without affecting ordinary sign-in", async () => {
    const { t, binding, reviewer } = await fixture();
    vi.stubEnv("APP_REVIEW_AUTH_USER_ID", "another-auth-user");
    expect(await t.query(internal.appReview.signInAvailable, {})).toBe(false);
    expect(
      (
        await request(t, "email-otp/send-verification-otp", {
          email: APP_REVIEW_EMAIL,
          type: "sign-in",
        })
      ).status,
    ).toBe(403);
    await expect(reviewer.mutation(api.users.ensureUser, {})).rejects.toThrow(
      "unavailable",
    );
    vi.stubEnv("APP_REVIEW_AUTH_USER_ID", binding.authUserId);
    vi.stubEnv("APP_REVIEW_EXPIRES_AT", String(Date.now() - 1));
    expect(appReviewOtp()).toBeUndefined();
    expect(await t.query(internal.appReview.signInAvailable, {})).toBe(false);
    vi.stubEnv("APP_REVIEW_EXPIRES_AT", String(Date.now() + 86_400_000));
    vi.stubEnv("APP_REVIEW_ENABLED", "false");
    expect(await t.query(internal.appReview.signInAvailable, {})).toBe(false);
    await expect(reviewer.query(api.users.getMyProfile, {})).rejects.toThrow(
      "unavailable",
    );
    expect(
      (
        await request(t, "email-otp/send-verification-otp", {
          email: "ordinary@example.com",
          type: "sign-in",
        })
      ).status,
    ).toBe(200);
  });

  it("pins all reviewer access to the demo even if another studio accidentally links the user", async () => {
    const { t, reviewer, binding } = await fixture();
    const owner = t.withIdentity({
      subject: "ordinary-owner",
      email: "owner@example.com",
    });
    await owner.mutation(api.users.ensureUser, {});
    const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Ordinary Studio",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("staff_members", {
        orgId,
        userId: binding.userId,
        role: "owner",
        displayName: "Accidental seat",
        specialties: [],
        isDeleted: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(orgId, { plan: "paid" });
    });
    expect(await reviewer.query(api.users.listMemberships, {})).toEqual([
      { orgId: binding.orgId, name: "OPUS Review Studio", role: "owner" },
    ]);
    expect(await reviewer.query(api.users.getMyProfile, {})).toMatchObject({
      orgId: binding.orgId,
    });
    await expect(
      reviewer.mutation(api.users.switchOrg, { orgId }),
    ).rejects.toThrow("limited");
    await expect(
      reviewer.query(api.staff.listStaffMembers, { orgId }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      reviewer.mutation(api.activation.startBeautyBusiness, {
        name: "Other Studio",
      }),
    ).rejects.toThrow("limited");
    await expect(
      reviewer.mutation(api.opusUsers.getOrCreate, {}),
    ).rejects.toThrow("limited");
    await expect(
      reviewer.mutation(api.staff.acceptStaffInvite, { token: "any-invite" }),
    ).rejects.toThrow("limited");
    const attacker = t.withIdentity({
      subject: "unbound-review-identity",
      email: APP_REVIEW_EMAIL,
    });
    await expect(attacker.mutation(api.users.ensureUser, {})).rejects.toThrow(
      "unavailable",
    );
    await expect(
      owner.mutation(api.staff.createStaffMember, {
        orgId,
        displayName: "Review seat",
        role: "staff",
        specialties: [],
        signInEmail: APP_REVIEW_EMAIL,
      }),
    ).rejects.toThrow("cannot be invited");
  });

  it("allows demo appointments and services while rejecting external actions/publication and delivery even after OTP is disabled", async () => {
    const { t, reviewer, binding } = await fixture();
    const management = await reviewer.query(api.mobileManagement.list, {});
    expect(management.services).toHaveLength(1);
    const service = management.services[0];
    const staffIds = await t.run(async (ctx) =>
      service.staffIds.map((id) => {
        const staffId = ctx.db.normalizeId("staff_members", id);
        if (!staffId) throw new Error("Invalid fixture staff ID");
        return staffId;
      }),
    );
    const savedService = await reviewer.mutation(
      api.mobileManagement.saveService,
      {
        name: "Demo manicure",
        description: "Fictional review service",
        durationMins: 30,
        priceMinorUnits: 80000,
        currency: "MKD",
        staffIds,
        isActive: true,
        isOpusVisible: false,
      },
    );
    const bootstrap = await reviewer.query(api.mobile.bootstrap, {});
    if (!bootstrap.available) throw new Error("Review studio unavailable");
    const appointmentId = await reviewer.mutation(
      api.mobile.createAppointment,
      {
        staffId: staffIds[0],
        serviceId: savedService,
        startAt: bootstrap.today + 7 * 86_400_000 + 11 * 3_600_000,
        customerName: "Another Fictional Client",
      },
    );
    const created = await t.run(async (ctx) =>
      ctx.db.normalizeId("bookings", appointmentId),
    );
    if (!created) throw new Error("Booking unavailable");
    await reviewer.mutation(api.mobile.changeAppointmentStatus, {
      bookingId: created,
      status: "cancelled",
    });
    await expect(reviewer.mutation(api.website.publish, {})).rejects.toThrow(
      "unavailable",
    );
    await expect(reviewer.mutation(api.listing.publishOrg, {})).rejects.toThrow(
      "unavailable",
    );
    await expect(
      reviewer.query(internal.billing.getOwnerContext, {}),
    ).rejects.toThrow("unavailable");
    await expect(
      reviewer.query(internal.auth.assertPaidOrgRole, {
        orgId: binding.orgId,
        role: "owner",
        feature: "AI front desk",
      }),
    ).rejects.toThrow("unavailable");
    vi.stubEnv("APP_REVIEW_ENABLED", "false");
    await t.run((ctx) =>
      ctx.db.patch(binding.orgId, {
        websiteStatus: "published",
        listingStatus: "published",
      }),
    );
    const org = (await t.run((ctx) => ctx.db.get(binding.orgId)))!;
    expect(isWebsitePublished(org)).toBe(false);
    expect(acceptsPublicBookings(org)).toBe(false);
    expect(
      await t.query(api.publicSite.getBySlug, { slug: APP_REVIEW_SLUG }),
    ).toBeNull();
    for (const channel of ["email", "sms", "whatsapp"] as const) {
      const notificationId = await t.mutation(
        internal.notifications.scheduleNotification,
        {
          orgId: binding.orgId,
          channel,
          type: "booking_confirmation",
          recipientAddress: "recipient@example.com",
          templateData: {},
        },
      );
      expect(await t.run((ctx) => ctx.db.get(notificationId))).toMatchObject({
        status: "cancelled",
        failureReason: expect.stringContaining("App Review"),
      });
    }
  });

  it("cannot receive or open another studio's push after an accidental extra membership", async () => {
    const { t, reviewer, binding } = await fixture();
    vi.stubEnv("EXPO_PUSH_ENABLED", "true");
    vi.stubEnv("EXPO_PUSH_ACCESS_TOKEN", "mock-push-credential-for-tests");
    const owner = t.withIdentity({
      subject: "other-owner",
      email: "other-owner@example.com",
    });
    await owner.mutation(api.users.ensureUser, {});
    const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
    });
    const session = await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: binding.authUserId,
          token: crypto.randomUUID(),
          expiresAt: Date.now() + 60_000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });
    const { notificationId, bookingId } = await t.run(async (ctx) => {
      const now = Date.now();
      const staffId = await ctx.db.insert("staff_members", {
        orgId,
        userId: binding.userId,
        role: "owner",
        displayName: "Accidental review seat",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      const customerId = await ctx.db.insert("customers", {
        orgId,
        name: "Other studio client",
        totalVisits: 0,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      const serviceId = await ctx.db.insert("services", {
        orgId,
        name: "Other service",
        durationMins: 30,
        priceMinorUnits: 100000,
        currency: "MKD",
        staffIds: [staffId],
        isOpusVisible: false,
        popularityScore: 0,
        isActive: true,
        isDeleted: false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
      const bookingId = await ctx.db.insert("bookings", {
        orgId,
        staffId,
        customerId,
        serviceId,
        startAt: now + 86_400_000,
        endAt: now + 86_400_000 + 1_800_000,
        priceMinorUnits: 100000,
        currency: "MKD",
        surgePriceApplied: false,
        status: "confirmed",
        source: "manual",
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      const deviceId = await ctx.db.insert("staff_push_devices", {
        orgId,
        userId: binding.userId,
        deviceId: crypto.randomUUID(),
        kind: "expo",
        authSessionId: session._id,
        expoToken: "ExpoPushToken[fixture-only]",
        locale: "en",
        lastSeenAt: now,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      const notificationId = await ctx.db.insert("notifications", {
        orgId,
        pushUserId: binding.userId,
        pushDeviceId: deviceId,
        pushEvent: "new_booking",
        pushBookingStartAt: now + 86_400_000,
        bookingId,
        channel: "push",
        type: "staff_new_booking",
        recipientAddress: deviceId,
        templateData: {},
        status: "pending",
        scheduledFor: now,
        attemptCount: 0,
        createdAt: now,
      });
      return { notificationId, bookingId };
    });
    expect(
      await reviewer.mutation(api.pushNotifications.openNotification, {
        notificationId,
      }),
    ).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(binding.userId))).toMatchObject({
      activeOrgId: binding.orgId,
    });
    expect(
      await t.mutation(internal.pushQueue.prepare, { notificationId }),
    ).toEqual({ status: "cancelled" });
    expect(await t.run((ctx) => ctx.db.get(notificationId))).toMatchObject({
      failureReason: expect.stringContaining("App Review"),
    });
    await t.mutation(internal.dashboardNotifications.create, {
      orgId,
      type: "new_booking",
      title: "New appointment",
      body: "Test",
      bookingId,
    });
    const queued = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(queued).toHaveLength(1); // Only the deliberately seeded forbidden notification.
  });
});
