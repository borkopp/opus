import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getBeautyActivationState } from "./lib/activation";
import { requireActiveOrg, requireRole, requireUser } from "./lib/auth";
import { buildPublicProfile } from "./lib/publicProfile";
import { allocateUniqueTenantSlug } from "./lib/tenantSlug";

const beautyCategory = v.union(
  v.literal("barbershop"),
  v.literal("hair_salon"),
  v.literal("nail_salon"),
  v.literal("spa"),
  v.literal("beauty_salon"),
  v.literal("lash_studio"),
  v.literal("brow_bar"),
  v.literal("tattoo_studio"),
  v.literal("massage_therapy"),
  v.literal("wellness_center"),
  v.literal("personal_trainer"),
);

const openingHour = v.object({
  dayOfWeek: v.number(),
  open: v.string(),
  close: v.string(),
  isClosed: v.boolean(),
});

function assertHours(
  hours: Array<{
    dayOfWeek: number;
    open: string;
    close: string;
    isClosed: boolean;
  }>,
) {
  if (
    hours.length !== 7 ||
    new Set(hours.map((day) => day.dayOfWeek)).size !== 7
  ) {
    throw new ConvexError("Opening hours must include every day of the week.");
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const day of hours) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new ConvexError("Opening hours contain an invalid day.");
    }
    if (!timePattern.test(day.open) || !timePattern.test(day.close)) {
      throw new ConvexError("Opening hours must use HH:mm time values.");
    }
    if (!day.isClosed && day.open >= day.close) {
      throw new ConvexError("Closing time must be after opening time.");
    }
  }
}

export const getState = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireActiveOrg(ctx);
    return await getBeautyActivationState(ctx, orgId);
  },
});

export const getPreview = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requireActiveOrg(ctx);
    return await buildPublicProfile(ctx, org);
  },
});

export const startBeautyBusiness = mutation({
  args: {
    name: v.string(),
    category: beautyCategory,
  },
  returns: v.id("orgs"),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const name = args.name.trim();
    if (name.length < 2) {
      throw new ConvexError("Business name must be at least 2 characters.");
    }

    if (user.activeOrgId) {
      const { org, staffMember } = await requireRole(
        ctx,
        user.activeOrgId,
        "owner",
      );
      if (org.industry !== "beauty_wellness") {
        throw new ConvexError("Hospitality onboarding is coming soon.");
      }

      const slug =
        org.websitePublishedAt || org.publishedAt
          ? org.slug
          : await allocateUniqueTenantSlug(ctx, name, org._id);
      const now = Date.now();
      await ctx.db.patch(org._id, {
        name,
        slug,
        beautyCategory: args.category,
        updatedAt: now,
      });
      await ctx.db.insert("audit_log", {
        orgId: org._id,
        actorType: "staff",
        actorId: staffMember._id,
        action: "activation.business_saved",
        resourceType: "orgs",
        resourceId: org._id,
        before: {
          name: org.name,
          slug: org.slug,
          beautyCategory: org.beautyCategory,
        },
        after: { name, slug, beautyCategory: args.category },
        createdAt: now,
      });
      await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
        orgId: org._id,
      });
      return org._id;
    }

    const now = Date.now();
    const slug = await allocateUniqueTenantSlug(ctx, name);
    const orgId = await ctx.db.insert("orgs", {
      name,
      slug,
      industry: "beauty_wellness",
      beautyCategory: args.category,
      plan: "starter",
      listingStatus: "unpublished",
      websiteStatus: "unpublished",
      reviewCount: 0,
      averageRating: 0,
      source: "customer",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("org_settings", {
      orgId,
      timezone: "Europe/Belgrade",
      currency: "MKD",
      locale: "mk-MK",
      slotDurationMins: 15,
      quickBookingDurationMins: 30,
      bookingWindowDays: 60,
      cancellationWindowHours: 24,
      bufferTimeMins: 0,
      surgePricingEnabled: false,
      reminderHoursBefore: [24, 2],
      smsEnabled: false,
      emailEnabled: true,
      whatsappEnabled: false,
      staffNewBookingEmailEnabled: true,
      staffReminderEmailEnabled: true,
      staffReminderHoursBefore: [24, 2],
      staffEmailRecipientUserIds: [user._id],
      aiEnabled: false,
      aiPersonaName: "Assistant",
      aiConfidenceThreshold: 0.7,
      gapOptimizerEnabled: false,
      gapOptimizerMinGapMins: 30,
      updatedAt: now,
    });

    const staffId = await ctx.db.insert("staff_members", {
      orgId,
      userId: user._id,
      displayName: user.name || "Owner",
      avatarUrl: user.avatarUrl,
      specialties: [],
      role: "owner",
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(user._id, { activeOrgId: orgId, updatedAt: now });
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "user",
      actorId: user._id,
      action: "org.created",
      resourceType: "orgs",
      resourceId: orgId,
      after: {
        name,
        slug,
        industry: "beauty_wellness",
        beautyCategory: args.category,
        ownerStaffId: staffId,
      },
      createdAt: now,
    });

    return orgId;
  },
});

export const saveLocation = mutation({
  args: {
    address: v.string(),
    city: v.string(),
    neighborhood: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.string(),
    coordinates: v.object({ lat: v.number(), lng: v.number() }),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "owner");
    const address = args.address.trim();
    const city = args.city.trim();
    const country = args.country.trim().toUpperCase();
    if (!address || !city || !country) {
      throw new ConvexError("Address, city, and country are required.");
    }
    if (
      Math.abs(args.coordinates.lat) > 90 ||
      Math.abs(args.coordinates.lng) > 180
    ) {
      throw new ConvexError("Map coordinates are invalid.");
    }

    const now = Date.now();
    const updates = {
      address,
      city,
      neighborhood: args.neighborhood?.trim() || undefined,
      postalCode: args.postalCode?.trim() || undefined,
      country,
      coordinates: args.coordinates,
      updatedAt: now,
    };
    await ctx.db.patch(org._id, updates);
    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "staff",
      actorId: staffMember._id,
      action: "activation.location_saved",
      resourceType: "orgs",
      resourceId: org._id,
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
      orgId: org._id,
    });
    return org._id;
  },
});

export const saveFirstService = mutation({
  args: {
    serviceId: v.optional(v.id("services")),
    name: v.string(),
    description: v.optional(v.string()),
    durationMins: v.number(),
    priceMinorUnits: v.number(),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "owner");
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .first();
    if (!settings) throw new ConvexError("Booking settings not found.");
    if (!args.name.trim()) throw new ConvexError("Service name is required.");
    if (
      !Number.isInteger(args.durationMins) ||
      args.durationMins <= 0 ||
      args.durationMins % settings.slotDurationMins !== 0
    ) {
      throw new ConvexError(
        `Duration must be a multiple of ${settings.slotDurationMins} minutes.`,
      );
    }
    if (!Number.isInteger(args.priceMinorUnits) || args.priceMinorUnits < 0) {
      throw new ConvexError("Price must be a non-negative integer.");
    }

    const now = Date.now();
    const existing = args.serviceId
      ? await ctx.db.get(args.serviceId)
      : await ctx.db
          .query("services")
          .withIndex("by_org_visible_active", (q) =>
            q
              .eq("orgId", org._id)
              .eq("isOpusVisible", true)
              .eq("isActive", true)
              .eq("isDeleted", false),
          )
          .first();

    if (existing && existing.orgId !== org._id) {
      throw new ConvexError("Service not found.");
    }

    const serviceFields = {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      consumerDescription: args.description?.trim() || undefined,
      durationMins: args.durationMins,
      priceMinorUnits: args.priceMinorUnits,
      currency: settings.currency,
      staffIds: [staffMember._id],
      isOpusVisible: true,
      isActive: true,
      isDeleted: false,
      updatedAt: now,
    };

    let serviceId: Id<"services">;
    if (existing) {
      serviceId = existing._id;
      await ctx.db.patch(existing._id, serviceFields);
    } else {
      serviceId = await ctx.db.insert("services", {
        orgId: org._id,
        ...serviceFields,
        popularityScore: 0,
        sortOrder: 0,
        createdAt: now,
      });
    }

    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "staff",
      actorId: staffMember._id,
      action: existing
        ? "activation.first_service_updated"
        : "activation.first_service_created",
      resourceType: "services",
      resourceId: serviceId,
      before: existing ?? undefined,
      after: serviceFields,
      createdAt: now,
    });
    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: org._id,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.marketplace.embeddings.embedEntity,
      { entityType: "service", entityId: serviceId },
    );
    return serviceId;
  },
});

export const saveHours = mutation({
  args: { openingHours: v.array(openingHour) },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "owner");
    assertHours(args.openingHours);
    const now = Date.now();

    await ctx.db.patch(org._id, {
      openingHours: args.openingHours,
      updatedAt: now,
    });

    for (const day of args.openingHours) {
      const availabilityDay = (day.dayOfWeek + 1) % 7;
      const existing = await ctx.db
        .query("availability_rules")
        .withIndex("by_staff_day", (q) =>
          q.eq("staffId", staffMember._id).eq("dayOfWeek", availabilityDay),
        )
        .first();
      const fields = {
        orgId: org._id,
        staffId: staffMember._id,
        dayOfWeek: availabilityDay,
        startTime: day.open,
        endTime: day.close,
        isActive: !day.isClosed,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, fields);
      } else {
        await ctx.db.insert("availability_rules", {
          ...fields,
          createdAt: now,
        });
      }
    }

    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "staff",
      actorId: staffMember._id,
      action: "activation.hours_saved",
      resourceType: "orgs",
      resourceId: org._id,
      before: { openingHours: org.openingHours },
      after: { openingHours: args.openingHours },
      createdAt: now,
    });
    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: org._id,
    });
    return org._id;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireActiveOrg(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveStorefront = mutation({
  args: {
    tagline: v.optional(v.string()),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    coverStorageId: v.optional(v.id("_storage")),
    galleryStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const { org, staffMember } = await requireRole(ctx, undefined, "owner");
    const now = Date.now();
    const logoUrl = args.logoStorageId
      ? await ctx.storage.getUrl(args.logoStorageId)
      : org.logoUrl;
    if (args.logoStorageId && !logoUrl) {
      throw new ConvexError("Logo upload could not be found.");
    }

    await ctx.db.patch(org._id, {
      tagline: args.tagline?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      logoUrl: logoUrl || undefined,
      updatedAt: now,
    });

    if (args.coverStorageId) {
      const coverUrl = await ctx.storage.getUrl(args.coverStorageId);
      if (!coverUrl) throw new ConvexError("Cover upload could not be found.");
      const covers = await ctx.db
        .query("org_media")
        .withIndex("by_org_type_active", (q) =>
          q.eq("orgId", org._id).eq("type", "cover").eq("isDeleted", false),
        )
        .collect();
      for (const cover of covers) {
        if (cover.url !== coverUrl) {
          await ctx.db.patch(cover._id, {
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          });
        }
      }
      if (!covers.some((cover) => cover.url === coverUrl)) {
        await ctx.db.insert("org_media", {
          orgId: org._id,
          url: coverUrl,
          type: "cover",
          sortOrder: 0,
          isDeleted: false,
          uploadedAt: now,
          updatedAt: now,
        });
      }
    }

    for (const [index, storageId] of (args.galleryStorageIds ?? []).entries()) {
      const existing = await ctx.db
        .query("org_media")
        .withIndex("by_org_type_active", (q) =>
          q.eq("orgId", org._id).eq("type", "gallery").eq("isDeleted", false),
        )
        .collect();
      if (existing.length >= 3) break;

      const url = await ctx.storage.getUrl(storageId);
      if (!url) throw new ConvexError("Gallery upload could not be found.");
      if (
        !existing.some((item) => item.type === "gallery" && item.url === url)
      ) {
        await ctx.db.insert("org_media", {
          orgId: org._id,
          url,
          type: "gallery",
          sortOrder: existing.length + index + 1,
          isDeleted: false,
          uploadedAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.db.insert("audit_log", {
      orgId: org._id,
      actorType: "staff",
      actorId: staffMember._id,
      action: "activation.storefront_saved",
      resourceType: "orgs",
      resourceId: org._id,
      before: {
        tagline: org.tagline,
        bio: org.bio,
        phone: org.phone,
        logoUrl: org.logoUrl,
      },
      after: {
        tagline: args.tagline,
        bio: args.bio,
        phone: args.phone,
        logoUrl,
        coverUpdated: Boolean(args.coverStorageId),
        galleryAdded: args.galleryStorageIds?.length ?? 0,
      },
      createdAt: now,
    });
    await ctx.runMutation(internal.publication.recomputeWebsiteStatus, {
      orgId: org._id,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.marketplace.embeddings.embedEntity,
      { entityType: "org", entityId: org._id },
    );
    return org._id;
  },
});
