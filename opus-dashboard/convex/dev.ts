import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedMockData = mutation({
  args: {
    orgId: v.id("orgs"),
    targetDateMs: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, targetDateMs } = args;
    const DAY_MS = 24 * 60 * 60 * 1000;

    // 1. Ensure we have at least 1 staff member and 1 service to link bookings
    let staffMembers = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (staffMembers.length === 0) {
      const staffId = await ctx.db.insert("staff_members", {
        orgId,
        displayName: "John Barber (Mock)",
        specialties: ["Fades", "Beard trims"],
        role: "manager",
        isActive: true,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      staffMembers = [await ctx.db.get(staffId) as any];
    }

    let services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (services.length === 0) {
      const serviceId = await ctx.db.insert("services", {
        orgId,
        name: "Mock Haircut",
        durationMins: 30,
        priceMinorUnits: 1500, // 1500 MKD
        currency: "MKD",
        staffIds: [staffMembers[0]._id],
        isOpusVisible: true,
        popularityScore: 0,
        isActive: true,
        isDeleted: false,
        sortOrder: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      services = [await ctx.db.get(serviceId) as any];
    }

    // 2. Generate Customers
    const customers = [];
    const customerNames = ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Ethan Hunt", "Fiona Gallagher", "George Costanza", "Hannah Abbott", "Ian Malcolm", "Jane Doe"];
    
    for (const name of customerNames) {
      const isRisky = Math.random() > 0.7; // ~30% risk customers
      const customerId = await ctx.db.insert("customers", {
        orgId,
        name: name + " (Mock)",
        totalVisits: Math.floor(Math.random() * 10) + 1,
        totalSpendMinorUnits: Math.floor(Math.random() * 20000) + 2500,
        noShowCount: isRisky ? 2 : 0,
        noShowRiskScore: isRisky ? 0.8 : 0.1,
        requiresFullDeposit: isRisky,
        whatsappOptIn: true,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: targetDateMs - (Math.random() * 60 * DAY_MS), // Created 0-60 days ago
        updatedAt: Date.now(),
      });
      customers.push(customerId);
    }

    // 3. Generate Bookings (-3 days to +3 days)
    const bookingIds = [];
    for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
      const isPast = dayOffset < 0;
      const baseTimeMs = targetDateMs + (dayOffset * DAY_MS);

      // Create 3-5 bookings per day
      const dailyBookingsCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < dailyBookingsCount; i++) {
        const hourOffset = Math.floor(Math.random() * 8) + 9; // 9am to 4pm
        const startAt = new Date(baseTimeMs).setHours(hourOffset, 0, 0, 0);
        const service = services[Math.floor(Math.random() * services.length)];
        const staff = staffMembers[Math.floor(Math.random() * staffMembers.length)];
        const customerId = customers[Math.floor(Math.random() * customers.length)];
        
        let status: any = "confirmed";
        if (isPast) {
          status = Math.random() > 0.1 ? "completed" : "cancelled";
        } else if (dayOffset === 0) {
          // Today: Mix of completed, confirmed
          status = Math.random() > 0.3 ? "completed" : "confirmed";
        }

        const bId = await ctx.db.insert("bookings", {
          orgId,
          customerId,
          staffId: staff._id,
          serviceId: service._id,
          startAt,
          endAt: startAt + (service.durationMins * 60 * 1000),
          priceMinorUnits: service.priceMinorUnits,
          currency: service.currency,
          surgePriceApplied: false,
          status,
          source: "web",
          isDeleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        if (status === "completed" || status === "confirmed") {
          bookingIds.push(bId);
        }
      }
    }

    // 4. Generate AI Conversations (Current Month)
    for (let i = 0; i < 40; i++) {
      const statusRandom = Math.random();
      const status: any = statusRandom > 0.85 ? "handed_off" : "resolved";
      const hasBooking = status === "resolved" && Math.random() > 0.5;
      
      const convId = await ctx.db.insert("ai_conversations", {
        orgId,
        customerId: customers[Math.floor(Math.random() * customers.length)],
        channel: "whatsapp",
        channelThreadId: "mock_thread_" + i,
        status,
        totalInputTokens: Math.floor(Math.random() * 1000) + 100,
        totalOutputTokens: Math.floor(Math.random() * 1000) + 100,
        bookingIds: hasBooking ? [bookingIds[Math.floor(Math.random() * bookingIds.length)]] : [],
        createdAt: targetDateMs - (Math.random() * 15 * DAY_MS), // Past 15 days
        updatedAt: Date.now(),
      });

      // Insert minimal messages for realistic stat? Not necessary unless messages specifically queried.
      // But rules say we strictly log AI actions. For mock stats, `dashboard.ts` only looks at `ai_conversations`.
    }

    return { totalCustomers: customers.length, totalBookings: bookingIds.length, totalConversations: 40 };
  }
});

export const clearMockData = mutation({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const { orgId } = args;

    // 1. Soft delete Mock Customers
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
    
    let deletedCustomersCount = 0;
    const mockCustomerIds = new Set<string>();

    for (const c of customers) {
      if (c.name.includes("(Mock)")) {
        await ctx.db.patch(c._id, { isDeleted: true, deletedAt: Date.now() });
        deletedCustomersCount++;
        mockCustomerIds.add(c._id);
      }
    }

    // 2. Soft delete Mock Bookings
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    let deletedBookingsCount = 0;
    for (const b of bookings) {
      if (mockCustomerIds.has(b.customerId)) {
        await ctx.db.patch(b._id, { isDeleted: true, deletedAt: Date.now() });
        deletedBookingsCount++;
      }
    }

    // 3. Hard delete Mock AI Conversations (they don't have isDeleted in schema)
    const convos = await ctx.db
      .query("ai_conversations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    let deletedConvosCount = 0;
    for (const c of convos) {
      if (c.channelThreadId.startsWith("mock_thread_")) {
        await ctx.db.delete(c._id);
        deletedConvosCount++;
      }
    }

    // 4. Soft delete Mock Staff Members
    const staffMembers = await ctx.db
      .query("staff_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    let deletedStaffCount = 0;
    for (const s of staffMembers) {
      if (s.displayName.includes("(Mock)")) {
        await ctx.db.patch(s._id, { isDeleted: true, deletedAt: Date.now() });
        deletedStaffCount++;
      }
    }

    // 5. Soft delete Mock Services
    const services = await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    let deletedServicesCount = 0;
    for (const s of services) {
      if (s.name.includes("Mock")) {
        await ctx.db.patch(s._id, { isDeleted: true, deletedAt: Date.now() });
        deletedServicesCount++;
      }
    }

    return { 
      deletedCustomersCount, 
      deletedBookingsCount, 
      deletedConvosCount, 
      deletedStaffCount, 
      deletedServicesCount 
    };
  }
});
