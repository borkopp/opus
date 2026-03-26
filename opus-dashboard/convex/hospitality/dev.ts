import { mutation } from "../_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// Hospitality Dev — Seed & Clear mock reservations + customers
//
// Seeds data against the org's EXISTING tables and floor plan.
// Does NOT create tables or floor plans — those are built by the user
// via the floor plan editor.
// ─────────────────────────────────────────────────────────────────────────────

export const seedHospitalityMockData = mutation({
  args: {
    orgId: v.id("orgs"),
    targetDateMs: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, targetDateMs } = args;
    const DAY_MS = 24 * 60 * 60 * 1000;

    // 1. Find the active floor plan
    const floorPlan = await ctx.db
      .query("floor_plans")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", orgId).eq("isActive", true),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (!floorPlan) {
      throw new Error(
        "No active floor plan. Create a floor plan first via the Floor Plan editor.",
      );
    }

    // 2. Get all active tables
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_floor_plan", (q) => q.eq("floorPlanId", floorPlan._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "inactive"),
        ),
      )
      .collect();

    if (tables.length === 0) {
      throw new Error(
        "No active tables on the floor plan. Add tables via the Floor Plan editor.",
      );
    }

    // 3. Generate mock customers
    const customerNames = [
      "Emma Thompson", "James Wilson", "Sophia Garcia", "Oliver Martin",
      "Isabella Brown", "Liam Davis", "Ava Martinez", "Noah Taylor",
      "Mia Anderson", "Lucas Rodriguez", "Charlotte Lee", "Mason Walker",
    ];

    const customerIds: string[] = [];
    for (const name of customerNames) {
      const isRisky = Math.random() > 0.8;
      const id = await ctx.db.insert("customers", {
        orgId,
        name: name + " (Mock)",
        totalVisits: Math.floor(Math.random() * 15) + 1,
        totalSpendMinorUnits: Math.floor(Math.random() * 30000) + 5000,
        noShowCount: isRisky ? Math.floor(Math.random() * 3) + 1 : 0,
        noShowRiskScore: isRisky ? 0.7 + Math.random() * 0.3 : Math.random() * 0.2,
        requiresFullDeposit: isRisky,
        whatsappOptIn: Math.random() > 0.3,
        marketingOptIn: Math.random() > 0.5,
        isDeleted: false,
        createdAt: targetDateMs - Math.random() * 90 * DAY_MS,
        updatedAt: Date.now(),
      });
      customerIds.push(id);
    }

    // 4. Generate reservations over -2 to +2 days
    const occasions = ["birthday", "anniversary", "business", "date", "other"] as const;
    let totalReservations = 0;

    for (let dayOffset = -2; dayOffset <= 2; dayOffset++) {
      const dayBase = new Date(targetDateMs + dayOffset * DAY_MS);
      const isPast = dayOffset < 0;
      const isToday = dayOffset === 0;

      // 6–10 reservations per day, spread across tables
      const count = Math.floor(Math.random() * 5) + 6;

      for (let i = 0; i < count; i++) {
        const table = tables[Math.floor(Math.random() * tables.length)];
        const customer = customerIds[Math.floor(Math.random() * customerIds.length)];

        // Spread across lunch (12–14) and dinner (18–22) service
        const isLunch = Math.random() > 0.4;
        const hourBase = isLunch
          ? 12 + Math.floor(Math.random() * 2)
          : 18 + Math.floor(Math.random() * 4);
        const minuteOffset = Math.random() > 0.5 ? 30 : 0;

        const startDate = new Date(dayBase);
        startDate.setHours(hourBase, minuteOffset, 0, 0);
        const startAt = startDate.getTime();

        const durationMins = Math.random() > 0.5 ? 90 : 60;
        const endAt = startAt + durationMins * 60 * 1000;
        const partySize = Math.min(
          table.capacity,
          Math.max(table.minCapacity ?? 1, Math.floor(Math.random() * 4) + 1),
        );

        // Determine status based on temporal position
        let status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
        if (isPast) {
          const r = Math.random();
          status = r > 0.15 ? "completed" : r > 0.05 ? "cancelled" : "no_show";
        } else if (isToday) {
          const nowMs = Date.now();
          if (endAt < nowMs) {
            status = "completed";
          } else if (startAt <= nowMs) {
            status = "seated";
          } else {
            status = "confirmed";
          }
        } else {
          status = Math.random() > 0.1 ? "confirmed" : "pending";
        }

        const hasOccasion = Math.random() > 0.7;

        await ctx.db.insert("reservations", {
          orgId,
          floorPlanId: floorPlan._id,
          tableId: table._id,
          customerId: customer as any,
          startAt,
          durationMins,
          endAt,
          partySize,
          specialRequests:
            Math.random() > 0.7
              ? ["Window seat preferred", "Nut allergy", "Highchair needed", "Quiet table please"][
                  Math.floor(Math.random() * 4)
                ]
              : undefined,
          occasion: hasOccasion
            ? occasions[Math.floor(Math.random() * occasions.length)]
            : undefined,
          status,
          source: Math.random() > 0.6 ? "web" : Math.random() > 0.3 ? "manual" : "phone",
          autoAssigned: true,
          assignmentScore: 0.8 + Math.random() * 0.2,
          isDeleted: false,
          createdAt: startAt - Math.random() * 3 * DAY_MS,
          updatedAt: Date.now(),
        });

        // Update table status for today's current reservations
        if (isToday && status === "seated") {
          await ctx.db.patch(table._id, { status: "occupied", updatedAt: Date.now() });
        } else if (isToday && status === "confirmed" && startAt > Date.now()) {
          // Only mark reserved if not already occupied
          const current = await ctx.db.get(table._id);
          if (current && current.status === "available") {
            await ctx.db.patch(table._id, { status: "reserved", updatedAt: Date.now() });
          }
        }

        totalReservations++;
      }
    }

    // 5. AI conversations (reuse same customer pool)
    const convoCount = Math.floor(Math.random() * 10) + 15;
    for (let i = 0; i < convoCount; i++) {
      const statusRand = Math.random();
      await ctx.db.insert("ai_conversations", {
        orgId,
        customerId: customerIds[Math.floor(Math.random() * customerIds.length)] as any,
        channel: Math.random() > 0.5 ? "whatsapp" : "webchat",
        channelThreadId: "mock_hosp_thread_" + i,
        status: statusRand > 0.85 ? "handed_off" : "resolved",
        totalInputTokens: Math.floor(Math.random() * 1500) + 200,
        totalOutputTokens: Math.floor(Math.random() * 1500) + 200,
        bookingIds: [],
        createdAt: targetDateMs - Math.random() * 20 * DAY_MS,
        updatedAt: Date.now(),
      });
    }

    return {
      totalCustomers: customerIds.length,
      totalReservations,
      totalConversations: convoCount,
    };
  },
});

export const clearHospitalityMockData = mutation({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const { orgId } = args;

    // 1. Find mock customers (name ends with "(Mock)")
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    let deletedCustomers = 0;
    const mockCustomerIds = new Set<string>();

    for (const c of customers) {
      if (c.name.includes("(Mock)")) {
        await ctx.db.patch(c._id, { isDeleted: true, deletedAt: Date.now() });
        deletedCustomers++;
        mockCustomerIds.add(c._id);
      }
    }

    // 2. Soft-delete reservations linked to mock customers
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    let deletedReservations = 0;
    for (const r of reservations) {
      if (mockCustomerIds.has(r.customerId)) {
        await ctx.db.patch(r._id, { isDeleted: true, deletedAt: Date.now() });
        deletedReservations++;
      }
    }

    // 3. Reset all tables to "available"
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    for (const t of tables) {
      if (t.status !== "available" && t.status !== "inactive") {
        await ctx.db.patch(t._id, { status: "available", updatedAt: Date.now() });
      }
    }

    // 4. Delete mock AI conversations
    const convos = await ctx.db
      .query("ai_conversations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    let deletedConvos = 0;
    for (const c of convos) {
      if (c.channelThreadId.startsWith("mock_hosp_thread_")) {
        await ctx.db.delete(c._id);
        deletedConvos++;
      }
    }

    return { deletedCustomers, deletedReservations, deletedConvos };
  },
});
