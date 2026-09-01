import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireRole } from "./lib/auth";

const MOCK_SUFFIX = " (Mock)";
const DAY_MS = 24 * 60 * 60 * 1000;

function assertDevelopmentDeployment() {
  if (process.env.ALLOW_DEV_DATA !== "true") {
    throw new ConvexError(
      "Development data tools are disabled. Set ALLOW_DEV_DATA=true on the development Convex deployment.",
    );
  }
}

export const seedMockData = mutation({
  args: {
    orgId: v.id("orgs"),
    targetDateMs: v.number(),
  },
  returns: v.object({
    totalCustomers: v.number(),
    totalBookings: v.number(),
  }),
  handler: async (ctx, args) => {
    assertDevelopmentDeployment();
    const { orgId, staffMember: caller } = await requireRole(
      ctx,
      args.orgId,
      "manager",
    );
    const now = Date.now();

    let staffMembers = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    if (staffMembers.length === 0) {
      const staffId = await ctx.db.insert("staff_members", {
        orgId,
        displayName: `Елена${MOCK_SUFFIX}`,
        specialties: ["Маникир", "Нега на нокти"],
        role: "staff",
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      const staff = await ctx.db.get(staffId);
      if (!staff) throw new ConvexError("Could not create mock staff member.");
      staffMembers = [staff];
    }

    let services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    if (services.length === 0) {
      const serviceId = await ctx.db.insert("services", {
        orgId,
        name: `Маникир${MOCK_SUFFIX}`,
        durationMins: 60,
        priceMinorUnits: 1200,
        currency: "MKD",
        staffIds: [staffMembers[0]._id],
        isOpusVisible: false,
        popularityScore: 0,
        isActive: true,
        isDeleted: false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
      const service = await ctx.db.get(serviceId);
      if (!service) throw new ConvexError("Could not create mock service.");
      services = [service];
    }

    const customerNames = [
      "Ана Стојановска",
      "Марија Петровска",
      "Елена Николовска",
      "Ивана Трајковска",
      "Сара Јовановска",
      "Мила Ангеловска",
      "Нина Ристовска",
      "Теодора Илиевска",
      "Калина Георгиевска",
      "Лена Димитровска",
    ];
    const customerIds = [];

    for (const [index, name] of customerNames.entries()) {
      const isRisky = index % 4 === 0;
      const customerId = await ctx.db.insert("customers", {
        orgId,
        name: `${name}${MOCK_SUFFIX}`,
        totalVisits: (index % 8) + 1,
        totalSpendMinorUnits: 1200 * ((index % 8) + 1),
        noShowCount: isRisky ? 2 : 0,
        noShowRiskScore: isRisky ? 0.8 : 0.1,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: args.targetDateMs - index * 4 * DAY_MS,
        updatedAt: now,
      });
      customerIds.push(customerId);
    }

    let totalBookings = 0;
    const targetDate = new Date(args.targetDateMs);
    targetDate.setHours(0, 0, 0, 0);

    for (let dayOffset = -3; dayOffset <= 3; dayOffset += 1) {
      for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
        const staff = staffMembers[(dayOffset + slotIndex + 7) % staffMembers.length];
        const eligibleServices = services.filter((service) =>
          service.staffIds.includes(staff._id),
        );
        const service = eligibleServices[slotIndex % eligibleServices.length];
        if (!service) continue;

        const startAt = targetDate.getTime()
          + dayOffset * DAY_MS
          + (9 + slotIndex * 2) * 60 * 60 * 1000;
        const endAt = startAt + service.durationMins * 60 * 1000;
        const conflicts = await ctx.db
          .query("bookings")
          .withIndex("by_staff_start", (q) =>
            q.eq("staffId", staff._id).gte("startAt", startAt - DAY_MS).lt("startAt", endAt),
          )
          .collect();
        const hasConflict = conflicts.some(
          (booking) =>
            !booking.isDeleted
            && booking.status !== "cancelled"
            && booking.startAt < endAt
            && booking.endAt > startAt,
        );
        if (hasConflict) continue;

        const status = dayOffset < 0
          ? (slotIndex === 0 ? "cancelled" as const : "completed" as const)
          : "confirmed" as const;
        await ctx.db.insert("bookings", {
          orgId,
          customerId: customerIds[(dayOffset * 4 + slotIndex + 28) % customerIds.length],
          staffId: staff._id,
          serviceId: service._id,
          startAt,
          endAt,
          priceMinorUnits: service.priceMinorUnits,
          currency: service.currency,
          surgePriceApplied: false,
          status,
          source: "manual",
          cancelledAt: status === "cancelled" ? now : undefined,
          cancelledBy: status === "cancelled" ? "development-tool" : undefined,
          cancellationReason: status === "cancelled" ? "Mock cancellation" : undefined,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
        totalBookings += 1;
      }
    }

    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "development.mock_data_seeded",
      resourceType: "orgs",
      resourceId: orgId,
      after: { totalCustomers: customerIds.length, totalBookings },
      createdAt: now,
    });

    return { totalCustomers: customerIds.length, totalBookings };
  },
});

export const clearMockData = mutation({
  args: { orgId: v.id("orgs") },
  returns: v.object({
    deletedCustomersCount: v.number(),
    deletedBookingsCount: v.number(),
    deletedStaffCount: v.number(),
    deletedServicesCount: v.number(),
  }),
  handler: async (ctx, args) => {
    assertDevelopmentDeployment();
    const { orgId, staffMember: caller } = await requireRole(
      ctx,
      args.orgId,
      "manager",
    );
    const now = Date.now();

    const customers = await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const mockCustomerIds = new Set(
      customers
        .filter((customer) => !customer.isDeleted && customer.name.endsWith(MOCK_SUFFIX))
        .map((customer) => customer._id),
    );

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const mockBookings = bookings.filter(
      (booking) => !booking.isDeleted && mockCustomerIds.has(booking.customerId),
    );
    for (const booking of mockBookings) {
      await ctx.db.patch(booking._id, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    const mockCustomers = customers.filter((customer) =>
      mockCustomerIds.has(customer._id),
    );
    for (const customer of mockCustomers) {
      await ctx.db.patch(customer._id, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    const staffMembers = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const mockStaff = staffMembers.filter(
      (staff) => !staff.isDeleted && staff.displayName.endsWith(MOCK_SUFFIX),
    );
    for (const staff of mockStaff) {
      await ctx.db.patch(staff._id, {
        isActive: false,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    const services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const mockServices = services.filter(
      (service) => !service.isDeleted && service.name.endsWith(MOCK_SUFFIX),
    );
    for (const service of mockServices) {
      await ctx.db.patch(service._id, {
        isActive: false,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    const result = {
      deletedCustomersCount: mockCustomers.length,
      deletedBookingsCount: mockBookings.length,
      deletedStaffCount: mockStaff.length,
      deletedServicesCount: mockServices.length,
    };
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: caller._id,
      action: "development.mock_data_cleared",
      resourceType: "orgs",
      resourceId: orgId,
      before: result,
      createdAt: now,
    });

    return result;
  },
});

export const clearAllStorage = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    assertDevelopmentDeployment();
    const files = await ctx.db.system.query("_storage").collect();
    for (const file of files) {
      await ctx.storage.delete(file._id);
    }
    return files.length;
  },
});
