import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";
import { internal } from "./_generated/api";
import {
  canonicalLocale,
  operationalSettingsError,
  supportedCurrency,
} from "./lib/orgSettingsValidation";
import {
  normalizeReminderHours,
  reminderHoursValidationError,
  resolveStaffEmailRecipients,
} from "./lib/bookingEmailNotifications";

export const getOrgSettings = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.orgId);
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) return null;

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const media = await ctx.db
      .query("org_media")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isDeleted", false),
      )
      .collect();

    const emailRecipients = settings
      ? await resolveStaffEmailRecipients(ctx, args.orgId)
      : [];

    return {
      org,
      settings,
      media: media.sort((a, b) => a.sortOrder - b.sortOrder),
      emailRecipients,
    };
  },
});

export const updateOrgSettings = mutation({
  args: {
    orgId: v.id("orgs"),
    timezone: v.string(),
    currency: v.string(),
    locale: v.string(),
    slotDurationMins: v.number(),
    bookingWindowDays: v.number(),
    cancellationWindowHours: v.number(),
    bufferTimeMins: v.number(),
  },
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "owner");

    const updates = {
      timezone: args.timezone.trim(),
      currency: supportedCurrency(args.currency) ?? args.currency.trim(),
      locale: canonicalLocale(args.locale) ?? args.locale.trim(),
      slotDurationMins: args.slotDurationMins,
      bookingWindowDays: args.bookingWindowDays,
      cancellationWindowHours: args.cancellationWindowHours,
      bufferTimeMins: args.bufferTimeMins,
      updatedAt: Date.now(),
    };
    const validationError = operationalSettingsError(updates);
    if (validationError) throw new ConvexError(validationError);

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) throw new Error("Settings not found");

    await ctx.db.patch(settings._id, updates);
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org_settings.operational_updated",
      resourceType: "org_settings",
      resourceId: settings._id,
      before: {
        timezone: settings.timezone,
        currency: settings.currency,
        locale: settings.locale,
        slotDurationMins: settings.slotDurationMins,
        bookingWindowDays: settings.bookingWindowDays,
        cancellationWindowHours: settings.cancellationWindowHours,
        bufferTimeMins: settings.bufferTimeMins,
      },
      after: updates,
      createdAt: updates.updatedAt,
    });

    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });
    return true;
  },
});

export const updateSurgePricingRules = mutation({
  args: {
    orgId: v.id("orgs"),
    surgePricingEnabled: v.boolean(),
    surgeRules: v.optional(
      v.array(
        v.object({
          dayOfWeek: v.number(),
          startTime: v.string(),
          endTime: v.string(),
          multiplierPct: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) throw new Error("Settings not found");

    await ctx.db.patch(settings._id, {
      surgePricingEnabled: args.surgePricingEnabled,
      surgeRules: args.surgeRules,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const updateNotificationSettings = mutation({
  args: {
    orgId: v.id("orgs"),
    smsEnabled: v.boolean(),
    emailEnabled: v.boolean(),
    whatsappEnabled: v.boolean(),
    reminderHoursBefore: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) throw new Error("Settings not found");

    await ctx.db.patch(settings._id, {
      smsEnabled: args.smsEnabled,
      emailEnabled: args.emailEnabled,
      whatsappEnabled: args.whatsappEnabled,
      reminderHoursBefore: args.reminderHoursBefore,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const updateEmailNotificationSettings = mutation({
  args: {
    orgId: v.id("orgs"),
    customerReminderEmailEnabled: v.boolean(),
    customerReminderHoursBefore: v.array(v.number()),
    staffNewBookingEmailEnabled: v.boolean(),
    staffReminderEmailEnabled: v.boolean(),
    staffReminderHoursBefore: v.array(v.number()),
    staffEmailRecipientUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { staffMember } = await requireRole(ctx, args.orgId, "owner");
    const customerReminderError = reminderHoursValidationError(
      args.customerReminderHoursBefore,
    );
    if (customerReminderError) throw new ConvexError(customerReminderError);
    const staffReminderError = reminderHoursValidationError(
      args.staffReminderHoursBefore,
    );
    if (staffReminderError) throw new ConvexError(staffReminderError);
    if (
      args.customerReminderEmailEnabled &&
      args.customerReminderHoursBefore.length === 0
    ) {
      throw new ConvexError("Choose at least one client reminder time.");
    }
    if (
      args.staffReminderEmailEnabled &&
      args.staffReminderHoursBefore.length === 0
    ) {
      throw new ConvexError("Choose at least one team reminder time.");
    }

    const recipientUserIds = Array.from(
      new Set(args.staffEmailRecipientUserIds),
    );
    const availableRecipients = await resolveStaffEmailRecipients(
      ctx,
      args.orgId,
    );
    const availableUserIds = new Set(
      availableRecipients.map((recipient) => recipient.userId),
    );
    if (recipientUserIds.some((userId) => !availableUserIds.has(userId))) {
      throw new ConvexError(
        "One or more email recipients no longer have dashboard access.",
      );
    }
    if (
      (args.staffNewBookingEmailEnabled || args.staffReminderEmailEnabled) &&
      recipientUserIds.length === 0
    ) {
      throw new ConvexError("Choose at least one team email recipient.");
    }

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (query) => query.eq("orgId", args.orgId))
      .first();
    if (!settings) throw new Error("Settings not found");

    const updatedAt = Date.now();
    const updates = {
      emailEnabled: args.customerReminderEmailEnabled,
      reminderHoursBefore: normalizeReminderHours(
        args.customerReminderHoursBefore,
      ),
      staffNewBookingEmailEnabled: args.staffNewBookingEmailEnabled,
      staffReminderEmailEnabled: args.staffReminderEmailEnabled,
      staffReminderHoursBefore: normalizeReminderHours(
        args.staffReminderHoursBefore,
      ),
      staffEmailRecipientUserIds: recipientUserIds,
      updatedAt,
    };
    await ctx.db.patch(settings._id, updates);
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      actorId: staffMember._id,
      action: "org_settings.email_notifications_updated",
      resourceType: "org_settings",
      resourceId: settings._id,
      before: {
        emailEnabled: settings.emailEnabled,
        reminderHoursBefore: settings.reminderHoursBefore,
        staffNewBookingEmailEnabled: settings.staffNewBookingEmailEnabled,
        staffReminderEmailEnabled: settings.staffReminderEmailEnabled,
        staffReminderHoursBefore: settings.staffReminderHoursBefore,
        staffEmailRecipientUserIds: settings.staffEmailRecipientUserIds,
      },
      after: updates,
      createdAt: updatedAt,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.reconcileBookingRemindersForOrg,
      { orgId: args.orgId },
    );
    return true;
  },
});

export const updateGapOptimizerSettings = mutation({
  args: {
    orgId: v.id("orgs"),
    gapOptimizerEnabled: v.boolean(),
    gapOptimizerMinGapMins: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) throw new Error("Settings not found");

    await ctx.db.patch(settings._id, {
      gapOptimizerEnabled: args.gapOptimizerEnabled,
      gapOptimizerMinGapMins: args.gapOptimizerMinGapMins,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const updateDashboardNotificationSettings = mutation({
  args: {
    orgId: v.id("orgs"),
    dashboardNotificationsEnabled: v.boolean(),
    dashboardSoundEnabled: v.boolean(),
    dashboardToastEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) throw new Error("Settings not found");

    await ctx.db.patch(settings._id, {
      dashboardNotificationsEnabled: args.dashboardNotificationsEnabled,
      dashboardSoundEnabled: args.dashboardSoundEnabled,
      dashboardToastEnabled: args.dashboardToastEnabled,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const updateAiSettings = mutation({
  args: {
    orgId: v.id("orgs"),
    aiEnabled: v.boolean(),
    aiPersonaName: v.string(),
    aiConfidenceThreshold: v.number(),
    aiHandoffPhoneNumber: v.optional(v.string()),
    aiWebchatEnabled: v.optional(v.boolean()),
    aiInstagramEnabled: v.optional(v.boolean()),
    aiSystemPrompt: v.optional(v.string()),
    aiGreetingMessage: v.optional(v.string()),
    aiTone: v.optional(
      v.union(
        v.literal("friendly"),
        v.literal("professional"),
        v.literal("casual"),
        v.literal("formal"),
      ),
    ),
    aiWorkingHoursEnabled: v.optional(v.boolean()),
    aiWorkingHours: v.optional(
      v.array(
        v.object({
          dayOfWeek: v.number(),
          startTime: v.string(),
          endTime: v.string(),
        }),
      ),
    ),
    aiAwayMessage: v.optional(v.string()),
    aiLanguage: v.optional(
      v.union(v.literal("auto"), v.literal("en"), v.literal("mk")),
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!settings) throw new Error("Settings not found");

    await ctx.db.patch(settings._id, {
      aiEnabled: args.aiEnabled,
      aiPersonaName: args.aiPersonaName,
      aiConfidenceThreshold: args.aiConfidenceThreshold,
      aiHandoffPhoneNumber: args.aiHandoffPhoneNumber,
      aiWebchatEnabled: args.aiWebchatEnabled,
      aiInstagramEnabled: args.aiInstagramEnabled,
      aiSystemPrompt: args.aiSystemPrompt,
      aiGreetingMessage: args.aiGreetingMessage,
      aiTone: args.aiTone,
      aiWorkingHoursEnabled: args.aiWorkingHoursEnabled,
      aiWorkingHours: args.aiWorkingHours,
      aiAwayMessage: args.aiAwayMessage,
      aiLanguage: args.aiLanguage,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const getOrgSettingsInternal = internalQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

export const updateOrgBranding = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    tagline: v.optional(v.string()),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagramHandle: v.optional(v.string()),
    instagramPageId: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) throw new Error("Org not found");

    const now = Date.now();
    const updates = {
      name: args.name,
      logoUrl: args.logoUrl,
      tagline: args.tagline,
      bio: args.bio,
      phone: args.phone,
      instagramHandle: args.instagramHandle,
      instagramPageId: args.instagramPageId,
      websiteUrl: args.websiteUrl,
      updatedAt: now,
    };
    await ctx.db.patch(args.orgId, updates);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      action: "org.branding_updated",
      resourceType: "orgs",
      resourceId: args.orgId,
      before: {
        name: org.name,
        logoUrl: org.logoUrl,
        tagline: org.tagline,
        bio: org.bio,
        phone: org.phone,
      },
      after: updates,
      createdAt: now,
    });

    // Recompute website status — identity or location may have changed.
    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });

    return true;
  },
});

export const updateLogo = mutation({
  args: {
    orgId: v.id("orgs"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) throw new Error("Org not found");

    const logoUrl = await ctx.storage.getUrl(args.storageId);
    if (!logoUrl) throw new Error("Logo file not found in storage");

    await ctx.db.patch(args.orgId, {
      logoUrl,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });

    return logoUrl;
  },
});

export const updateLocation = mutation({
  args: {
    orgId: v.id("orgs"),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.orgId, "owner");

    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) throw new Error("Org not found");

    const now = Date.now();
    const updates = {
      address: args.address,
      city: args.city,
      neighborhood: args.neighborhood,
      postalCode: args.postalCode,
      country: args.country,
      coordinates: args.coordinates,
      updatedAt: now,
    };
    await ctx.db.patch(args.orgId, updates);

    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "staff",
      action: "org.location_updated",
      resourceType: "orgs",
      resourceId: args.orgId,
      before: {
        address: org.address,
        city: org.city,
        neighborhood: org.neighborhood,
        postalCode: org.postalCode,
        country: org.country,
        coordinates: org.coordinates,
      },
      after: updates,
      createdAt: now,
    });

    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: args.orgId,
    });

    return true;
  },
});
