import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import { wallClockTimestampToInstant } from "../../convex/lib/bookingTime";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type TestBackend = ReturnType<typeof createBackend>;

const TEST_OTP = "481516";
const openingHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "17:00",
  isClosed: false,
}));

function nextMondayDate() {
  const nextMonday = new Date();
  const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  return nextMonday.toISOString().slice(0, 10);
}

async function setupPublishedStudio(t: TestBackend) {
  const owner = t.withIdentity({
    subject: "email-owner",
    email: "owner@atelier.example",
    name: "Ada Owner",
  });
  const ownerUserId = await owner.mutation(api.users.ensureUser);
  const orgId = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Atelier Email",
    category: "beauty_salon",
  });
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    country: "MK",
    coordinates: { lat: 41.9981, lng: 21.4254 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Signature Treatment",
    description: "A calm studio treatment.",
    durationMins: 45,
    priceMinorUnits: 1_800,
  });
  await owner.mutation(api.activation.saveHours, { openingHours });
  await owner.mutation(api.activation.saveStorefront, {
    tagline: "Quiet care in the centre of Skopje.",
    bio: "A small beauty studio with thoughtful service.",
    phone: "+389 70 111 222",
  });
  const logoStorageId = await t.run(async (ctx) => {
    return await ctx.storage.store(
      new Blob(["email-flow-logo"], { type: "image/png" }),
    );
  });
  await owner.mutation(api.orgSettings.updateLogo, {
    orgId,
    storageId: logoStorageId,
  });
  await owner.mutation(api.orgMedia.addMedia, {
    orgId,
    url: "https://images.example.com/atelier-email.jpg",
    type: "cover",
    sortOrder: 0,
  });
  await owner.mutation(api.website.publish, { orgId });

  const slots = await t.query(api.publicBooking.getPublicSlots, {
    orgId,
    serviceId,
    staffId: "any",
    date: nextMondayDate(),
  });
  const slot = slots[0];
  const staffId = slot?.availableStaffIds[0];
  if (!slot || !staffId) throw new Error("Published studio has no test slot");
  return { owner, ownerUserId, orgId, serviceId, staffId, slot };
}

function bookingArgs(
  fixture: Awaited<ReturnType<typeof setupPublishedStudio>>,
) {
  return {
    orgId: fixture.orgId,
    serviceId: fixture.serviceId,
    staffId: fixture.staffId,
    startAt: fixture.slot.startAt,
    customerName: "Elena Client",
    customerPhone: "+389 70 222 333",
    customerEmail: "elena@example.com",
    customerNote: "First visit",
  };
}

describe("public booking email flow", () => {
  let t: TestBackend;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    t = createBackend();
    vi.stubEnv("SITE_URL", "http://localhost:3000");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-booking-email-secret");
    vi.stubEnv("BOOKING_OTP_SECRET", "test-booking-otp-secret");
    vi.stubEnv("AUTH_TEST_OTP", TEST_OTP);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("AUTH_EMAIL_FROM", "bookings@opus.mk");
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "resend-message-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("sends an OTP, creates nothing for a wrong code, then books once and sends the premium confirmation", async () => {
    const fixture = await setupPublishedStudio(t);
    await fixture.owner.mutation(
      api.orgSettings.updateEmailNotificationSettings,
      {
        orgId: fixture.orgId,
        customerReminderEmailEnabled: false,
        customerReminderHoursBefore: [24],
        staffNewBookingEmailEnabled: false,
        staffReminderEmailEnabled: false,
        staffReminderHoursBefore: [2],
        staffEmailRecipientUserIds: [],
      },
    );
    const args = bookingArgs(fixture);

    await expect(
      t.mutation(api.publicBooking.createPublicBooking, args),
    ).rejects.toThrow("Verify your email before booking");

    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: fixture.orgId,
      email: " ELENA@EXAMPLE.COM ",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const otpRequest = fetchMock.mock.calls[0][1] as RequestInit;
    const otpHeaders = new Headers(otpRequest.headers);
    const otpBody = JSON.parse(String(otpRequest.body)) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
    };
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    expect(otpHeaders.get("Idempotency-Key")).toMatch(/^opus-notification\//);
    expect(otpBody).toMatchObject({
      from: "OPUS <bookings@opus.mk>",
      to: ["elena@example.com"],
    });
    expect(otpBody.subject).toContain("Atelier Email");
    expect(otpBody.html).toContain(TEST_OTP);

    const afterOtpDelivery = await t.run(async (ctx) => {
      const verification = await ctx.db.get(challenge.challengeId);
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
        .collect();
      const audit = await ctx.db
        .query("audit_log")
        .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
        .collect();
      return { verification, notifications, audit };
    });
    const verificationEmail = afterOtpDelivery.notifications.find(
      (notification) => notification.type === "booking_verification",
    );
    expect(afterOtpDelivery.verification).toMatchObject({
      email: "elena@example.com",
      attempts: 0,
      status: "pending",
    });
    expect(verificationEmail).toMatchObject({
      status: "sent",
      templateData: { redacted: true },
    });
    expect(JSON.stringify(afterOtpDelivery.audit)).not.toContain(TEST_OTP);
    expect(JSON.stringify(afterOtpDelivery.audit)).not.toContain(
      "encryptedCode",
    );

    await expect(
      t.action(api.publicBooking.confirmPublicBooking, {
        ...args,
        challengeId: challenge.challengeId,
        otp: "000000",
      }),
    ).rejects.toThrow("verification code is incorrect");
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("bookings")
          .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
          .collect(),
      ),
    ).toHaveLength(0);

    const booking = await t.action(api.publicBooking.confirmPublicBooking, {
      ...args,
      challengeId: challenge.challengeId,
      otp: TEST_OTP,
    });
    expect(booking).toMatchObject({
      serviceName: "Signature Treatment",
      staffName: "Ada Owner",
      startAt: fixture.slot.startAt,
    });

    await expect(
      t.action(api.publicBooking.confirmPublicBooking, {
        ...args,
        challengeId: challenge.challengeId,
        otp: TEST_OTP,
      }),
    ).rejects.toThrow("can no longer be used");

    const queued = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
        .collect(),
    );
    const confirmation = queued.find(
      (notification) =>
        notification.type === "booking_confirmation" &&
        notification.bookingId === booking.bookingId,
    );
    expect(confirmation).toMatchObject({
      recipientAddress: "elena@example.com",
    });
    expect(["pending", "sent"]).toContain(confirmation?.status);
    if (!confirmation) throw new Error("Confirmation was not queued");

    if (confirmation.status === "pending") {
      await expect(
        t.action(internal.notifications.processIndividualNotification, {
          notificationId: confirmation._id,
        }),
      ).resolves.toBe("sent");
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const confirmationRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const confirmationHeaders = new Headers(confirmationRequest.headers);
    const confirmationBody = JSON.parse(String(confirmationRequest.body)) as {
      to: string[];
      subject: string;
      html: string;
      text: string;
      attachments: Array<{ filename: string; content: string }>;
    };
    expect(confirmationHeaders.get("Idempotency-Key")).toBe(
      `opus-notification/${confirmation._id}`,
    );
    expect(confirmationBody.to).toEqual(["elena@example.com"]);
    expect(confirmationBody.subject).toContain("Atelier Email");
    expect(confirmationBody.html).toContain("calendar.google.com");
    expect(confirmationBody.html).toContain("google.com/maps/dir");
    expect(confirmationBody.html).toContain("tel:+38970111222");
    expect(confirmationBody.attachments[0].filename).toBe(
      "opus-appointment.ics",
    );
    expect(
      Buffer.from(confirmationBody.attachments[0].content, "base64").toString(
        "utf8",
      ),
    ).toContain("BEGIN:VEVENT");

    const finalState = await t.run(async (ctx) => ({
      challenge: await ctx.db.get(challenge.challengeId),
      bookings: await ctx.db
        .query("bookings")
        .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
        .collect(),
      confirmation: await ctx.db.get(confirmation._id),
    }));
    expect(finalState.challenge).toMatchObject({
      status: "consumed",
      attempts: 1,
    });
    expect(finalState.bookings).toHaveLength(1);
    expect(finalState.confirmation).toMatchObject({
      status: "sent",
      externalMessageId: "resend-message-id",
    });
  });

  test("lets owners choose exact team recipients and independent reminder schedules", async () => {
    const fixture = await setupPublishedStudio(t);
    const manager = t.withIdentity({
      subject: "email-manager",
      email: "manager@atelier.example",
      name: "Mira Manager",
    });
    const managerUserId = await manager.mutation(api.users.ensureUser);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.patch(managerUserId, {
        activeOrgId: fixture.orgId,
        updatedAt: now,
      });
      await ctx.db.insert("staff_members", {
        orgId: fixture.orgId,
        userId: managerUserId,
        displayName: "Mira Manager",
        specialties: [],
        role: "manager",
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    const settingsPage = await fixture.owner.query(
      api.orgSettings.getOrgSettings,
      { orgId: fixture.orgId },
    );
    expect(
      settingsPage?.emailRecipients.map((recipient) => recipient.email).sort(),
    ).toEqual(["manager@atelier.example", "owner@atelier.example"]);

    await fixture.owner.mutation(
      api.orgSettings.updateEmailNotificationSettings,
      {
        orgId: fixture.orgId,
        customerReminderEmailEnabled: true,
        customerReminderHoursBefore: [24, 24],
        staffNewBookingEmailEnabled: true,
        staffReminderEmailEnabled: true,
        staffReminderHoursBefore: [2, 2],
        staffEmailRecipientUserIds: [managerUserId, managerUserId],
      },
    );

    const persistedSettings = await t.run(async (ctx) =>
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
        .first(),
    );
    expect(persistedSettings).toMatchObject({
      reminderHoursBefore: [24],
      staffReminderHoursBefore: [2],
      staffEmailRecipientUserIds: [managerUserId],
    });

    const args = {
      ...bookingArgs(fixture),
      customerEmail: "settings-client@example.com",
      customerPhone: "+389 70 444 555",
    };
    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: fixture.orgId,
      email: args.customerEmail,
    });
    const booking = await t.action(api.publicBooking.confirmPublicBooking, {
      ...args,
      challengeId: challenge.challengeId,
      otp: TEST_OTP,
    });

    const queued = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_booking", (query) =>
          query.eq("bookingId", booking.bookingId),
        )
        .collect(),
    );
    const staffNewBooking = queued.filter(
      (notification) => notification.type === "staff_new_booking",
    );
    const staffReminders = queued.filter(
      (notification) => notification.type === "staff_booking_reminder",
    );
    const clientReminders = queued.filter(
      (notification) => notification.type === "booking_reminder",
    );
    expect(staffNewBooking).toHaveLength(1);
    expect(staffNewBooking[0].recipientAddress).toBe("manager@atelier.example");
    expect(staffReminders).toHaveLength(1);
    expect(staffReminders[0]).toMatchObject({
      recipientAddress: "manager@atelier.example",
      templateData: expect.objectContaining({ hoursBefore: 2 }),
    });
    expect(clientReminders).toHaveLength(1);
    expect(clientReminders[0]).toMatchObject({
      recipientAddress: "settings-client@example.com",
      templateData: expect.objectContaining({ hoursBefore: 24 }),
    });
    expect(staffReminders[0].scheduledFor).toBe(
      wallClockTimestampToInstant(
        fixture.slot.startAt,
        persistedSettings?.timezone ?? "Europe/Skopje",
      ) -
        2 * 60 * 60 * 1_000,
    );

    await fixture.owner.mutation(
      api.orgSettings.updateEmailNotificationSettings,
      {
        orgId: fixture.orgId,
        customerReminderEmailEnabled: false,
        customerReminderHoursBefore: [24],
        staffNewBookingEmailEnabled: false,
        staffReminderEmailEnabled: false,
        staffReminderHoursBefore: [2],
        staffEmailRecipientUserIds: [],
      },
    );
    await expect(
      t.action(internal.notifications.processIndividualNotification, {
        notificationId: staffReminders[0]._id,
      }),
    ).resolves.toBe("cancelled");
    await expect(
      t.action(internal.notifications.processIndividualNotification, {
        notificationId: clientReminders[0]._id,
      }),
    ).resolves.toBe("cancelled");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("emails a linked staff address only for that person's appointments", async () => {
    const fixture = await setupPublishedStudio(t);
    const appointmentEmail = "ana.artist@example.com";
    const assignedStaffId = await fixture.owner.mutation(
      api.staff.createStaffMember,
      {
        orgId: fixture.orgId,
        displayName: "Ana Artist",
        role: "staff",
        specialties: ["Treatments"],
        appointmentEmail: ` ${appointmentEmail.toUpperCase()} `,
      },
    );
    await fixture.owner.mutation(api.services.updateService, {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffIds: [fixture.staffId, assignedStaffId],
    });
    await fixture.owner.mutation(api.availability.setAvailabilityRule, {
      orgId: fixture.orgId,
      staffId: assignedStaffId,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    });
    await fixture.owner.mutation(
      api.orgSettings.updateEmailNotificationSettings,
      {
        orgId: fixture.orgId,
        customerReminderEmailEnabled: false,
        customerReminderHoursBefore: [24],
        staffNewBookingEmailEnabled: true,
        staffReminderEmailEnabled: true,
        staffReminderHoursBefore: [2],
        staffEmailRecipientUserIds: [],
      },
    );

    const slots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: assignedStaffId,
      date: nextMondayDate(),
    });
    const slot = slots[0];
    if (!slot) throw new Error("Linked staff fixture has no public slot");
    const args = {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: assignedStaffId,
      startAt: slot.startAt,
      customerName: "Staff Email Client",
      customerPhone: "+389 70 555 666",
      customerEmail: "staff-email-client@example.com",
    };
    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: fixture.orgId,
      email: args.customerEmail,
    });
    const booking = await t.action(api.publicBooking.confirmPublicBooking, {
      ...args,
      challengeId: challenge.challengeId,
      otp: TEST_OTP,
    });

    const state = await t.run(async (ctx) => ({
      staff: await ctx.db.get(assignedStaffId),
      notifications: await ctx.db
        .query("notifications")
        .withIndex("by_booking", (query) =>
          query.eq("bookingId", booking.bookingId),
        )
        .collect(),
    }));
    expect(state.staff?.userId).toBeUndefined();
    expect(state.staff?.appointmentEmail).toBe(appointmentEmail);
    const staffEmails = state.notifications.filter((notification) =>
      ["staff_new_booking", "staff_booking_reminder"].includes(
        notification.type,
      ),
    );
    expect(staffEmails).toHaveLength(2);
    expect(
      staffEmails.map((notification) => notification.recipientAddress),
    ).toEqual([appointmentEmail, appointmentEmail]);
    expect(
      staffEmails.find(
        (notification) => notification.type === "staff_booking_reminder",
      ),
    ).toMatchObject({
      templateData: expect.objectContaining({
        recipientName: "Ana Artist",
        hoursBefore: 2,
      }),
    });

    const immediate = staffEmails.find(
      (notification) => notification.type === "staff_new_booking",
    );
    if (!immediate) throw new Error("Assigned staff email was not queued");
    if (immediate.status === "pending") {
      await expect(
        t.action(internal.notifications.processIndividualNotification, {
          notificationId: immediate._id,
        }),
      ).resolves.toBe("sent");
    } else {
      expect(immediate.status).toBe("sent");
    }

    const manualSlot = slots.find(
      (candidate) => candidate.startAt >= slot.endAt,
    );
    if (!manualSlot) throw new Error("Linked staff has no second test slot");
    const manualBookingId = await fixture.owner.mutation(
      api.bookings.createManualBooking,
      {
        orgId: fixture.orgId,
        staffId: assignedStaffId,
        serviceIds: [fixture.serviceId],
        customerName: "Manual Staff Email Client",
        startAt: manualSlot.startAt,
      },
    );
    const manualNotifications = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_booking", (query) =>
          query.eq("bookingId", manualBookingId),
        )
        .collect(),
    );
    expect(
      manualNotifications.filter(
        (notification) => notification.type === "staff_new_booking",
      ),
    ).toEqual([
      expect.objectContaining({ recipientAddress: appointmentEmail }),
    ]);

    await fixture.owner.mutation(api.staff.updateStaffMember, {
      orgId: fixture.orgId,
      staffId: assignedStaffId,
      appointmentEmail: null,
    });
    const reminder = staffEmails.find(
      (notification) => notification.type === "staff_booking_reminder",
    );
    if (!reminder) throw new Error("Assigned staff reminder was not queued");
    await expect(
      t.action(internal.notifications.processIndividualNotification, {
        notificationId: reminder._id,
      }),
    ).resolves.toBe("cancelled");
  });

  test("emails the client when the studio reschedules even with client reminders disabled", async () => {
    const fixture = await setupPublishedStudio(t);
    await fixture.owner.mutation(
      api.orgSettings.updateEmailNotificationSettings,
      {
        orgId: fixture.orgId,
        customerReminderEmailEnabled: false,
        customerReminderHoursBefore: [24],
        staffNewBookingEmailEnabled: false,
        staffReminderEmailEnabled: false,
        staffReminderHoursBefore: [2],
        staffEmailRecipientUserIds: [],
      },
    );
    const args = {
      ...bookingArgs(fixture),
      customerEmail: "rescheduled@example.com",
    };
    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: fixture.orgId,
      email: args.customerEmail,
    });
    const original = await t.action(api.publicBooking.confirmPublicBooking, {
      ...args,
      challengeId: challenge.challengeId,
      otp: TEST_OTP,
    });
    const availableSlots = await t.query(api.publicBooking.getPublicSlots, {
      orgId: fixture.orgId,
      serviceId: fixture.serviceId,
      staffId: fixture.staffId,
      date: nextMondayDate(),
    });
    const newSlot = availableSlots.find(
      (slot) => slot.startAt !== original.startAt,
    );
    if (!newSlot) throw new Error("No second slot available for rescheduling");

    const newBookingId = await fixture.owner.mutation(
      api.bookings.rescheduleBooking,
      {
        orgId: fixture.orgId,
        bookingId: original.bookingId,
        newStartAt: newSlot.startAt,
      },
    );

    const notifications = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_booking", (query) => query.eq("bookingId", newBookingId))
        .collect(),
    );
    const rescheduled = notifications.find(
      (notification) => notification.type === "booking_rescheduled",
    );
    expect(rescheduled).toMatchObject({
      recipientAddress: "rescheduled@example.com",
      templateData: expect.objectContaining({
        previousStartAt: original.startAt,
        startAt: newSlot.startAt,
      }),
    });
    expect(
      notifications.some(
        (notification) => notification.type === "booking_confirmation",
      ),
    ).toBe(false);
    expect(
      notifications.some(
        (notification) => notification.type === "booking_reminder",
      ),
    ).toBe(false);
    if (!rescheduled) throw new Error("Reschedule email was not queued");

    if (rescheduled.status === "pending") {
      await expect(
        t.action(internal.notifications.processIndividualNotification, {
          notificationId: rescheduled._id,
        }),
      ).resolves.toBe("sent");
    }
    const delivered = await t.run(async (ctx) => ctx.db.get(rescheduled._id));
    expect(delivered).toMatchObject({
      status: "sent",
      externalMessageId: "resend-message-id",
    });

    const sentBodies = fetchMock.mock.calls.map(
      (call) =>
        JSON.parse(String((call[1] as RequestInit).body)) as {
          subject: string;
          html: string;
          to: string[];
        },
    );
    const rescheduleBody = sentBodies.find((body) =>
      body.html.includes("Терминот е презакажан"),
    );
    expect(rescheduleBody).toMatchObject({
      subject: "Презакажан термин · Atelier Email",
      to: ["rescheduled@example.com"],
    });
    expect(rescheduleBody?.html).toContain("#ff814a");
  });

  test("locks a verification challenge after five incorrect codes", async () => {
    const fixture = await setupPublishedStudio(t);
    const args = {
      ...bookingArgs(fixture),
      customerEmail: "locked@example.com",
      customerPhone: "+389 70 777 888",
    };
    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: fixture.orgId,
      email: args.customerEmail,
    });
    const submitWrongCode = () =>
      t.action(api.publicBooking.confirmPublicBooking, {
        ...args,
        challengeId: challenge.challengeId,
        otp: "000000",
      });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(submitWrongCode()).rejects.toThrow(
        "verification code is incorrect",
      );
    }
    await expect(submitWrongCode()).rejects.toThrow("Too many incorrect codes");
    await expect(
      t.action(api.publicBooking.confirmPublicBooking, {
        ...args,
        challengeId: challenge.challengeId,
        otp: TEST_OTP,
      }),
    ).rejects.toThrow("Too many incorrect codes");

    const state = await t.run(async (ctx) => ({
      challenge: await ctx.db.get(challenge.challengeId),
      bookings: await ctx.db
        .query("bookings")
        .withIndex("by_org", (query) => query.eq("orgId", fixture.orgId))
        .collect(),
    }));
    expect(state.challenge).toMatchObject({ status: "locked", attempts: 5 });
    expect(state.bookings).toHaveLength(0);
  });

  test("allows public booking when phone number is omitted", async () => {
    const fixture = await setupPublishedStudio(t);
    const args = {
      ...bookingArgs(fixture),
      customerEmail: "no-phone@example.com",
      customerPhone: undefined,
    };
    const challenge = await t.action(api.publicBooking.requestBookingEmailOtp, {
      orgId: fixture.orgId,
      email: args.customerEmail,
    });
    const booking = await t.action(api.publicBooking.confirmPublicBooking, {
      ...args,
      challengeId: challenge.challengeId,
      otp: TEST_OTP,
    });
    expect(booking).toMatchObject({
      serviceName: "Signature Treatment",
      staffName: "Ada Owner",
      startAt: fixture.slot.startAt,
    });

    const savedCustomer = await t.run(async (ctx) => {
      const b = await ctx.db.get(booking.bookingId);
      return b ? await ctx.db.get(b.customerId) : null;
    });
    expect(savedCustomer).toMatchObject({
      name: "Elena Client",
      email: "no-phone@example.com",
    });
  });
});
