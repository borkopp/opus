import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";
import { convexModules } from "../../convex-test.setup";

async function setup() {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "management-owner",
    email: "owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Management Studio",
    category: "hair_salon",
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Haircut",
    durationMins: 30,
    priceMinorUnits: 120000,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: dayOfWeek === 6,
    })),
  });
  const management = await owner.query(api.mobileManagement.list);
  const service = management.services[0];
  const draft = {
    name: service.name,
    description: service.description,
    durationMins: service.durationMins,
    priceMinorUnits: service.priceMinorUnits,
    currency: service.currency,
    staffIds: service.staffIds as Id<"staff_members">[],
    isActive: service.isActive,
    isOpusVisible: service.isOpusVisible,
  };
  const teamDraft = {
    displayName: "Ana",
    role: "staff" as const,
    bio: "Stylist",
    specialties: ["Hair"],
    isActive: true,
    serviceIds: [serviceId],
    hours: management.defaultHours,
  };
  return { backend, owner, orgId, serviceId, management, draft, teamDraft };
}

describe("mobile management", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  it("creates a Pro staff profile and queues its personal account invitation atomically", async () => {
    const { backend, owner, orgId, teamDraft } = await setup();
    await backend.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    const staffId = await owner.mutation(api.mobileManagement.saveTeamMember, { ...teamDraft, signInEmail: "  specialist@example.invalid  " });
    const invites = await backend.run((ctx) => ctx.db.query("staff_invites").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect());
    expect(invites).toMatchObject([{ staffId, email: "specialist@example.invalid" }]);
    const staff = await backend.run((ctx) => ctx.db.get(staffId));
    expect(staff?.bookingAccess).toBe("own");
    expect(staff?.role).toBe("staff");
  });
  it("rejects a sign-in email on Free before creating a team member", async () => {
    const { backend, owner, orgId, teamDraft } = await setup();
    const before = await backend.run((ctx) => ctx.db.query("staff_members").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect());
    await expect(owner.mutation(api.mobileManagement.saveTeamMember, { ...teamDraft, signInEmail: "specialist@example.invalid" })).rejects.toThrow("Staff accounts requires the paid plan");
    expect(await backend.run((ctx) => ctx.db.query("staff_members").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect())).toEqual(before);
  });
  it("saves a manager's own services and hours before an atomic downgrade to staff", async () => {
    const { backend, owner, orgId, serviceId, teamDraft } = await setup();
    const manager = backend.withIdentity({
      subject: "self-manager",
      email: "self-manager@example.com",
    });
    const userId = await manager.mutation(api.users.ensureUser);
    const staffId = await owner.mutation(api.mobileManagement.saveTeamMember, {
      ...teamDraft,
      role: "manager",
    });
    await backend.run(async (ctx) => {
      await ctx.db.patch(userId, { activeOrgId: orgId });
      await ctx.db.patch(staffId, { userId });
    });
    await manager.mutation(api.mobileManagement.saveTeamMember, {
      ...teamDraft,
      staffId,
      displayName: "Updated profile",
      hours: teamDraft.hours.map((d) => ({ ...d, endTime: "16:00" })),
    });
    const data = await manager.query(api.mobileManagement.list);
    expect(data.canManage).toBe(false);
    expect(data.team.find((s) => s.id === staffId)).toMatchObject({
      name: "Updated profile",
      role: "staff",
      hours: expect.arrayContaining([
        expect.objectContaining({ endTime: "16:00" }),
      ]),
    });
    expect(data.services.find((s) => s.id === serviceId)?.staffIds).toContain(
      staffId,
    );
  });
  it("creates and edits bookable services/team with atomic assignments, weekday conversion and breaks", async () => {
    const { backend, owner, orgId, draft, teamDraft, management } =
      await setup();
    expect(
      management.defaultHours.find((d) => d.dayOfWeek === 0)?.isActive,
    ).toBe(false);
    expect(
      management.defaultHours.find((d) => d.dayOfWeek === 1)?.isActive,
    ).toBe(true);
    const serviceId = await owner.mutation(api.mobileManagement.saveService, {
      ...draft,
      name: "  Styling  ",
      priceMinorUnits: 133250,
    });
    const staffId = await owner.mutation(api.mobileManagement.saveTeamMember, {
      ...teamDraft,
      serviceIds: [serviceId],
      hours: teamDraft.hours.map((d) => ({
        ...d,
        breaks: d.isActive ? [{ startTime: "12:00", endTime: "13:00" }] : [],
      })),
    });
    let data = await owner.query(api.mobileManagement.list);
    expect(data.services.find((s) => s.id === serviceId)).toMatchObject({
      name: "Styling",
      priceMinorUnits: 133250,
      staffIds: expect.arrayContaining([staffId]),
    });
    expect(
      data.services.find((s) => s.id === teamDraft.serviceIds[0])?.staffIds,
    ).not.toContain(staffId);
    const studio = await owner.query(api.mobile.bootstrap);
    if (!studio.available) throw new Error("Fixture unavailable");
    let day = studio.today + 7 * 86400000;
    while (new Date(day).getUTCDay() !== 1) day += 86400000;
    const slots = await owner.query(api.mobile.slots, {
      staffId,
      serviceId,
      date: new Date(day).toISOString().slice(0, 10),
      refreshMinute: 0,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(
      slots.some(
        (s) =>
          s.startAt % 86400000 >= 12 * 3600000 &&
          s.startAt % 86400000 < 13 * 3600000,
      ),
    ).toBe(false);
    const bookingId = await owner.mutation(api.mobile.createAppointment, {
      staffId,
      serviceId,
      startAt: slots[0].startAt,
      customerName: "Local client",
    });
    await owner.mutation(api.mobileManagement.saveService, {
      ...draft,
      serviceId,
      name: "Styling",
      priceMinorUnits: 140000,
      staffIds: [staffId],
    });
    expect(
      (
        await owner.query(api.mobile.getAppointment, {
          bookingId: bookingId as Id<"bookings">,
        })
      )?.priceMinorUnits,
    ).toBe(133250);
    await owner.mutation(api.mobileManagement.removeService, { serviceId });
    await owner.mutation(api.mobileManagement.removeTeamMember, { staffId });
    data = await owner.query(api.mobileManagement.list);
    expect(data.services.some((s) => s.id === serviceId)).toBe(false);
    expect(data.team.some((s) => s.id === staffId)).toBe(false);
    const deleted = await backend.run(async (ctx) => [
      await ctx.db.get(serviceId),
      await ctx.db.get(staffId),
    ]);
    expect(deleted.every((r) => r?.isDeleted && r.deletedAt)).toBe(true);
    expect(
      (
        await owner.query(api.mobile.getAppointment, {
          bookingId: bookingId as Id<"bookings">,
        })
      )?.serviceName,
    ).toBe("Styling");
    const audits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(audits.map((a) => a.action)).toEqual(
      expect.arrayContaining([
        "service.created",
        "service.updated",
        "staff.created",
        "availability_rule.created",
        "service.deactivated",
        "staff.deactivated",
      ]),
    );
  });

  it("uses the studio currency for new mobile services and preserves existing denominations", async () => {
    const { backend, owner, orgId, serviceId, draft } = await setup();
    await backend.run(async (ctx) => {
      const settings = await ctx.db.query("org_settings").withIndex("by_org", (q) => q.eq("orgId", orgId)).first();
      await ctx.db.patch(settings!._id, { currency: "EUR" });
    });
    const { currency: originalCurrency, ...withoutCurrency } = draft;
    const newId = await owner.mutation(api.mobileManagement.saveService, { ...withoutCurrency, name: "New service" });
    await owner.mutation(api.mobileManagement.saveService, { ...draft, serviceId, currency: "USD", name: "Renamed service" });
    const result = await owner.query(api.mobileManagement.list);
    expect(result.services.find((service) => service.id === newId)?.currency).toBe("EUR");
    expect(result.services.find((service) => service.id === serviceId)).toMatchObject({ currency: originalCurrency, priceMinorUnits: draft.priceMinorUnits });
  });

  it("rejects invalid money, duration and schedules before writing any partial profile", async () => {
    const { owner, draft, teamDraft } = await setup();
    await expect(
      owner.mutation(api.mobileManagement.saveService, {
        ...draft,
        priceMinorUnits: 1.5,
      }),
    ).rejects.toThrow("valid price");
    await expect(
      owner.mutation(api.mobileManagement.saveService, {
        ...draft,
        durationMins: 17,
      }),
    ).rejects.toThrow("multiple");
    await expect(
      owner.mutation(api.mobileManagement.saveService, {
        ...draft,
        name: "  ",
      }),
    ).rejects.toThrow("Service name");
    await expect(
      owner.mutation(api.mobileManagement.saveTeamMember, {
        ...teamDraft,
        hours: teamDraft.hours.map((d) => ({ ...d, endTime: "08:00" })),
      }),
    ).rejects.toThrow("end after");
    await expect(
      owner.mutation(api.mobileManagement.saveTeamMember, {
        ...teamDraft,
        hours: teamDraft.hours.map((d) => ({
          ...d,
          breaks: [
            { startTime: "11:00", endTime: "12:30" },
            { startTime: "12:00", endTime: "13:00" },
          ],
        })),
      }),
    ).rejects.toThrow("overlap");
    expect((await owner.query(api.mobileManagement.list)).team).toHaveLength(1);
  });

  it("derives tenant scope, blocks foreign IDs and rejects client-supplied orgId", async () => {
    const { backend, owner, orgId, serviceId, draft, teamDraft, management } =
      await setup();
    await expect(backend.query(api.mobileManagement.list)).rejects.toThrow(
      "Unauthenticated",
    );
    await expect(
      owner.query(api.mobileManagement.list, { orgId } as unknown as Record<
        string,
        never
      >),
    ).rejects.toThrow();
    const other = backend.withIdentity({
      subject: "other-management-owner",
      email: "other@example.com",
    });
    await other.mutation(api.users.ensureUser);
    await other.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
      category: "nail_salon",
    });
    expect((await other.query(api.mobileManagement.list)).services).toEqual([]);
    await expect(
      other.mutation(api.mobileManagement.saveService, { ...draft, serviceId }),
    ).rejects.toThrow();
    await expect(
      other.mutation(api.mobileManagement.removeService, { serviceId }),
    ).rejects.toThrow("not found");
    await expect(
      other.mutation(api.mobileManagement.removeTeamMember, {
        staffId: management.callerId as Id<"staff_members">,
      }),
    ).rejects.toThrow("not found");
    await expect(
      other.mutation(api.mobileManagement.saveTeamMember, teamDraft),
    ).rejects.toThrow("Service unavailable");
  });

  it("enforces Free capacity, reactivation limits, owner protection and reversible paused records", async () => {
    const { owner, draft, serviceId, teamDraft, management } = await setup();
    const ids: Id<"staff_members">[] = [];
    for (let i = 0; i < 3; i++)
      ids.push(
        (await owner.mutation(api.mobileManagement.saveTeamMember, {
          ...teamDraft,
          displayName: `Staff ${i}`,
        })) as Id<"staff_members">,
      );
    await expect(
      owner.mutation(api.mobileManagement.saveTeamMember, {
        ...teamDraft,
        role: "manager",
      }),
    ).rejects.toThrow("FREE_STAFF_LIMIT");
    await owner.mutation(api.mobileManagement.saveTeamMember, {
      ...teamDraft,
      staffId: ids[0],
      isActive: false,
    });
    await owner.mutation(api.mobileManagement.saveTeamMember, {
      ...teamDraft,
      displayName: "Replacement",
    });
    await expect(
      owner.mutation(api.mobileManagement.saveTeamMember, {
        ...teamDraft,
        staffId: ids[0],
      }),
    ).rejects.toThrow("FREE_STAFF_LIMIT");
    expect(
      (await owner.query(api.mobileManagement.list)).team.find(
        (s) => s.id === ids[0],
      )?.isActive,
    ).toBe(false);
    await expect(
      owner.mutation(api.mobileManagement.saveTeamMember, {
        ...teamDraft,
        staffId: management.callerId as Id<"staff_members">,
        role: "owner",
        isActive: false,
      }),
    ).rejects.toThrow("yourself");
    await expect(
      owner.mutation(api.mobileManagement.removeTeamMember, {
        staffId: management.callerId as Id<"staff_members">,
      }),
    ).rejects.toThrow("yourself");
    await owner.mutation(api.mobileManagement.saveService, {
      ...draft,
      serviceId,
      isActive: false,
    });
    expect(
      (await owner.query(api.mobileManagement.list)).services[0].isActive,
    ).toBe(false);
    expect(await owner.query(api.mobile.bootstrap)).toMatchObject({
      services: [],
    });
    await owner.mutation(api.mobileManagement.saveService, {
      ...draft,
      serviceId,
    });
    expect(await owner.query(api.mobile.bootstrap)).toMatchObject({
      services: [expect.objectContaining({ id: serviceId })],
    });
  });

  it("keeps staff read-only and manager access below the owner boundary", async () => {
    const { backend, owner, orgId, draft, teamDraft, management } =
      await setup();
    await owner.mutation(api.staff.updateStaffMember, {
      orgId,
      staffId: management.callerId as Id<"staff_members">,
      appointmentEmail: "private@example.com",
    });
    for (const role of ["staff", "manager"] as const) {
      const account = backend.withIdentity({
        subject: `management-${role}`,
        email: `${role}@example.com`,
      });
      const userId = await account.mutation(api.users.ensureUser);
      await backend.run(async (ctx) => {
        await ctx.db.patch(userId, { activeOrgId: orgId });
        await ctx.db.insert("staff_members", {
          orgId,
          userId,
          displayName: role,
          role,
          specialties: [],
          isActive: true,
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      const data = await account.query(api.mobileManagement.list);
      expect(
        data.team.find((s) => s.id === management.callerId),
      ).not.toHaveProperty("appointmentEmail");
      expect(data.team.find((s) => s.id === management.callerId)?.canEdit).toBe(
        false,
      );
      await expect(
        account.mutation(api.mobileManagement.saveTeamMember, {
          ...teamDraft,
          role: "owner",
        }),
      ).rejects.toThrow();
      if (role === "staff") {
        expect(data.canManage).toBe(false);
        await expect(
          account.mutation(api.mobileManagement.saveService, draft),
        ).rejects.toThrow("Unauthorised");
        await expect(
          account.mutation(api.mobileManagement.inviteTeamMember, {
            staffId: management.callerId as Id<"staff_members">,
            email: "invite@example.com",
          }),
        ).rejects.toThrow("Unauthorised");
      } else
        expect(
          await account.mutation(api.mobileManagement.saveService, {
            ...draft,
            name: "Manager service",
          }),
        ).toBeTruthy();
    }
  });

  it("queues an explicit valid invitation, protects linked/inactive accounts and never exposes invite tokens", async () => {
    const { backend, owner, orgId, teamDraft, management } = await setup();
    const staffId = await owner.mutation(
      api.mobileManagement.saveTeamMember,
      teamDraft,
    );
    await expect(
      owner.mutation(api.mobileManagement.inviteTeamMember, {
        staffId,
        email: "invalid",
      }),
    ).rejects.toThrow("valid invitation email");
    await expect(
      owner.mutation(api.mobileManagement.inviteTeamMember, {
        staffId,
        email: "ana@example.com",
      }),
    ).rejects.toThrow("paid plan");
    await backend.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    await owner.mutation(api.mobileManagement.inviteTeamMember, {
      staffId,
      email: "  ANA@EXAMPLE.COM  ",
    });
    const data = await owner.query(api.mobileManagement.list);
    expect(data.team.find((s) => s.id === staffId)).toMatchObject({
      pendingInviteEmail: "ana@example.com",
      hasAccess: false,
    });
    expect(JSON.stringify(data)).not.toContain('"token"');
    const notifications = await backend.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "staff_invite",
          recipientAddress: "ana@example.com",
          status: "pending",
        }),
      ]),
    );
    await expect(
      owner.mutation(api.mobileManagement.inviteTeamMember, {
        staffId: management.callerId as Id<"staff_members">,
        email: "owner@example.com",
      }),
    ).rejects.toThrow("already linked");
    await owner.mutation(api.mobileManagement.saveTeamMember, {
      ...teamDraft,
      staffId,
      isActive: false,
    });
    await expect(
      owner.mutation(api.mobileManagement.inviteTeamMember, {
        staffId,
        email: "ana@example.com",
      }),
    ).rejects.toThrow("unavailable");
  });
});
