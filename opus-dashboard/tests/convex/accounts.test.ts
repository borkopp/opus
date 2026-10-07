import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";
import { wallClockNow } from "../../convex/lib/bookingTime";

const createBackend = () => convexTest(schema, convexModules);
type Backend = ReturnType<typeof createBackend>;

async function studio(backend: Backend, key = "first") {
  const owner = backend.withIdentity({
    subject: `${key}-owner`,
    email: `${key}-owner@example.com`,
    name: "Studio Owner",
  });
  const ownerUserId = await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: `${key} beauty studio`,
    category: "beauty_salon",
  });
  await owner.mutation(api.activation.saveOwnerName, { name: "Studio Owner" });
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    country: "MK",
    coordinates: { lat: 41.99, lng: 21.43 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Treatment",
    durationMins: 30,
    priceMinorUnits: 1800,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: false,
    })),
  });
  await owner.mutation(api.website.publish, { orgId });
  const profile = await owner.query(api.users.getMyProfile);
  const staffId = profile!.staffId!;
  const date = new Date(wallClockNow("Europe/Skopje") + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const slots = await backend.query(api.publicBooking.getPublicSlots, {
    orgId,
    serviceId,
    staffId,
    date,
  });
  expect(slots.length).toBeGreaterThan(4);
  return {
    backend,
    owner,
    orgId,
    ownerUserId,
    serviceId,
    staffId,
    date,
    slots,
  };
}
type Studio = Awaited<ReturnType<typeof studio>>;

function draft(s: Studio, slot = 0, email = "client@example.com") {
  return {
    orgId: s.orgId,
    serviceId: s.serviceId,
    staffId: s.staffId,
    startAt: s.slots[slot].startAt,
    customerName: "Elena Client",
    customerPhone: "+389 70 222 333",
    customerEmail: email,
  };
}
async function guest(s: Studio, slot = 0, email = "client@example.com") {
  const challenge = await s.backend.mutation(
    internal.publicBooking.createBookingEmailChallenge,
    {
      orgId: s.orgId,
      email,
      codeHash: "verified-test-otp",
      encryptedCode: "test-encrypted-code",
    },
  );
  const result = await s.backend.mutation(
    internal.publicBooking.createVerifiedPublicBooking,
    {
      ...draft(s, slot, email),
      challengeId: challenge.challengeId,
      otpHash: "verified-test-otp",
    },
  );
  if (!result.ok) throw new Error("Guest fixture verification failed.");
  return result.booking;
}
async function enable(s: Studio) {
  await s.owner.mutation(api.orgSettings.updateClientAccounts, {
    orgId: s.orgId,
    enabled: true,
  });
}
async function paid(s: Studio) {
  await s.backend.run((ctx) => ctx.db.patch(s.orgId, { plan: "paid" }));
}
async function invitation(s: Studio, email = "specialist@example.com") {
  const staffId = await s.owner.mutation(api.staff.createStaffMember, {
    orgId: s.orgId,
    displayName: "Specialist",
    role: "staff",
    specialties: [],
  });
  await s.backend.run(async (ctx) => {
    const rules = await ctx.db
      .query("availability_rules")
      .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
      .collect();
    for (const rule of rules.filter((r) => r.staffId === s.staffId)) {
      const { _id, _creationTime, ...fields } = rule;
      void _id;
      void _creationTime;
      await ctx.db.insert("availability_rules", { ...fields, staffId });
    }
    const service = await ctx.db.get(s.serviceId);
    await ctx.db.patch(s.serviceId, {
      staffIds: [...service!.staffIds, staffId],
    });
  });
  const inviteId = await s.owner.mutation(api.staff.inviteStaffMember, {
    orgId: s.orgId,
    staffId,
    email,
  });
  const invite = await s.backend.run((ctx) => ctx.db.get(inviteId));
  return { staffId, inviteId, token: invite!.token, email };
}
async function personal(s: Studio) {
  await paid(s);
  const invite = await invitation(s);
  const account = s.backend.withIdentity({
    subject: "specialist",
    email: invite.email,
  });
  const userId = await account.mutation(api.users.ensureUser);
  await account.mutation(api.staff.acceptStaffInvite, { token: invite.token });
  const bookingId = await s.owner.mutation(api.mobile.createAppointment, {
    serviceId: s.serviceId,
    staffId: invite.staffId,
    startAt: s.slots[0].startAt,
    customerName: "Assigned client",
    customerEmail: "assigned@example.com",
  });
  const otherBookingId = await s.owner.mutation(api.mobile.createAppointment, {
    serviceId: s.serviceId,
    staffId: s.staffId,
    startAt: s.slots[0].startAt,
    customerName: "Owner client",
    customerEmail: "owner-client@example.com",
  });
  return {
    ...invite,
    account,
    userId,
    bookingId: bookingId as Id<"bookings">,
    otherBookingId: otherBookingId as Id<"bookings">,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("additive staff and client accounts", () => {
  it("rejects an explicitly unverified account email for booking, claiming, and invitation acceptance", async () => {
    const s = await studio(createBackend());
    await enable(s);
    await paid(s);
    const client = s.backend.withIdentity({
      subject: "unverified",
      email: "client@example.com",
      emailVerified: false,
    });
    await expect(
      client.mutation(api.publicBooking.createAccountBooking, draft(s)),
    ).rejects.toThrow("Verify your account email");
    const booking = await guest(s);
    await expect(
      client.mutation(api.opusUsers.claimBooking, {
        bookingId: booking.bookingId,
        token: booking.claimToken!,
      }),
    ).rejects.toThrow("Verify your account email");
    const invite = await invitation(s, "client@example.com");
    await client.mutation(api.users.ensureUser);
    await expect(
      client.mutation(api.staff.acceptStaffInvite, { token: invite.token }),
    ).rejects.toThrow("Verify your account email");
  });
  it("offers accounts without studio settings and preserves owner and guest access", async () => {
    const s = await studio(createBackend());
    const before = await s.owner.query(api.users.getMyProfile);
    const client = s.backend.withIdentity({
      subject: "client",
      email: "client@example.com",
      emailVerified: true,
    });
    await expect(
      s.backend.mutation(api.publicBooking.createPublicBooking, draft(s)),
    ).rejects.toThrow("Verify your email");
    const booking = await guest(s);
    expect(booking.claimToken).toBeDefined();
    await client.mutation(api.publicBooking.createAccountBooking, draft(s, 2));
    const current = await client.query(api.opusUsers.getCurrent);
    expect(current?.name).toBe(draft(s).customerName);
    expect(await client.query(api.users.getMyProfile)).toBeNull();
    expect((await s.owner.query(api.users.getMyProfile))?.user._id).toBe(
      before?.user._id,
    );
    const guestBooking = await s.owner.query(api.bookings.getBooking, {
      orgId: s.orgId,
      bookingId: booking.bookingId,
    });
    expect(guestBooking?.status).toBe("confirmed");
    expect(guestBooking?.opusUserId).toBeUndefined();
    expect(
      await s.owner.query(api.bookings.listBookingsByOrg, { orgId: s.orgId }),
    ).toHaveLength(2);
  });

  it("creates staff and an email-bound invitation atomically from the add form", async () => {
    const s = await studio(createBackend());
    const args = {
      orgId: s.orgId,
      displayName: "Ana",
      role: "staff" as const,
      specialties: [],
      signInEmail: " ANA@EXAMPLE.COM ",
    };
    await expect(
      s.owner.mutation(api.staff.createStaffMember, args),
    ).rejects.toThrow("paid plan");
    expect(
      await s.owner.query(api.staff.listStaffMembers, { orgId: s.orgId }),
    ).toHaveLength(1);
    await paid(s);
    await expect(
      s.owner.mutation(api.staff.createStaffMember, {
        ...args,
        signInEmail: "invalid",
      }),
    ).rejects.toThrow("valid sign-in email");
    const staffId = await s.owner.mutation(api.staff.createStaffMember, args);
    const access = await s.owner.query(api.staff.getAccountAccess, {
      orgId: s.orgId,
      staffId,
    });
    expect(access).toMatchObject({
      linked: false,
      bookingAccess: "own",
      invite: { email: "ana@example.com" },
    });
    const queued = await s.backend.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(queued.filter((n) => n.type === "staff_invite")).toEqual([
      expect.objectContaining({ recipientAddress: "ana@example.com" }),
    ]);
  });

  it("requires Pro for new invitations and binds single-use invitations to the verified recipient", async () => {
    const s = await studio(createBackend());
    const staffId = await s.owner.mutation(api.staff.createStaffMember, {
      orgId: s.orgId,
      displayName: "Staff",
      role: "staff",
      specialties: [],
    });
    await expect(
      s.owner.mutation(api.staff.inviteStaffMember, {
        orgId: s.orgId,
        staffId,
        email: "invited@example.com",
      }),
    ).rejects.toThrow("paid plan");
    await paid(s);
    const invite = await invitation(s, "invited@example.com");
    const wrong = s.backend.withIdentity({
      subject: "wrong",
      email: "wrong@example.com",
    });
    await wrong.mutation(api.users.ensureUser);
    await expect(
      wrong.mutation(api.staff.acceptStaffInvite, { token: invite.token }),
    ).rejects.toThrow("email address");
    const invited = s.backend.withIdentity({
      subject: "invited",
      email: "INVITED@example.com",
    });
    await invited.mutation(api.users.ensureUser);
    await invited.mutation(api.staff.acceptStaffInvite, {
      token: invite.token,
    });
    expect(await invited.query(api.users.getMyProfile)).toMatchObject({
      role: "staff",
      staffId: invite.staffId,
      bookingAccess: "own",
    });
    await expect(
      invited.mutation(api.staff.acceptStaffInvite, { token: invite.token }),
    ).rejects.toThrow("Invalid or expired");
  });

  it("filters personal web and mobile reads and rejects writes against another staff member", async () => {
    const s = await studio(createBackend());
    const p = await personal(s);
    const personalBookings = await p.account.query(
      api.bookings.listBookingsByOrg,
      { orgId: s.orgId },
    );
    expect(personalBookings.map((b) => b._id)).toEqual([p.bookingId]);
    expect(personalBookings[0].customer).toMatchObject({
      name: "Assigned client",
      email: "assigned@example.com",
    });
    expect(personalBookings[0].customer).not.toHaveProperty(
      "totalSpendMinorUnits",
    );
    expect(personalBookings[0].customer).not.toHaveProperty("opusUserId");
    expect(
      await p.account.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId: p.otherBookingId,
      }),
    ).toBeNull();
    await expect(
      p.account.query(api.bookings.listBookingsByStaff, {
        orgId: s.orgId,
        staffId: s.staffId,
      }),
    ).rejects.toThrow("own appointments");
    for (const mutation of [
      api.bookings.completeBooking,
      api.bookings.markNoShow,
      api.bookings.cancelBooking,
    ]) {
      await expect(
        p.account.mutation(mutation, {
          orgId: s.orgId,
          bookingId: p.otherBookingId,
        }),
      ).rejects.toThrow("own appointments");
    }
    await expect(
      p.account.mutation(api.bookings.rescheduleBooking, {
        orgId: s.orgId,
        bookingId: p.otherBookingId,
        newStartAt: s.slots[2].startAt,
      }),
    ).rejects.toThrow("own appointments");
    await expect(
      p.account.query(api.orgSettings.getOrgSettings, { orgId: s.orgId }),
    ).rejects.toThrow("own appointments");
    await expect(
      p.account.query(api.clients.getDirectory, {
        search: "",
        segment: "all",
        sort: "recent",
        page: 0,
      }),
    ).rejects.toThrow("own appointments");
    await expect(
      p.account.query(api.promotions.getWorkspace, { language: "en" }),
    ).rejects.toThrow("own appointments");
    await expect(
      p.account.query(api.services.getOrgSettings, { orgId: s.orgId }),
    ).rejects.toThrow("own appointments");
    const bootstrap = await p.account.query(api.mobile.bootstrap);
    expect(bootstrap.available && bootstrap.team.map((m) => m.id)).toEqual([
      p.staffId,
    ]);
    expect(
      (
        await p.account.query(api.mobile.calendar, {
          day: Date.parse(`${s.date}T00:00:00Z`),
        })
      ).map((b) => b.id),
    ).toEqual([p.bookingId]);
    await expect(
      p.account.mutation(api.mobile.changeAppointmentStatus, {
        bookingId: p.otherBookingId,
        status: "completed",
      }),
    ).rejects.toThrow("own appointments");
    await p.account.mutation(api.mobile.changeAppointmentStatus, {
      bookingId: p.bookingId,
      status: "completed",
    });
    expect(
      await p.account.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId: p.bookingId,
      }),
    ).toMatchObject({ status: "completed" });
  });

  it("retains legacy team permissions and linked accounts after a downgrade", async () => {
    const s = await studio(createBackend());
    const p = await personal(s);
    await s.backend.run((ctx) =>
      ctx.db.patch(p.staffId, { bookingAccess: undefined }),
    );
    expect(
      await p.account.query(api.bookings.listBookingsByOrg, { orgId: s.orgId }),
    ).toHaveLength(2);
    expect(
      await p.account.query(api.orgSettings.getOrgSettings, { orgId: s.orgId }),
    ).not.toBeNull();
    await s.owner.mutation(api.staff.updateAccountAccess, {
      orgId: s.orgId,
      staffId: p.staffId,
      bookingAccess: "own",
    });
    await s.backend.run((ctx) => ctx.db.patch(s.orgId, { plan: "free" }));
    expect(
      await p.account.query(api.bookings.listBookingsByOrg, { orgId: s.orgId }),
    ).toHaveLength(1);
    const newStaffId = await s.owner.mutation(api.staff.createStaffMember, {
      orgId: s.orgId,
      displayName: "New Staff",
      role: "staff",
      specialties: [],
    });
    await expect(
      s.owner.mutation(api.staff.inviteStaffMember, {
        orgId: s.orgId,
        staffId: newStaffId,
        email: "new@example.com",
      }),
    ).rejects.toThrow("paid plan");
  });

  it("accepts existing Free pending invitations without narrowing their legacy access", async () => {
    const s = await studio(createBackend());
    const staffId = await s.owner.mutation(api.staff.createStaffMember, {
      orgId: s.orgId,
      displayName: "Legacy Staff",
      role: "staff",
      specialties: [],
    });
    await s.backend.run(async (ctx) => {
      await ctx.db.patch(staffId, { bookingAccess: undefined });
      await ctx.db.insert("staff_invites", {
        orgId: s.orgId,
        staffId,
        email: "legacy@example.com",
        token: "legacy-invite",
        status: "pending",
        expiresAt: Date.now() + 86_400_000,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const legacy = s.backend.withIdentity({
      subject: "legacy",
      email: "legacy@example.com",
    });
    await legacy.mutation(api.users.ensureUser);
    await legacy.mutation(api.staff.acceptStaffInvite, {
      token: "legacy-invite",
    });
    expect(await legacy.query(api.users.getMyProfile)).toMatchObject({
      bookingAccess: "team",
    });
    expect(
      await legacy.query(api.orgSettings.getOrgSettings, { orgId: s.orgId }),
    ).not.toBeNull();
  });

  it("revokes account access without deleting the bookable staff seat or appointments", async () => {
    const s = await studio(createBackend());
    const p = await personal(s);
    await s.owner.mutation(api.staff.revokeAccountAccess, {
      orgId: s.orgId,
      staffId: p.staffId,
    });
    await expect(
      p.account.query(api.bookings.listBookingsByOrg, { orgId: s.orgId }),
    ).rejects.toThrow("Unauthorised");
    expect(
      await s.owner.query(api.bookings.getBooking, {
        orgId: s.orgId,
        bookingId: p.bookingId,
      }),
    ).toMatchObject({ staffId: p.staffId, status: "confirmed" });
    const seat = await s.owner.query(api.staff.getStaffMember, {
      orgId: s.orgId,
      staffId: p.staffId,
    });
    expect(seat?.isActive).toBe(true);
    expect(seat?.userId).toBeUndefined();
    expect(
      await s.backend.query(api.publicBooking.getPublicSlots, {
        orgId: s.orgId,
        staffId: p.staffId,
        serviceId: s.serviceId,
        date: s.date,
      }),
    ).not.toHaveLength(0);
  });

  it("reuses one consumer identity across studios without granting business access or exposing other consumers", async () => {
    const backend = createBackend();
    const first = await studio(backend, "first"),
      second = await studio(backend, "second");
    await enable(first);
    await enable(second);
    const client = backend.withIdentity({
      subject: "client",
      email: "client@example.com",
    });
    const userId = await client.mutation(api.opusUsers.getOrCreate);
    const booking = await client.mutation(
      api.publicBooking.createAccountBooking,
      { ...draft(first), customerEmail: "forged@example.com" },
    );
    await client.mutation(
      api.publicBooking.createAccountBooking,
      draft(second),
    );
    expect(await client.mutation(api.opusUsers.getOrCreate)).toBe(userId);
    expect(await client.query(api.users.getMyProfile)).toBeNull();
    await expect(
      client.query(api.bookings.listBookingsByOrg, { orgId: first.orgId }),
    ).rejects.toThrow("Unauthorised");
    expect(
      (await client.query(api.opusUsers.getMyBookings))
        .map((b) => b.orgId)
        .sort(),
    ).toEqual([first.orgId, second.orgId].sort());
    expect(await client.query(api.opusUsers.getCurrent)).toMatchObject({
      email: "client@example.com",
      name: "Elena Client",
      phone: "+38970222333",
    });
    const other = backend.withIdentity({
      subject: "other",
      email: "other@example.com",
    });
    await other.mutation(api.opusUsers.getOrCreate);
    expect(await other.query(api.opusUsers.getMyBookings)).toEqual([]);
    await expect(
      other.mutation(api.opusUsers.cancelMyBooking, {
        bookingId: booking.bookingId,
      }),
    ).rejects.toThrow("not found");
    expect(
      await first.owner.query(api.bookings.listBookingsByOrg, {
        orgId: first.orgId,
      }),
    ).toHaveLength(1);
    await expect(
      first.owner.query(api.bookings.listBookingsByOrg, {
        orgId: second.orgId,
      }),
    ).rejects.toThrow("Unauthorised");
  });

  it("requires both a booking proof and its verified email, and never links old history by email", async () => {
    const s = await studio(createBackend());
    const old = await guest(s, 0);
    await enable(s);
    const current = await guest(s, 2);
    expect(current.claimToken).toHaveLength(73);
    const sameEmail = s.backend.withIdentity({
      subject: "client",
      email: "client@example.com",
    });
    const wrongEmail = s.backend.withIdentity({
      subject: "wrong",
      email: "wrong@example.com",
    });
    await sameEmail.mutation(api.opusUsers.getOrCreate);
    await wrongEmail.mutation(api.opusUsers.getOrCreate);
    await expect(
      wrongEmail.mutation(api.opusUsers.claimBooking, {
        bookingId: current.bookingId,
        token: current.claimToken!,
      }),
    ).rejects.toThrow("invalid or expired");
    await expect(
      sameEmail.mutation(api.opusUsers.claimBooking, {
        bookingId: current.bookingId,
        token: "wrong-proof",
      }),
    ).rejects.toThrow("invalid or expired");
    await expect(
      sameEmail.mutation(api.opusUsers.claimBooking, {
        bookingId: old.bookingId,
        token: current.claimToken!,
      }),
    ).rejects.toThrow("invalid or expired");
    await sameEmail.mutation(api.opusUsers.claimBooking, {
      bookingId: current.bookingId,
      token: current.claimToken!,
    });
    expect(
      (await sameEmail.query(api.opusUsers.getMyBookings)).map((b) => b._id),
    ).toEqual([current.bookingId]);
    const claimed = await s.backend.run((ctx) => ctx.db.get(current.bookingId));
    expect(claimed?.clientClaimTokenHash).toBeUndefined();
    expect(claimed?.clientClaimTokenExpiresAt).toBeUndefined();
    await expect(
      wrongEmail.mutation(api.opusUsers.claimBooking, {
        bookingId: current.bookingId,
        token: current.claimToken!,
      }),
    ).rejects.toThrow("invalid or expired");
    const emails = await s.backend.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    const confirmation = emails.find(
      (n) =>
        n.bookingId === current.bookingId && n.type === "booking_confirmation",
    );
    expect(confirmation?.templateData?.clientAccountUrl).toContain(
      `#proof=${current.claimToken}`,
    );
    expect(
      emails
        .filter((n) => n.recipientAddress !== "client@example.com")
        .every((n) => !n.templateData?.clientAccountUrl),
    ).toBe(true);
  });

  it("rejects expired claims and ignores the retired studio account toggle", async () => {
    const s = await studio(createBackend());
    await enable(s);
    const booking = await guest(s);
    const client = s.backend.withIdentity({
      subject: "client",
      email: "client@example.com",
    });
    await client.mutation(api.opusUsers.getOrCreate);
    await s.backend.run((ctx) =>
      ctx.db.patch(booking.bookingId, {
        clientClaimTokenExpiresAt: Date.now() - 1,
      }),
    );
    await expect(
      client.mutation(api.opusUsers.claimBooking, {
        bookingId: booking.bookingId,
        token: booking.claimToken!,
      }),
    ).rejects.toThrow("invalid or expired");
    await client.mutation(api.publicBooking.createAccountBooking, draft(s, 2));
    await s.owner.mutation(api.orgSettings.updateClientAccounts, {
      orgId: s.orgId,
      enabled: false,
    });
    const owned = await client.query(api.opusUsers.getMyBookings);
    expect(owned).toHaveLength(1);
    expect(owned[0].canCancel).toBe(true);
    await client.mutation(api.publicBooking.createAccountBooking, draft(s, 4));
    await client.mutation(api.opusUsers.cancelMyBooking, {
      bookingId: owned[0]._id,
    });
    expect(
      (await client.query(api.opusUsers.getMyBookings)).find(
        (b) => b._id === owned[0]._id,
      )?.status,
    ).toBe("cancelled");
  });

  it("cancels only a client's confirmed appointment before the studio deadline, with notifications and audit", async () => {
    const s = await studio(createBackend());
    await enable(s);
    const client = s.backend.withIdentity({
      subject: "client",
      email: "client@example.com",
    });
    const booking = await client.mutation(
      api.publicBooking.createAccountBooking,
      draft(s),
    );
    expect((await client.query(api.opusUsers.getMyBookings))[0].canCancel).toBe(
      true,
    );
    await client.mutation(api.opusUsers.cancelMyBooking, {
      bookingId: booking.bookingId,
    });
    const record = await s.owner.query(api.bookings.getBooking, {
      orgId: s.orgId,
      bookingId: booking.bookingId,
    });
    expect(record?.status).toBe("cancelled");
    const audits = await s.backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(
      audits.some(
        (a) =>
          a.resourceId === booking.bookingId &&
          a.action === "booking.cancelled" &&
          a.actorType === "opus_user",
      ),
    ).toBe(true);
    const emails = await s.backend.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    expect(
      emails.some(
        (n) =>
          n.bookingId === booking.bookingId && n.type === "booking_cancelled",
      ),
    ).toBe(true);
    const late = await client.mutation(
      api.publicBooking.createAccountBooking,
      draft(s, 2),
    );
    await s.backend.run((ctx) =>
      ctx.db.patch(late.bookingId, {
        startAt: wallClockNow("Europe/Skopje") + 60 * 60 * 1000,
      }),
    );
    await expect(
      client.mutation(api.opusUsers.cancelMyBooking, {
        bookingId: late.bookingId,
      }),
    ).rejects.toThrow("cancellation is closed");
  });

  it("preserves consumer ownership after staff rescheduling and rejects duplicate slot booking", async () => {
    const s = await studio(createBackend());
    await enable(s);
    const client = s.backend.withIdentity({
      subject: "client",
      email: "client@example.com",
    });
    const booking = await client.mutation(
      api.publicBooking.createAccountBooking,
      draft(s),
    );
    await expect(
      client.mutation(api.publicBooking.createAccountBooking, draft(s)),
    ).rejects.toThrow("available");
    const newId = await s.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: s.orgId,
      bookingId: booking.bookingId,
      newStartAt: s.slots[2].startAt,
    });
    expect(
      (await client.query(api.opusUsers.getMyBookings)).find(
        (b) => b._id === newId,
      ),
    ).toMatchObject({ status: "confirmed", startAt: s.slots[2].startAt });
  });

  it("verifies every studio switch against current membership", async () => {
    const backend = createBackend();
    const first = await studio(backend, "first"),
      second = await studio(backend, "second");
    await paid(second);
    const invite = await invitation(second, "first-owner@example.com");
    await first.owner.mutation(api.staff.acceptStaffInvite, {
      token: invite.token,
    });
    expect(await first.owner.query(api.users.listMemberships)).toHaveLength(2);
    await first.owner.mutation(api.users.switchOrg, { orgId: first.orgId });
    expect(await first.owner.query(api.users.getMyProfile)).toMatchObject({
      orgId: first.orgId,
      role: "owner",
      bookingAccess: "team",
    });
    await first.owner.mutation(api.users.switchOrg, { orgId: second.orgId });
    expect(await first.owner.query(api.users.getMyProfile)).toMatchObject({
      orgId: second.orgId,
      bookingAccess: "own",
    });
    await expect(
      first.owner.query(api.bookings.listBookingsByOrg, { orgId: first.orgId }),
    ).rejects.toThrow("Unauthorised");
    await backend.run((ctx) =>
      ctx.db.patch(invite.staffId, { isActive: false }),
    );
    await expect(
      first.owner.mutation(api.users.switchOrg, { orgId: second.orgId }),
    ).rejects.toThrow("No active access");
    expect(await first.owner.query(api.users.getMyProfile)).toMatchObject({
      orgId: first.orgId,
      role: "owner",
    });
    expect(
      await first.owner.query(api.orgSettings.getOrgSettings, {
        orgId: first.orgId,
      }),
    ).not.toBeNull();
  });

  it("issues a new single-booking proof when an unclaimed guest appointment is rescheduled", async () => {
    const s = await studio(createBackend());
    await enable(s);
    const booking = await guest(s);
    const newId = await s.owner.mutation(api.bookings.rescheduleBooking, {
      orgId: s.orgId,
      bookingId: booking.bookingId,
      newStartAt: s.slots[2].startAt,
    });
    const emails = await s.backend.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", s.orgId))
        .collect(),
    );
    const update = emails.find(
      (n) => n.bookingId === newId && n.type === "booking_rescheduled",
    );
    const url = new URL(String(update?.templateData?.clientAccountUrl));
    expect(url.searchParams.get("claim")).toBe(newId);
    const token = new URLSearchParams(url.hash.slice(1)).get("proof")!;
    expect(token).not.toBe(booking.claimToken);
    const client = s.backend.withIdentity({
      subject: "client",
      email: "client@example.com",
    });
    await client.mutation(api.opusUsers.claimBooking, {
      bookingId: newId,
      token,
    });
    expect(
      (await client.query(api.opusUsers.getMyBookings)).map((b) => b._id),
    ).toEqual([newId]);
  });
});
