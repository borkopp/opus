import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  APP_REVIEW_EMAIL,
  APP_REVIEW_SLUG,
  appReviewBindings,
  appReviewOtp,
} from "./lib/appReview";
import { wallClockNow } from "./lib/bookingTime";

/** Operator-only: never public and never attaches to an existing studio/account. */
export const provision = internalMutation({
  args: {},
  returns: v.object({
    orgId: v.id("orgs"),
    userId: v.id("users"),
    authUserId: v.string(),
  }),
  handler: async (ctx) => {
    if (process.env.APP_REVIEW_ENABLED === "true")
      throw new ConvexError("Disable review access before provisioning.");
    if (process.env.APP_REVIEW_EMAIL?.trim().toLowerCase() !== APP_REVIEW_EMAIL)
      throw new ConvexError("Configure the reserved review email first.");
    const bindings = appReviewBindings();
    if (bindings.orgId || bindings.userId || bindings.authUserId)
      throw new ConvexError(
        "Review bindings already exist. Inspect them instead of provisioning again.",
      );
    const existingAuth = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "email", value: APP_REVIEW_EMAIL }],
      },
    );
    const [users, consumers, orgs] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", APP_REVIEW_EMAIL))
        .collect(),
      ctx.db
        .query("opus_users")
        .withIndex("by_email", (q) => q.eq("email", APP_REVIEW_EMAIL))
        .collect(),
      ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", APP_REVIEW_SLUG))
        .collect(),
    ]);
    if (existingAuth || users.length || consumers.length || orgs.length)
      throw new ConvexError(
        "The reserved review fixture already exists. No accounts were linked.",
      );
    const now = Date.now();
    const authUser = await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "user",
          data: {
            email: APP_REVIEW_EMAIL,
            emailVerified: true,
            name: "App Review",
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    );
    const userId = await ctx.db.insert("users", {
      authUserId: authUser._id,
      email: APP_REVIEW_EMAIL,
      name: "App Review",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const orgId = await ctx.db.insert("orgs", {
      name: "OPUS Review Studio",
      slug: APP_REVIEW_SLUG,
      ownerNameConfirmed: true,
      industry: "beauty_wellness",
      beautyCategory: "beauty_salon",
      plan: "paid",
      address: "Demonstration studio",
      city: "Skopje",
      country: "MK",
      listingStatus: "unpublished",
      websiteStatus: "unpublished",
      reviewCount: 0,
      averageRating: 0,
      source: "customer",
      openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        open: "09:00",
        close: "18:00",
        isClosed: false,
      })),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeOrgId: orgId });
    const staffId = await ctx.db.insert("staff_members", {
      orgId,
      userId,
      displayName: "Demo Artist",
      specialties: ["Beauty"],
      role: "owner",
      bookingAccess: "team",
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("org_settings", {
      orgId,
      timezone: "Europe/Skopje",
      currency: "MKD",
      locale: "en",
      slotDurationMins: 15,
      quickBookingDurationMins: 30,
      bookingWindowDays: 60,
      cancellationWindowHours: 24,
      bufferTimeMins: 0,
      surgePricingEnabled: false,
      reminderHoursBefore: [],
      smsEnabled: false,
      emailEnabled: false,
      whatsappEnabled: false,
      staffNewBookingEmailEnabled: false,
      staffReminderEmailEnabled: false,
      staffReminderHoursBefore: [],
      staffEmailRecipientUserIds: [],
      aiEnabled: false,
      aiInstagramEnabled: false,
      aiWebchatEnabled: false,
      aiPersonaName: "Assistant",
      aiConfidenceThreshold: 0.7,
      gapOptimizerEnabled: false,
      updatedAt: now,
    });
    const serviceId = await ctx.db.insert("services", {
      orgId,
      name: "Demo beauty appointment",
      durationMins: 30,
      priceMinorUnits: 100000,
      currency: "MKD",
      staffIds: [staffId],
      isOpusVisible: false,
      popularityScore: 0,
      sortOrder: 0,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++)
      await ctx.db.insert("availability_rules", {
        orgId,
        staffId,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        breaks: [],
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    // Fictional records have no deliverable email/phone and never represent real clients.
    const customerId = await ctx.db.insert("customers", {
      orgId,
      name: "Demo Client",
      totalVisits: 0,
      totalSpendMinorUnits: 0,
      noShowCount: 0,
      noShowRiskScore: 0,
      whatsappOptIn: false,
      marketingOptIn: false,
      gapRecoveryEmailOptIn: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    const startAt = wallClockNow("Europe/Skopje", now);
    const day = Math.floor(startAt / 86_400_000) * 86_400_000;
    for (const [offset, hour] of [
      [0, 15],
      [1, 10],
      [2, 13],
    ])
      await ctx.db.insert("bookings", {
        orgId,
        staffId,
        serviceId,
        customerId,
        startAt: day + offset * 86_400_000 + hour * 3_600_000,
        endAt: day + offset * 86_400_000 + hour * 3_600_000 + 1_800_000,
        priceMinorUnits: 100000,
        currency: "MKD",
        surgePriceApplied: false,
        status: "confirmed",
        source: "manual",
        staffNote: "Fictional App Review appointment",
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "system",
      action: "app_review.provisioned",
      resourceType: "orgs",
      resourceId: orgId,
      after: { userId, staffId, fictionalData: true },
      createdAt: now,
    });
    return { orgId, userId, authUserId: authUser._id };
  },
});

/** Auth proxy checks these exact bindings before accepting a review OTP request. */
export const signInAvailable = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    if (!appReviewOtp()) return false;
    const bindings = appReviewBindings();
    const orgId = ctx.db.normalizeId("orgs", bindings.orgId!);
    const userId = ctx.db.normalizeId("users", bindings.userId!);
    if (!orgId || !userId) return false;
    const [org, user, authUser] = await Promise.all([
      ctx.db.get(orgId),
      ctx.db.get(userId),
      ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: bindings.authUserId! }],
      }),
    ]);
    if (
      !org ||
      org.isDeleted ||
      org.slug !== APP_REVIEW_SLUG ||
      org.industry !== "beauty_wellness" ||
      org.listingStatus !== "unpublished" ||
      org.websiteStatus !== "unpublished" ||
      !user ||
      user.isDeleted ||
      user.activeOrgId !== orgId ||
      user.email !== APP_REVIEW_EMAIL ||
      user.authUserId !== bindings.authUserId ||
      !authUser ||
      authUser.email !== APP_REVIEW_EMAIL ||
      !authUser.emailVerified
    )
      return false;
    const staff = await ctx.db
      .query("staff_members")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", orgId).eq("userId", userId),
      )
      .collect();
    return staff.some(
      (member) =>
        !member.isDeleted && member.isActive && member.role === "owner",
    );
  },
});
