import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireRole } from "../lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Hospitality Onboarding — Bootstrap seed data for new hospitality orgs
// ─────────────────────────────────────────────────────────────────────────────

export const bootstrapHospitalityOrg = mutation({
  args: {
    orgId: v.id("orgs"),
  },
  returns: v.object({ floorPlanId: v.id("floor_plans") }),
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "owner");

    // Verify org exists and is hospitality
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) {
      throw new Error("Org not found.");
    }

    // Check if already bootstrapped (floor plan exists)
    const existingFloorPlan = await ctx.db
      .query("floor_plans")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existingFloorPlan) {
      return { floorPlanId: existingFloorPlan._id };
    }

    const now = Date.now();

    // 1. Create default floor plan
    const floorPlanId = await ctx.db.insert("floor_plans", {
      orgId: args.orgId,
      name: "Main Floor",
      canvasWidth: 1200,
      canvasHeight: 800,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create default reservation settings
    await ctx.db.insert("reservation_settings", {
      orgId: args.orgId,
      bookingWindowDays: 60,
      minAdvanceBookingHours: 1,
      minPartySize: 1,
      maxPartySize: 20,
      defaultDurationMins: 90,
      minDurationMins: 60,
      maxDurationMins: 240,
      slotIntervalMins: 30,
      walkInsAccepted: true,
      walkInBufferMins: 0,
      depositRequired: false,
      reminderHoursBefore: [24, 2],
      updatedAt: now,
    });

    // 3. Audit log
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "hospitality.bootstrapped",
      resourceType: "floor_plans",
      resourceId: floorPlanId,
      after: {
        floorPlanName: "Main Floor",
        defaultDurationMins: 90,
        slotIntervalMins: 30,
      },
      createdAt: now,
    });

    return { floorPlanId };
  },
});
