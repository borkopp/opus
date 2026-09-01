import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
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

export const seedBarberDavidBookings = mutation({
  args: {
    targetDateMs: v.optional(v.number()),
  },
  returns: v.object({
    orgId: v.id("orgs"),
    davidStaffId: v.id("staff_members"),
    anaStaffId: v.id("staff_members"),
    servicesCount: v.number(),
    todayBookingsCount: v.number(),
    totalBookingsCount: v.number(),
  }),
  handler: async (ctx, args) => {
    assertDevelopmentDeployment();
    const now = Date.now();

    // 1. Locate Org
    let org = await ctx.db
      .query("orgs")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (!org) {
      const newOrgId = await ctx.db.insert("orgs", {
        name: "Demo Barbershop",
        slug: "demo-barbershop",
        industry: "beauty_wellness",
        beautyCategory: "barbershop",
        city: "Skopje",
        country: "MK",
        listingStatus: "published",
        websiteStatus: "published",
        reviewCount: 24,
        averageRating: 4.95,
        plan: "growth",
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      org = (await ctx.db.get(newOrgId))!;
    }

    const orgId = org._id;

    // 2. Locate / Ensure Staff Member David (Owner)
    let david = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("displayName"), "David"),
        ),
      )
      .first();

    if (!david) {
      const staffId = await ctx.db.insert("staff_members", {
        orgId,
        displayName: "David",
        bio: "Master barber specializing in precision fades, classic scissor work, and traditional hot towel beard styling.",
        role: "owner",
        specialties: ["Skin Fades", "Beard Sculpting", "Hot Towel Shaves", "Classic Scissor Cuts"],
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      david = (await ctx.db.get(staffId))!;
    } else {
      await ctx.db.patch(david._id, {
        specialties: ["Skin Fades", "Beard Sculpting", "Hot Towel Shaves", "Classic Scissor Cuts"],
        bio: "Master barber specializing in precision fades, classic scissor work, and traditional hot towel beard styling.",
        isActive: true,
        updatedAt: now,
      });
    }

    const davidStaffId = david._id;

    // 3. Locate / Ensure Staff Member Ana (Staff Colorist & Stylist)
    let ana = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("displayName"), "Ana"),
        ),
      )
      .first();

    if (!ana) {
      const staffId = await ctx.db.insert("staff_members", {
        orgId,
        displayName: "Ana",
        bio: "Senior colorist and hair specialist focusing on custom hair dyeing, restorative hair washes, and blowout styling.",
        role: "staff",
        specialties: ["Hair Dye & Color", "Hair Washing & Scalp Care", "Blowouts & Styling", "Balayage"],
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      ana = (await ctx.db.get(staffId))!;
    } else {
      await ctx.db.patch(ana._id, {
        specialties: ["Hair Dye & Color", "Hair Washing & Scalp Care", "Blowouts & Styling", "Balayage"],
        bio: "Senior colorist and hair specialist focusing on custom hair dyeing, restorative hair washes, and blowout styling.",
        isActive: true,
        updatedAt: now,
      });
    }

    const anaStaffId = ana._id;

    // 4. Ensure Weekly Availability for David & Ana (Mon-Sat 09:00 - 18:00)
    for (const memberId of [davidStaffId, anaStaffId]) {
      for (let day = 1; day <= 6; day += 1) {
        const existingRule = await ctx.db
          .query("availability_rules")
          .withIndex("by_staff_day", (q) => q.eq("staffId", memberId).eq("dayOfWeek", day))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .first();

        if (!existingRule) {
          await ctx.db.insert("availability_rules", {
            orgId,
            staffId: memberId,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "18:00",
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          await ctx.db.patch(existingRule._id, {
            startTime: "09:00",
            endTime: "18:00",
            isActive: true,
            updatedAt: now,
          });
        }
      }
    }

    // 5. Create/Ensure Realistic Services Catalog
    const serviceDefs = [
      // Barber services (David)
      {
        name: "Skin Fade",
        durationMins: 45,
        priceMinorUnits: 50000, // 500 MKD
        consumerDescription: "Precision zero/foil skin fade with foil shaver finish and style.",
        highlights: ["Foil shaver fade", "Straight razor neckline", "Matte pomade styling"],
        staffIds: [davidStaffId],
      },
      {
        name: "Signature Hair & Beard Combo",
        durationMins: 60,
        priceMinorUnits: 80000, // 800 MKD
        consumerDescription: "Complete haircut with beard sculpt, hot towel steam, and razor line-up.",
        highlights: ["Precision fade or scissor cut", "Beard shaping & steam", "Hot towel & cologne splash"],
        staffIds: [davidStaffId],
      },
      {
        name: "Classic Scissor Cut",
        durationMins: 30,
        priceMinorUnits: 40000, // 400 MKD
        consumerDescription: "Traditional scissor haircut tailored to face shape with wash and blowout.",
        highlights: ["Scissor over comb", "Neck taper", "Hair styling product"],
        staffIds: [davidStaffId],
      },
      {
        name: "Fade & Beard Sculpt",
        durationMins: 45,
        priceMinorUnits: 65000, // 650 MKD
        consumerDescription: "Skin or taper fade combined with detailed beard contouring.",
        highlights: ["Mid/Low fade", "Beard oil & balm", "Razor line-up"],
        staffIds: [davidStaffId],
      },
      {
        name: "Beard Trim & Hot Towel",
        durationMins: 30,
        priceMinorUnits: 35000, // 350 MKD
        consumerDescription: "Beard shaping, length adjustment, and relaxing essential oil hot towel.",
        highlights: ["Length reduction & shape", "Hot steam towel", "Beard butter finish"],
        staffIds: [davidStaffId],
      },
      {
        name: "Royal Hot Towel Shave",
        durationMins: 30,
        priceMinorUnits: 35000, // 350 MKD
        consumerDescription: "Traditional straight razor hot lather shave with cold towel soothing finish.",
        highlights: ["Hot lather pre-shave", "Single blade shave", "Cold towel & aftershave"],
        staffIds: [davidStaffId],
      },
      {
        name: "Junior Haircut",
        durationMins: 30,
        priceMinorUnits: 30000, // 300 MKD
        consumerDescription: "Haircut for kids up to 12 years old.",
        highlights: ["Gentle styling", "Clean scissor / clipper cut"],
        staffIds: [davidStaffId],
      },

      // Hair Wash & Hair Dye services (Ana)
      {
        name: "Hair Wash",
        durationMins: 30,
        priceMinorUnits: 30000, // 300 MKD
        consumerDescription: "Refreshing deep hair cleanse, relaxing scalp massage, and conditioning treatment.",
        highlights: ["Scalp stimulation massage", "Hydrating hair mask", "Light drying & comb out"],
        staffIds: [anaStaffId, davidStaffId],
      },
      {
        name: "Hair Wash & Blowout",
        durationMins: 35,
        priceMinorUnits: 35000, // 350 MKD
        consumerDescription: "Deep hair wash, conditioning scalp massage, and sleek or voluminous blowout styling.",
        highlights: ["Deep cleanse & mask", "Blowout styling", "Shine serum finish"],
        staffIds: [anaStaffId],
      },
      {
        name: "Hair Dye",
        durationMins: 60,
        priceMinorUnits: 120000, // 1,200 MKD
        consumerDescription: "Full permanent or semi-permanent hair coloring tailored to your natural tone.",
        highlights: ["Color consultation", "Root to tip application", "Gloss toning rinse"],
        staffIds: [anaStaffId],
      },
      {
        name: "Hair Dye & Color",
        durationMins: 60,
        priceMinorUnits: 120000, // 1,200 MKD
        consumerDescription: "Custom formulated hair dyeing and toning with nourishing post-color treatment.",
        highlights: ["Custom pigment mix", "Scalp protection barrier", "Post-dye conditioning seal"],
        staffIds: [anaStaffId],
      },
      {
        name: "Hair Dye + Wash & Style",
        durationMins: 75,
        priceMinorUnits: 140000, // 1,400 MKD
        consumerDescription: "All-in-one package: custom hair dye, post-color nourishing wash, and signature blowout styling.",
        highlights: ["Custom hair dye", "Post-color restorative wash", "Full volume blowout"],
        staffIds: [anaStaffId],
      },
    ];

    const serviceMap = new Map<string, typeof serviceDefs[0] & { _id: Id<"services"> }>();

    for (const def of serviceDefs) {
      let service = await ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .filter((q) =>
          q.and(
            q.eq(q.field("isDeleted"), false),
            q.eq(q.field("name"), def.name),
          ),
        )
        .first();

      if (!service) {
        const serviceId = await ctx.db.insert("services", {
          orgId,
          name: def.name,
          durationMins: def.durationMins,
          priceMinorUnits: def.priceMinorUnits,
          currency: "MKD",
          consumerDescription: def.consumerDescription,
          highlights: def.highlights,
          staffIds: def.staffIds,
          isOpusVisible: true,
          popularityScore: 10,
          isActive: true,
          isDeleted: false,
          sortOrder: serviceMap.size,
          createdAt: now,
          updatedAt: now,
        });
        service = (await ctx.db.get(serviceId))!;
      } else {
        await ctx.db.patch(service._id, {
          durationMins: def.durationMins,
          priceMinorUnits: def.priceMinorUnits,
          staffIds: Array.from(new Set([...service.staffIds, ...def.staffIds])),
          isActive: true,
          updatedAt: now,
        });
      }
      serviceMap.set(def.name, { ...def, _id: service._id });
    }

    // 6. Create Realistic CRM Customers
    const customerDefs = [
      // David's clients
      {
        name: "Александар Трајковски",
        email: "aleksandar.t@gmail.com",
        phone: "+38970123456",
        totalVisits: 14,
        totalSpendMinorUnits: 720000,
        preferredStaffId: davidStaffId,
        note: "VIP regular. Prefers low skin fade, scissor work on top, natural hairline.",
      },
      {
        name: "Никола Петров",
        email: "nikola.petrov@gmail.com",
        phone: "+38976678901",
        totalVisits: 11,
        totalSpendMinorUnits: 440000,
        preferredStaffId: davidStaffId,
        note: "Weekly beard maintenance & hot towel treatment.",
      },
      {
        name: "Дамјан Стојанов",
        email: "damjan.stojanov@gmail.com",
        phone: "+38972456789",
        totalVisits: 8,
        totalSpendMinorUnits: 640000,
        preferredStaffId: davidStaffId,
        note: "Signature combo before wedding event tonight.",
      },
      {
        name: "Филип Ангеловски",
        email: "filip.angelovski@gmail.com",
        phone: "+38970789012",
        totalVisits: 3,
        totalSpendMinorUnits: 120000,
        preferredStaffId: davidStaffId,
        note: "Haircut for son Luka (7 yrs).",
      },
      {
        name: "Стефан Јованов",
        email: "stefan.jovanov@gmail.com",
        phone: "+38975345678",
        totalVisits: 5,
        totalSpendMinorUnits: 325000,
        preferredStaffId: davidStaffId,
        note: "Mid fade + clean taper on neckline.",
      },
      {
        name: "Виктор Костовски",
        email: "viktor.k@gmail.com",
        phone: "+38971890123",
        totalVisits: 7,
        totalSpendMinorUnits: 280000,
        preferredStaffId: davidStaffId,
        note: "Classic scissor cut, side part styling with matte clay.",
      },
      {
        name: "Марко Николовски",
        email: "marko.nikolovski@outlook.com",
        phone: "+38971234567",
        totalVisits: 9,
        totalSpendMinorUnits: 510000,
        preferredStaffId: davidStaffId,
        note: "Skin fade, tidy up beard line with straight razor.",
      },
      {
        name: "Бојан Димитров",
        email: "bojan.d@yahoo.com",
        phone: "+38978567890",
        totalVisits: 1,
        totalSpendMinorUnits: 65000,
        preferredStaffId: davidStaffId,
        note: "First time client. Booked via AI Assistant on webchat.",
      },
      {
        name: "Мартин Ристовски",
        email: "martin.r@icloud.com",
        phone: "+38977901234",
        totalVisits: 4,
        totalSpendMinorUnits: 160000,
        preferredStaffId: davidStaffId,
        note: "Traditional hot lather and straight razor finish.",
      },

      // Ana's clients
      {
        name: "Марија Трајковска",
        email: "marija.t@gmail.com",
        phone: "+38970889900",
        totalVisits: 5,
        totalSpendMinorUnits: 620000,
        preferredStaffId: anaStaffId,
        note: "Prefers warm brunette root touch-up with ammonia-free dye.",
      },
      {
        name: "Елена Николовска",
        email: "elena.n@outlook.com",
        phone: "+38971778899",
        totalVisits: 8,
        totalSpendMinorUnits: 280000,
        preferredStaffId: anaStaffId,
        note: "Weekly volume blowout and deep restorative scalp wash.",
      },
      {
        name: "Ивана Стојановска",
        email: "ivana.st@gmail.com",
        phone: "+38975667788",
        totalVisits: 3,
        totalSpendMinorUnits: 420000,
        preferredStaffId: anaStaffId,
        note: "Balayage toner refresh + wash & loose curls styling.",
      },
      {
        name: "Сара Димитриевска",
        email: "sara.d@gmail.com",
        phone: "+38972556677",
        totalVisits: 6,
        totalSpendMinorUnits: 210000,
        preferredStaffId: anaStaffId,
        note: "Express wash and sleek straightening treatment.",
      },
      {
        name: "Теодора Ангеловска",
        email: "teodora.a@gmail.com",
        phone: "+38978445566",
        totalVisits: 1,
        totalSpendMinorUnits: 120000,
        preferredStaffId: anaStaffId,
        note: "First time client. Booked via AI Webchat ✨ for copper tone dye consultation.",
      },
      {
        name: "Калина Ристовска",
        email: "kalina.r@icloud.com",
        phone: "+38976334455",
        totalVisits: 4,
        totalSpendMinorUnits: 140000,
        preferredStaffId: anaStaffId,
        note: "Restorative wash & bouncy blowout styling.",
      },
      {
        name: "Симона Георгиевска",
        email: "simona.g@gmail.com",
        phone: "+38970223344",
        totalVisits: 7,
        totalSpendMinorUnits: 840000,
        preferredStaffId: anaStaffId,
        note: "Full color dye application, ash blonde tone.",
      },
    ];

    const customerMap = new Map<string, Doc<"customers">>();

    for (const def of customerDefs) {
      let customer = await ctx.db
        .query("customers")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .filter((q) =>
          q.and(
            q.eq(q.field("isDeleted"), false),
            q.eq(q.field("name"), def.name),
          ),
        )
        .first();

      if (!customer) {
        const customerId = await ctx.db.insert("customers", {
          orgId,
          name: def.name,
          email: def.email,
          phone: def.phone,
          totalVisits: def.totalVisits,
          totalSpendMinorUnits: def.totalSpendMinorUnits,
          lastVisitAt: now - 7 * 24 * 60 * 60 * 1000,
          preferredStaffId: def.preferredStaffId,
          noShowCount: 0,
          noShowRiskScore: 0.05,
          whatsappOptIn: true,
          marketingOptIn: true,
          isDeleted: false,
          createdAt: now - 90 * 24 * 60 * 60 * 1000,
          updatedAt: now,
        });
        customer = (await ctx.db.get(customerId))!;

        if (def.note) {
          await ctx.db.insert("customer_notes", {
            orgId,
            customerId: customer._id,
            authorStaffId: def.preferredStaffId,
            note: def.note,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else {
        await ctx.db.patch(customer._id, {
          email: def.email,
          phone: def.phone,
          totalVisits: def.totalVisits,
          totalSpendMinorUnits: def.totalSpendMinorUnits,
          preferredStaffId: def.preferredStaffId,
          updatedAt: now,
        });
      }
      customerMap.set(def.name, customer);
    }

    // 7. Clear old bookings for David and Ana
    for (const staffId of [davidStaffId, anaStaffId]) {
      const existingBookings = await ctx.db
        .query("bookings")
        .withIndex("by_staff_start", (q) => q.eq("staffId", staffId))
        .collect();

      for (const b of existingBookings) {
        await ctx.db.delete(b._id);
      }
    }

    // 8. Generate appointments for TODAY
    const baseDate = args.targetDateMs ? new Date(args.targetDateMs) : new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    const todayAppointments = [
      // --- David's Schedule ---
      {
        staffId: davidStaffId,
        customerName: "Александар Трајковски",
        serviceName: "Skin Fade",
        startHour: 9,
        startMin: 0,
        status: "completed" as const,
        source: "manual" as const,
        customerNote: "Low skin fade with textured crop on top",
      },
      {
        staffId: davidStaffId,
        customerName: "Никола Петров",
        serviceName: "Beard Trim & Hot Towel",
        startHour: 10,
        startMin: 0,
        status: "completed" as const,
        source: "web" as const,
        customerNote: "Beard shape-up and hot towel treatment",
      },
      {
        staffId: davidStaffId,
        customerName: "Дамјан Стојанов",
        serviceName: "Signature Hair & Beard Combo",
        startHour: 10,
        startMin: 45,
        status: "completed" as const,
        source: "web" as const,
        customerNote: "Full styling and beard sculpt for wedding attendance",
      },
      {
        staffId: davidStaffId,
        customerName: "Филип Ангеловски",
        serviceName: "Junior Haircut",
        startHour: 12,
        startMin: 0,
        status: "completed" as const,
        source: "manual" as const,
        customerNote: "Haircut for Luka (7 yrs)",
      },
      {
        staffId: davidStaffId,
        customerName: "Стефан Јованов",
        serviceName: "Fade & Beard Sculpt",
        startHour: 13,
        startMin: 30,
        status: "completed" as const,
        source: "web" as const,
        customerNote: "Mid fade + clean taper on neck",
      },
      {
        staffId: davidStaffId,
        customerName: "Виктор Костовски",
        serviceName: "Classic Scissor Cut",
        startHour: 14,
        startMin: 30,
        status: "completed" as const,
        source: "manual" as const,
        customerNote: "Classic scissor cut, natural parted look",
      },
      {
        staffId: davidStaffId,
        customerName: "Марко Николовски",
        serviceName: "Skin Fade",
        startHour: 15,
        startMin: 15,
        status: "completed" as const,
        source: "web" as const,
        customerNote: "High skin fade, tidy up beard line",
      },
      {
        staffId: davidStaffId,
        customerName: "Бојан Димитров",
        serviceName: "Fade & Beard Sculpt",
        startHour: 16,
        startMin: 30,
        status: "confirmed" as const,
        source: "ai_webchat" as const,
        customerNote: "First visit, requested consultation with David",
      },
      {
        staffId: davidStaffId,
        customerName: "Мартин Ристовски",
        serviceName: "Royal Hot Towel Shave",
        startHour: 17,
        startMin: 30,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Traditional hot lather and straight razor finish",
      },

      // --- Ana's Schedule ---
      {
        staffId: anaStaffId,
        customerName: "Елена Николовска",
        serviceName: "Hair Wash & Blowout",
        startHour: 9,
        startMin: 15,
        status: "completed" as const,
        source: "web" as const,
        customerNote: "Morning wash and volume blowout styling",
      },
      {
        staffId: anaStaffId,
        customerName: "Марија Трајковска",
        serviceName: "Hair Dye & Color",
        startHour: 10,
        startMin: 0,
        status: "completed" as const,
        source: "manual" as const,
        customerNote: "Warm brunette root dye and toning",
      },
      {
        staffId: anaStaffId,
        customerName: "Ивана Стојановска",
        serviceName: "Hair Dye + Wash & Style",
        startHour: 11,
        startMin: 15,
        status: "completed" as const,
        source: "web" as const,
        customerNote: "Full dye refresh, wash & curl finish",
      },
      {
        staffId: anaStaffId,
        customerName: "Сара Димитриевска",
        serviceName: "Hair Wash & Blowout",
        startHour: 13,
        startMin: 30,
        status: "completed" as const,
        source: "manual" as const,
        customerNote: "Express wash and straightening",
      },
      {
        staffId: anaStaffId,
        customerName: "Теодора Ангеловска",
        serviceName: "Hair Dye & Color",
        startHour: 14,
        startMin: 30,
        status: "completed" as const,
        source: "ai_webchat" as const,
        customerNote: "Copper tone dye consultation & application",
      },
      {
        staffId: anaStaffId,
        customerName: "Калина Ристовска",
        serviceName: "Hair Wash & Blowout",
        startHour: 16,
        startMin: 0,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Scalp care wash & bouncy blowout",
      },
      {
        staffId: anaStaffId,
        customerName: "Симона Георгиевска",
        serviceName: "Hair Dye & Color",
        startHour: 17,
        startMin: 0,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Ash blonde full coloring session",
      },
    ];

    let todayBookingsCount = 0;
    let totalBookingsCount = 0;

    for (const apt of todayAppointments) {
      const customer = customerMap.get(apt.customerName);
      const service = serviceMap.get(apt.serviceName);
      if (!customer || !service) continue;

      const startAt = Date.UTC(year, month, day, apt.startHour, apt.startMin);
      const endAt = startAt + service.durationMins * 60 * 1000;

      await ctx.db.insert("bookings", {
        orgId,
        staffId: apt.staffId,
        serviceId: service._id,
        customerId: customer._id,
        startAt,
        endAt,
        priceMinorUnits: service.priceMinorUnits,
        currency: "MKD",
        surgePriceApplied: false,
        status: apt.status,
        source: apt.source,
        customerNote: apt.customerNote,
        isDeleted: false,
        createdAt: now - 3 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      todayBookingsCount += 1;
      totalBookingsCount += 1;
    }

    // 9. Generate appointments for TOMORROW (Day + 1)
    const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    const tYear = tomorrow.getFullYear();
    const tMonth = tomorrow.getMonth();
    const tDay = tomorrow.getDate();

    const tomorrowAppointments = [
      // David
      {
        staffId: davidStaffId,
        customerName: "Александар Трајковски",
        serviceName: "Skin Fade",
        startHour: 9,
        startMin: 30,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Morning slot",
      },
      {
        staffId: davidStaffId,
        customerName: "Дамјан Стојанов",
        serviceName: "Signature Hair & Beard Combo",
        startHour: 11,
        startMin: 0,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Follow up shape-up",
      },
      {
        staffId: davidStaffId,
        customerName: "Стефан Јованов",
        serviceName: "Fade & Beard Sculpt",
        startHour: 14,
        startMin: 0,
        status: "confirmed" as const,
        source: "ai_webchat" as const,
        customerNote: "Booked via AI Assistant",
      },
      {
        staffId: davidStaffId,
        customerName: "Виктор Костовски",
        serviceName: "Classic Scissor Cut",
        startHour: 16,
        startMin: 0,
        status: "confirmed" as const,
        source: "manual" as const,
        customerNote: "Regular scissor trim",
      },

      // Ana
      {
        staffId: anaStaffId,
        customerName: "Марија Трајковска",
        serviceName: "Hair Dye & Color",
        startHour: 10,
        startMin: 0,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Full color touch-up",
      },
      {
        staffId: anaStaffId,
        customerName: "Елена Николовска",
        serviceName: "Hair Wash & Blowout",
        startHour: 11,
        startMin: 30,
        status: "confirmed" as const,
        source: "web" as const,
        customerNote: "Wash and blowout styling",
      },
      {
        staffId: anaStaffId,
        customerName: "Ивана Стојановска",
        serviceName: "Hair Dye + Wash & Style",
        startHour: 14,
        startMin: 0,
        status: "confirmed" as const,
        source: "ai_webchat" as const,
        customerNote: "Booked via AI webchat",
      },
    ];

    for (const apt of tomorrowAppointments) {
      const customer = customerMap.get(apt.customerName);
      const service = serviceMap.get(apt.serviceName);
      if (!customer || !service) continue;

      const startAt = Date.UTC(tYear, tMonth, tDay, apt.startHour, apt.startMin);
      const endAt = startAt + service.durationMins * 60 * 1000;

      await ctx.db.insert("bookings", {
        orgId,
        staffId: apt.staffId,
        serviceId: service._id,
        customerId: customer._id,
        startAt,
        endAt,
        priceMinorUnits: service.priceMinorUnits,
        currency: "MKD",
        surgePriceApplied: false,
        status: apt.status,
        source: apt.source,
        customerNote: apt.customerNote,
        isDeleted: false,
        createdAt: now - 2 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      totalBookingsCount += 1;
    }

    // 10. Audit Log
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "staff",
      actorId: davidStaffId,
      action: "development.barbershop_staff_and_bookings_seeded",
      resourceType: "bookings",
      resourceId: davidStaffId,
      after: {
        staffMembers: ["David", "Ana"],
        todayBookingsCount,
        totalBookingsCount,
      },
      createdAt: now,
    });

    return {
      orgId,
      davidStaffId,
      anaStaffId,
      servicesCount: serviceMap.size,
      todayBookingsCount,
      totalBookingsCount,
    };
  },
});

export const getDevOverview = mutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("orgs").collect();
    const staff = await ctx.db.query("staff_members").collect();
    const services = await ctx.db.query("services").collect();
    const bookings = await ctx.db.query("bookings").collect();
    const customers = await ctx.db.query("customers").collect();

    return {
      orgs: orgs.map(o => ({ _id: o._id, name: o.name, slug: o.slug })),
      staff: staff.map(s => ({ _id: s._id, displayName: s.displayName, role: s.role })),
      services: services.map(s => ({ _id: s._id, name: s.name, durationMins: s.durationMins, price: s.priceMinorUnits, staffIds: s.staffIds })),
      bookings: bookings.map(b => {
        const c = customers.find(c => c._id === b.customerId);
        const s = services.find(s => s._id === b.serviceId);
        const st = staff.find(st => st._id === b.staffId);
        return {
          _id: b._id,
          staff: st?.displayName,
          customer: c?.name,
          service: s?.name,
          startAt: new Date(b.startAt).toISOString(),
          status: b.status,
          source: b.source,
          price: b.priceMinorUnits,
        };
      }),
    };
  },
});





