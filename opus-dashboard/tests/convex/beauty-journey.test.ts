import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { wallClockTimestampToInstant } from "../../convex/lib/bookingTime";

const OTP = "481516";
const DATE = "2026-10-14";
const DAY = Date.parse(`${DATE}T00:00:00Z`);
const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;

async function studio(t: Backend, key: string) {
  const owner = t.withIdentity({
    subject: `${key}-owner`,
    email: `${key}-owner@example.com`,
    emailVerified: true,
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} beauty studio`,
    category: "beauty_salon",
  });
  await owner.mutation(api.activation.saveOwnerName, { name: "Ada Owner" });
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    country: "MK",
    coordinates: { lat: 41.99, lng: 21.43 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Signature Treatment",
    durationMins: 30,
    priceMinorUnits: 1_800,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:15",
      close: "17:15",
      isClosed: false,
    })),
  });
  await owner.mutation(api.orgSettings.updateOrgSettings, {
    orgId,
    timezone: "Europe/Skopje",
    slotDurationMins: 30,
    bufferTimeMins: 0,
    cancellationWindowHours: 24,
  });
  const profile = await owner.query(api.users.getMyProfile);
  const ownerStaffId = profile!.staffId!;
  const staffId = await owner.mutation(api.staff.createStaffMember, {
    orgId,
    displayName: "Elena Specialist",
    role: "staff",
    specialties: [],
  });
  await owner.mutation(api.services.updateService, {
    orgId,
    serviceId,
    staffIds: [ownerStaffId, staffId],
  });
  await owner.mutation(api.availability.copyScheduleToAllStaff, {
    orgId,
    sourceStaffId: ownerStaffId,
  });
  const slotArgs = { orgId, staffId, serviceId, date: DATE };
  expect(await t.query(api.publicBooking.getPublicSlots, slotArgs)).toEqual([]);
  await owner.mutation(api.website.publish, { orgId });
  expect(await owner.query(api.website.getReadiness, { orgId })).toMatchObject({
    websiteStatus: "published",
    allBlockingMet: true,
  });
  const slots = await t.query(api.publicBooking.getPublicSlots, slotArgs);
  expect(slots[0].startAt).toBe(DAY + (9 * 60 + 15) * 60_000);
  return { t, owner, orgId, serviceId, ownerStaffId, staffId, slots, slotArgs };
}
type Studio = Awaited<ReturnType<typeof studio>>;

function draft(s: Studio, index = 0, email = "client@example.com") {
  return {
    orgId: s.orgId,
    staffId: s.staffId,
    serviceId: s.serviceId,
    startAt: s.slots[index].startAt,
    customerName: "Mila Client",
    customerEmail: email,
    customerPhone: "+389 70 222 333",
  };
}

async function verifiedGuest(
  s: Studio,
  index = 0,
  email = "client@example.com",
) {
  const challenge = await s.t.action(api.publicBooking.requestBookingEmailOtp, {
    orgId: s.orgId,
    email,
  });
  return s.t.action(api.publicBooking.confirmPublicBooking, {
    ...draft(s, index, email),
    challengeId: challenge.challengeId,
    otp: OTP,
  });
}

async function linkStaff(s: Studio, staffId: Id<"staff_members">, key: string) {
  const email = `${key}@example.com`;
  const inviteId = await s.owner.mutation(api.staff.inviteStaffMember, {
    orgId: s.orgId,
    staffId,
    email,
  });
  const invite = await s.t.run((ctx) => ctx.db.get(inviteId));
  const account = s.t.withIdentity({
    subject: key,
    email,
    emailVerified: true,
  });
  await account.mutation(api.users.ensureUser);
  await account.mutation(api.staff.acceptStaffInvite, { token: invite!.token });
  return account;
}

async function notifications(s: Studio) {
  return s.t.run((ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
      .collect(),
  );
}

const provider = vi.fn(
  async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input) !== "https://api.resend.com/emails")
      throw new Error(
        `Unexpected external request in beauty journey: ${String(input)}`,
      );
    expect(init?.method).toBe("POST");
    return new Response(JSON.stringify({ id: "journey-provider-message" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", "beauty-journey-auth-secret");
  vi.stubEnv("BOOKING_OTP_SECRET", "beauty-journey-otp-secret");
  vi.stubEnv("AUTH_TEST_OTP", OTP);
  vi.stubEnv("RESEND_API_KEY", "re_journey_fake_provider");
  vi.stubEnv("AUTH_EMAIL_FROM", "bookings@opus.mk");
  provider.mockClear();
  vi.stubGlobal("fetch", provider);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("beauty golden journey through real backend handlers", () => {
  it.each(["free", "paid"] as const)(
    "%s: onboarding to verified guest booking, calendar, conflict, reschedule, and cancellation",
    async (plan) => {
      const s = await studio(createBackend(), plan);
      // Billing-provider verification has separate coverage; only entitlement is a fixture here.
      if (plan === "paid") {
        await s.t.run((ctx) => ctx.db.patch(s.orgId, { plan }));
        await s.owner.mutation(
          api.orgSettings.updateEmailNotificationSettings,
          {
            orgId: s.orgId,
            customerReminderEmailEnabled: true,
            customerReminderHoursBefore: [24],
          },
        );
      }
      const challenge = await s.t.action(
        api.publicBooking.requestBookingEmailOtp,
        {
          orgId: s.orgId,
          email: " CLIENT@EXAMPLE.COM ",
        },
      );
      const confirm = {
        ...draft(s),
        challengeId: challenge.challengeId,
        otp: OTP,
      };
      await expect(
        s.t.action(api.publicBooking.confirmPublicBooking, {
          ...confirm,
          otp: "000000",
        }),
      ).rejects.toThrow("verification code is incorrect");
      expect(await s.owner.query(api.mobile.calendar, { day: DAY })).toEqual(
        [],
      );

      const booked = await s.t.action(
        api.publicBooking.confirmPublicBooking,
        confirm,
      );
      expect(booked).toMatchObject({
        startAt: s.slots[0].startAt,
        serviceName: "Signature Treatment",
        staffName: "Elena Specialist",
      });
      const web = await s.owner.query(api.bookings.listBookingsByOrg, {
        orgId: s.orgId,
        fromDate: DAY,
        toDate: DAY + 86_400_000,
      });
      expect(web).toHaveLength(1);
      expect(web[0]).toMatchObject({
        _id: booked.bookingId,
        status: "confirmed",
        priceMinorUnits: 1_800,
        customer: {
          name: "Mila Client",
          email: "client@example.com",
          phone: "+38970222333",
        },
      });
      expect(web[0].endAt - web[0].startAt).toBe(30 * 60_000);
      expect(
        await s.owner.query(api.mobile.calendar, { day: DAY }),
      ).toMatchObject([
        {
          id: booked.bookingId,
          status: "confirmed",
          customerName: "Mila Client",
        },
      ]);
      const queued = await notifications(s);
      const confirmation = queued.find(
        (n) =>
          n.bookingId === booked.bookingId && n.type === "booking_confirmation",
      );
      expect(confirmation?.recipientAddress).toBe("client@example.com");
      expect(
        queued.filter(
          (n) =>
            n.bookingId === booked.bookingId &&
            n.type === "booking_reminder" &&
            n.recipientAddress === "client@example.com",
        ),
      ).toHaveLength(plan === "paid" ? 1 : 0);
      await s.t.action(internal.notifications.processIndividualNotification, {
        notificationId: confirmation!._id,
      });
      expect(
        (await notifications(s)).find((n) => n._id === confirmation!._id)
          ?.status,
      ).toBe("sent");

      await expect(
        s.t.action(api.publicBooking.confirmPublicBooking, confirm),
      ).rejects.toThrow("can no longer be used");
      const contender = await s.t.action(
        api.publicBooking.requestBookingEmailOtp,
        {
          orgId: s.orgId,
          email: "contender@example.com",
        },
      );
      await expect(
        s.t.action(api.publicBooking.confirmPublicBooking, {
          ...draft(s, 0, "contender@example.com"),
          customerPhone: "+389 70 444 555",
          challengeId: contender.challengeId,
          otp: OTP,
        }),
      ).rejects.toThrow(/available|booked/i);
      const afterConflict = await s.t.run(async (ctx) => ({
        challenge: await ctx.db.get(contender.challengeId),
        customers: await ctx.db
          .query("customers")
          .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
          .collect(),
      }));
      expect(afterConflict.challenge?.status).toBe("pending");
      expect(afterConflict.customers.map((c) => c.email)).toEqual([
        "client@example.com",
      ]);

      const rescheduleSlots = await s.owner.query(
        api.slots.getRescheduleSlots,
        {
          orgId: s.orgId,
          bookingId: booked.bookingId,
          date: DATE,
        },
      );
      expect(rescheduleSlots).toContainEqual({
        startAt: s.slots[2].startAt,
        endAt: s.slots[2].endAt,
      });
      const movedId = await s.owner.mutation(api.bookings.rescheduleBooking, {
        orgId: s.orgId,
        bookingId: booked.bookingId,
        newStartAt: s.slots[2].startAt,
      });
      expect(
        await s.owner.query(api.bookings.getBooking, {
          orgId: s.orgId,
          bookingId: booked.bookingId,
        }),
      ).toMatchObject({
        status: "cancelled",
        cancellationReason: "Rescheduled",
      });
      expect(
        await s.owner.query(api.mobile.calendar, { day: DAY }),
      ).toMatchObject([
        { id: movedId, startAt: s.slots[2].startAt, priceMinorUnits: 1_800 },
      ]);
      const afterMove = await s.t.query(
        api.publicBooking.getPublicSlots,
        s.slotArgs,
      );
      expect(
        afterMove.some((slot) => slot.startAt === s.slots[0].startAt),
      ).toBe(true);
      expect(
        afterMove.some((slot) => slot.startAt === s.slots[2].startAt),
      ).toBe(false);
      await s.owner.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: movedId,
        status: "cancelled",
      });
      expect(
        await s.owner.query(api.mobile.calendar, { day: DAY }),
      ).toMatchObject([{ id: movedId, status: "cancelled" }]);
      expect(
        await s.owner.query(api.slots.getRescheduleSlots, {
          orgId: s.orgId,
          bookingId: movedId,
          date: DATE,
        }),
      ).toEqual([]);
      expect(
        await s.t.query(api.publicBooking.getPublicSlots, s.slotArgs),
      ).toEqual(s.slots);
      const audit = await s.t.run((ctx) =>
        ctx.db
          .query("audit_log")
          .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
          .collect(),
      );
      expect(
        audit
          .filter((row) => row.action.startsWith("booking."))
          .map((row) => row.action),
      ).toEqual([
        "booking.created",
        "booking.rescheduled",
        "booking.cancelled",
      ]);
      const finalNotifications = await notifications(s);
      expect(finalNotifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bookingId: movedId,
            type: "booking_rescheduled",
            recipientAddress: "client@example.com",
          }),
          expect.objectContaining({
            bookingId: movedId,
            type: "booking_cancelled",
            recipientAddress: "client@example.com",
          }),
        ]),
      );
    },
  );

  it("keeps owner, manager, assigned-only staff, and tenant boundaries through a Pro downgrade", async () => {
    const t = createBackend();
    const s = await studio(t, "team");
    const other = await studio(t, "separate");
    await expect(
      s.owner.mutation(api.staff.inviteStaffMember, {
        orgId: s.orgId,
        staffId: s.staffId,
        email: "specialist@example.com",
      }),
    ).rejects.toThrow("requires the paid plan");
    await expect(
      s.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
        orgId: s.orgId,
        customerReminderEmailEnabled: true,
        customerReminderHoursBefore: [1],
      }),
    ).rejects.toThrow("requires the paid plan");
    await t.run((ctx) => ctx.db.patch(s.orgId, { plan: "paid" }));
    const personal = await linkStaff(s, s.staffId, "specialist");
    const managerId = await s.owner.mutation(api.staff.createStaffMember, {
      orgId: s.orgId,
      displayName: "Manager",
      role: "manager",
      specialties: [],
    });
    const manager = await linkStaff(s, managerId, "manager");
    await s.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
      orgId: s.orgId,
      customerReminderEmailEnabled: true,
      customerReminderHoursBefore: [1],
    });
    const guest = await verifiedGuest(s);
    const ownerBookingId = (await manager.mutation(
      api.mobile.createAppointment,
      {
        staffId: s.ownerStaffId,
        serviceId: s.serviceId,
        startAt: s.slots[0].startAt,
        customerName: "Owner client",
        customerEmail: "owner-client@example.com",
      },
    )) as Id<"bookings">;
    const foreign = await verifiedGuest(other, 0, "foreign@example.com");

    for (const plan of ["paid", "free"] as const) {
      await t.run((ctx) => ctx.db.patch(s.orgId, { plan }));
      for (const account of [s.owner, manager]) {
        expect(
          (await account.query(api.mobile.calendar, { day: DAY }))
            .map((b) => b.id)
            .sort(),
        ).toEqual([guest.bookingId, ownerBookingId].sort());
        await expect(
          account.query(api.bookings.listBookingsByOrg, { orgId: other.orgId }),
        ).rejects.toThrow("Unauthorised");
        await expect(
          account.mutation(api.bookings.cancelBooking, {
            orgId: s.orgId,
            bookingId: foreign.bookingId,
          }),
        ).rejects.toThrow("You can only access your own appointments");
        await expect(
          account.query(api.slots.getRescheduleSlots, {
            orgId: s.orgId,
            bookingId: foreign.bookingId,
            date: DATE,
          }),
        ).rejects.toThrow("You can only access your own appointments");
      }
      expect(
        await personal.query(api.mobile.calendar, { day: DAY }),
      ).toMatchObject([{ id: guest.bookingId }]);
      expect(
        await personal.query(api.bookings.getBooking, {
          orgId: s.orgId,
          bookingId: ownerBookingId,
        }),
      ).toBeNull();
      await expect(
        personal.mutation(api.mobile.changeAppointmentStatus, {
          bookingId: ownerBookingId,
          status: "cancelled",
        }),
      ).rejects.toThrow("You can only access your own appointments");
      await expect(
        personal.mutation(api.bookings.rescheduleBooking, {
          orgId: s.orgId,
          bookingId: ownerBookingId,
          newStartAt: s.slots[2].startAt,
        }),
      ).rejects.toThrow("You can only access your own appointments");
      await expect(
        personal.mutation(api.mobile.createAppointment, {
          staffId: s.ownerStaffId,
          serviceId: s.serviceId,
          startAt: s.slots[2].startAt,
          customerName: "Forbidden",
        }),
      ).rejects.toThrow("You can only access your own appointments");
      await expect(
        personal.query(api.slots.getRescheduleSlots, {
          orgId: s.orgId,
          bookingId: ownerBookingId,
          date: DATE,
        }),
      ).rejects.toThrow("You can only access your own appointments");
      expect(
        await personal.query(api.slots.getRescheduleSlots, {
          orgId: s.orgId,
          bookingId: guest.bookingId,
          date: DATE,
        }),
      ).not.toHaveLength(0);
      await expect(
        manager.mutation(api.orgSettings.updateOrgSettings, {
          orgId: s.orgId,
          cancellationWindowHours: 1,
        }),
      ).rejects.toThrow("Unauthorised");
    }
    await expect(
      s.owner.mutation(api.orgSettings.updateEmailNotificationSettings, {
        orgId: s.orgId,
        customerReminderHoursBefore: [2],
      }),
    ).rejects.toThrow("requires the paid plan");
    const spare = await s.owner.mutation(api.staff.createStaffMember, {
      orgId: s.orgId,
      displayName: "New seat",
      role: "staff",
      specialties: [],
    });
    await expect(
      s.owner.mutation(api.staff.inviteStaffMember, {
        orgId: s.orgId,
        staffId: spare,
        email: "new-account@example.com",
      }),
    ).rejects.toThrow("requires the paid plan");
    const reminder = (await notifications(s)).find(
      (n) =>
        n.bookingId === guest.bookingId &&
        n.type === "booking_reminder" &&
        n.recipientAddress === "client@example.com",
    );
    expect(reminder).toBeDefined();
    vi.setSystemTime(reminder!.scheduledFor);
    const requestsBeforeReminder = provider.mock.calls.length;
    expect(
      await t.action(internal.notifications.processIndividualNotification, {
        notificationId: reminder!._id,
      }),
    ).toBe("cancelled");
    expect(provider).toHaveBeenCalledTimes(requestsBeforeReminder);
    expect(
      await personal.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: guest.bookingId,
        status: "completed",
      }),
    ).toBe(true);
    expect(
      await manager.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: ownerBookingId,
        status: "no_show",
      }),
    ).toBe(true);
    expect(
      await personal.query(api.mobile.getAppointment, {
        bookingId: guest.bookingId,
      }),
    ).toMatchObject({ id: guest.bookingId, status: "completed" });
    expect(
      await manager.query(api.mobile.getAppointment, {
        bookingId: ownerBookingId,
      }),
    ).toMatchObject({ id: ownerBookingId, status: "no_show" });
    expect(
      (await s.owner.query(api.mobile.calendar, { day: DAY })).map(
        ({ id, status }) => ({ id, status }),
      ),
    ).toEqual(
      expect.arrayContaining([
        { id: guest.bookingId, status: "completed" },
        { id: ownerBookingId, status: "no_show" },
      ]),
    );
    // Terminal visits remain visible history, but cannot be moved as live bookings.
    for (const bookingId of [guest.bookingId, ownerBookingId]) {
      expect(
        await manager.query(api.slots.getRescheduleSlots, {
          orgId: s.orgId,
          bookingId,
          date: DATE,
        }),
      ).toEqual([]);
      await expect(
        manager.mutation(api.bookings.rescheduleBooking, {
          orgId: s.orgId,
          bookingId,
          newStartAt: s.slots[4].startAt,
        }),
      ).rejects.toThrow("Cannot reschedule this booking");
    }
    expect(
      await other.owner.query(api.bookings.getBooking, {
        orgId: other.orgId,
        bookingId: foreign.bookingId,
      }),
    ).toMatchObject({ status: "confirmed" });
    expect(
      await s.owner.query(api.website.getReadiness, { orgId: s.orgId }),
    ).toMatchObject({ websiteStatus: "published" });
  });

  it("preserves a verified client's ownership on reschedule and enforces the cancellation deadline across two studios", async () => {
    const t = createBackend();
    const first = await studio(t, "first");
    const second = await studio(t, "second");
    const a = await verifiedGuest(first);
    const b = await verifiedGuest(second, 2);
    const client = t.withIdentity({
      subject: "client",
      email: "client@example.com",
      emailVerified: true,
    });
    for (const booking of [a, b]) {
      await client.mutation(api.opusUsers.claimBooking, {
        bookingId: booking.bookingId,
        token: booking.claimToken!,
      });
    }
    const movedId = await first.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: first.orgId,
      bookingId: a.bookingId,
      newStartAt: first.slots[2].startAt,
    });
    const beforeReturningBooking = provider.mock.calls.length;
    const returning = await client.mutation(
      api.publicBooking.createAccountBooking,
      draft(first, 4),
    );
    expect(provider).toHaveBeenCalledTimes(beforeReturningBooking);
    const accountBookings = await client.query(api.opusUsers.getMyBookings);
    expect(accountBookings.map((booking) => booking._id)).toEqual(
      expect.arrayContaining([
        a.bookingId,
        movedId,
        b.bookingId,
        returning.bookingId,
      ]),
    );
    expect(
      accountBookings.find((booking) => booking._id === movedId)?.customerId,
    ).not.toBe(
      accountBookings.find((booking) => booking._id === b.bookingId)
        ?.customerId,
    );
    expect(await client.query(api.users.getMyProfile)).toBeNull();
    await expect(
      client.query(api.bookings.listBookingsByOrg, { orgId: first.orgId }),
    ).rejects.toThrow("Unauthorised");
    const stranger = t.withIdentity({
      subject: "stranger",
      email: "stranger@example.com",
      emailVerified: true,
    });
    await stranger.mutation(api.opusUsers.getOrCreate);
    await expect(
      stranger.mutation(api.opusUsers.cancelMyBooking, { bookingId: movedId }),
    ).rejects.toThrow("not found");

    const deadline =
      wallClockTimestampToInstant(first.slots[2].startAt, "Europe/Skopje") -
      24 * 3_600_000;
    vi.setSystemTime(deadline);
    expect(
      (await client.query(api.opusUsers.getMyBookings)).find(
        (booking) => booking._id === movedId,
      )?.canCancel,
    ).toBe(true);
    await client.mutation(api.opusUsers.cancelMyBooking, {
      bookingId: movedId,
    });
    vi.setSystemTime(deadline + 1_000);
    expect(
      (await client.query(api.opusUsers.getMyBookings)).find(
        (booking) => booking._id === b.bookingId,
      )?.canCancel,
    ).toBe(false);
    await expect(
      client.mutation(api.opusUsers.cancelMyBooking, {
        bookingId: b.bookingId,
      }),
    ).rejects.toThrow("Online cancellation is closed");
    expect(
      await second.owner.query(api.mobile.calendar, { day: DAY }),
    ).toMatchObject([{ id: b.bookingId, status: "confirmed" }]);
    expect(
      await first.owner.query(api.mobile.calendar, { day: DAY }),
    ).toMatchObject([
      { id: movedId, status: "cancelled" },
      { id: returning.bookingId, status: "confirmed" },
    ]);
    const clientCancellation = await t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", first.orgId))
        .collect(),
    );
    expect(clientCancellation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "booking.cancelled",
          resourceId: movedId,
          actorType: "opus_user",
        }),
      ]),
    );
    await second.owner.mutation(api.bookings.cancelBooking, {
      orgId: second.orgId,
      bookingId: b.bookingId,
      reason: "Client called the studio",
    });
    expect(
      (await client.query(api.opusUsers.getMyBookings)).find(
        (booking) => booking._id === b.bookingId,
      )?.status,
    ).toBe("cancelled");
  });

  it("offers reschedule slots for the saved combined duration, excluding only itself and respecting breaks and buffers", async () => {
    const s = await studio(createBackend(), "combined");
    const at = (hour: number, minute = 0) =>
      DAY + (hour * 60 + minute) * 60_000;
    const secondServiceId = await s.owner.mutation(api.services.createService, {
      orgId: s.orgId,
      name: "Finishing",
      durationMins: 30,
      priceMinorUnits: 600,
      currency: "MKD",
      staffIds: [s.staffId],
      sortOrder: 1,
      isOpusVisible: true,
    });
    await s.owner.mutation(api.orgSettings.updateOrgSettings, {
      orgId: s.orgId,
      bufferTimeMins: 15,
    });
    await s.owner.mutation(api.availability.setAvailabilityRule, {
      orgId: s.orgId,
      staffId: s.staffId,
      dayOfWeek: new Date(DAY).getUTCDay(),
      startTime: "09:15",
      endTime: "17:15",
      isActive: true,
      breaks: [{ startTime: "12:00", endTime: "13:00" }],
    });
    const bookingId = await s.owner.mutation(api.bookings.createManualBooking, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId, secondServiceId],
      startAt: at(9, 15),
      customerName: "Combined services",
    });
    await s.owner.mutation(api.bookings.createManualBooking, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [s.serviceId],
      startAt: at(11, 15),
      customerName: "Separate appointment",
    });
    // Service edits must not rewrite the duration or price of an already booked visit.
    await s.owner.mutation(api.services.updateService, {
      orgId: s.orgId,
      serviceId: s.serviceId,
      durationMins: 90,
      priceMinorUnits: 9_900,
    });
    const args = { orgId: s.orgId, bookingId, date: DATE };
    const choices = await s.owner.query(api.slots.getRescheduleSlots, args);
    expect(
      choices.every((slot) => slot.endAt - slot.startAt === 60 * 60_000),
    ).toBe(true);
    expect(choices.map((slot) => slot.startAt)).toEqual(
      expect.arrayContaining([
        at(9, 15),
        at(9, 30),
        at(9, 45),
        at(10),
        at(13),
        at(13, 15),
        at(16),
      ]),
    );
    for (const excluded of [
      at(10, 15),
      at(11, 15),
      at(12),
      at(12, 30),
      at(16, 15),
    ])
      expect(choices.some((slot) => slot.startAt === excluded)).toBe(false);
    // A choice is not a reservation: an intervening appointment must still win.
    expect(choices.some((slot) => slot.startAt === at(15))).toBe(true);
    await s.owner.mutation(api.bookings.createManualBooking, {
      orgId: s.orgId,
      staffId: s.staffId,
      serviceIds: [secondServiceId],
      startAt: at(15, 30),
      customerName: "Booked after opening the reschedule dialog",
    });
    await expect(
      s.owner.mutation(api.bookings.rescheduleBooking, {
        orgId: s.orgId,
        bookingId,
        newStartAt: at(15),
      }),
    ).rejects.toThrow("outside working hours or no longer available");
    expect(
      await s.owner.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId,
      }),
    ).toMatchObject({ status: "confirmed", startAt: at(9, 15) });
    const movedId = await s.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: s.orgId,
      bookingId,
      newStartAt: at(9, 30),
    });
    expect(
      await s.owner.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId: movedId,
      }),
    ).toMatchObject({
      startAt: at(9, 30),
      endAt: at(10, 30),
      priceMinorUnits: 2_400,
      serviceIds: [s.serviceId, secondServiceId],
    });
    await expect(
      s.owner.mutation(api.bookings.rescheduleBooking, {
        orgId: s.orgId,
        bookingId: movedId,
        newStartAt: at(10, 15),
      }),
    ).rejects.toThrow("outside working hours or no longer available");
    expect(
      await s.owner.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId: movedId,
      }),
    ).toMatchObject({ status: "confirmed", startAt: at(9, 30) });

    // Future manual changes retain their staff override policy: no public notice cutoff.
    vi.setSystemTime(wallClockTimestampToInstant(at(13, 14), "Europe/Skopje"));
    const today = await s.owner.query(api.slots.getRescheduleSlots, {
      ...args,
      bookingId: movedId,
    });
    expect(today[0].startAt).toBe(at(13, 15));
    const laterId = await s.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: s.orgId,
      bookingId: movedId,
      newStartAt: today[0].startAt,
    });
    expect(
      await s.owner.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId: laterId,
      }),
    ).toMatchObject({ startAt: at(13, 15), endAt: at(14, 15) });
    await s.owner.mutation(api.staff.updateStaffMember, {
      orgId: s.orgId,
      staffId: s.staffId,
      isActive: false,
    });
    expect(
      await s.owner.query(api.slots.getRescheduleSlots, {
        ...args,
        bookingId: laterId,
      }),
    ).toEqual([]);
  });
});
