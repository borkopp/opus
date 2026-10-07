import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { resolveStoredImageUrl } from "./imageUrl";
import {
  websiteSources,
  type WebsiteDesign,
} from "../../../shared/website-design";

type ReadCtx = Pick<QueryCtx, "db" | "storage">;

export async function buildPublicProfile(ctx: ReadCtx, org: Doc<"orgs">) {
  const [media, services, orgSettings, activeStaff, websiteDesign] =
    await Promise.all([
      ctx.db
        .query("org_media")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", org._id).eq("isDeleted", false),
        )
        .collect(),
      ctx.db
        .query("services")
        .withIndex("by_org_visible_active", (q) =>
          q
            .eq("orgId", org._id)
            .eq("isOpusVisible", true)
            .eq("isActive", true)
            .eq("isDeleted", false),
        )
        .collect(),
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first(),
      ctx.db
        .query("staff_members")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", org._id).eq("isActive", true).eq("isDeleted", false),
        )
        .collect(),
      ctx.db
        .query("website_designs")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first(),
    ]);

  const categoryIds = [
    ...new Set(services.map((service) => service.categoryId).filter(Boolean)),
  ];
  const categories = await Promise.all(
    categoryIds.map((categoryId) => ctx.db.get(categoryId!)),
  );
  const categoryMap = new Map(
    categories
      .filter((category) => category && !category.isDeleted)
      .map((category) => [category!._id, category!.name]),
  );

  const assignedStaffIds = new Set(
    services.flatMap((service) => service.staffIds),
  );
  const publicStaff = activeStaff.filter((member) =>
    assignedStaffIds.has(member._id),
  );
  const publicStaffIds = new Set(publicStaff.map((member) => member._id));
  const publicServices = services
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((service) => ({
      _id: service._id,
      name: service.name,
      consumerDescription: service.consumerDescription,
      highlights: service.highlights,
      photoUrl: service.photoUrl,
      durationMins: service.durationMins,
      priceMinorUnits: service.priceMinorUnits,
      currency: service.currency,
      staffIds: service.staffIds.filter((staffId) =>
        publicStaffIds.has(staffId),
      ),
      categoryName: service.categoryId
        ? categoryMap.get(service.categoryId)
        : undefined,
    }))
    .filter((service) => service.staffIds.length > 0);

  const profile = {
    _id: org._id,
    name: org.name,
    slug: org.slug,
    industry: org.industry,
    logoUrl: org.logoUrl,
    tagline: org.tagline,
    bio: org.bio,
    address: org.address,
    city: org.city,
    neighborhood: org.neighborhood,
    coordinates: org.coordinates,
    phone: org.phone,
    instagramHandle: org.instagramHandle,
    websiteUrl: org.websiteUrl,
    openingHours: org.openingHours,
    menuText: org.menuText,
    tags: org.tags,
    priceRange: org.priceRange,
    beautyCategory: org.beautyCategory,
    cuisine: org.cuisine,
    venueType: org.venueType,
    averageRating: org.averageRating,
    reviewCount: org.reviewCount,
    media: media
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        _id: item._id,
        url: item.url,
        type: item.type,
        caption: item.caption,
      })),
    services: publicServices,
    bookingSettings: {
      clientAccountsEnabled: true,
      timezone: orgSettings?.timezone ?? "Europe/Belgrade",
      locale: orgSettings?.locale ?? "mk-MK",
      bookingWindowDays: orgSettings?.bookingWindowDays ?? 60,
    },
    aiWebchatEnabled: Boolean(
      org.plan === "paid" &&
      orgSettings?.aiEnabled &&
      orgSettings.aiWebchatEnabled,
    ),
    aiPersonaName: orgSettings?.aiPersonaName ?? "Aria",
    aiGreetingMessage: orgSettings?.aiGreetingMessage ?? null,
    staff: await Promise.all(
      publicStaff.map(async (member) => ({
        _id: member._id,
        displayName: member.displayName,
        bio: member.bio,
        avatarUrl: await resolveStoredImageUrl(ctx, member.avatarUrl),
        specialties: member.specialties,
      })),
    ),
  };
  let design: WebsiteDesign | undefined;
  const published =
    websiteDesign && !websiteDesign.isDeleted
      ? websiteDesign.published
      : undefined;
  if (published) {
    const visibleServiceIds = new Set(
      publicServices.map((service) => service._id as string),
    );
    const visibleMediaIds = new Set(media.map((item) => item._id as string));
    design = {
      ...published,
      ...(org.plan !== "paid" && {
        languages: [published.primaryLanguage],
        autoTranslate: false,
        translations: [],
      }),
      serviceCopy: published.serviceCopy.filter((copy) =>
        visibleServiceIds.has(copy.serviceId),
      ),
      hero: {
        ...published.hero,
        imageId: visibleMediaIds.has(published.hero.imageId)
          ? published.hero.imageId
          : "",
      },
      gallery: {
        ...published.gallery,
        imageIds: published.gallery.imageIds.filter((id) =>
          visibleMediaIds.has(id),
        ),
      },
    };
    const sources = new Map(
      websiteSources(design, profile).map((source) => [
        source.key,
        source.source,
      ]),
    );
    // Hidden/deleted services, staff and stale originals must not survive in the public payload.
    design.translations = design.translations
      .filter(
        (entry) =>
          design!.languages.includes(entry.locale) &&
          entry.locale !== design!.primaryLanguage,
      )
      .map((entry) => ({
        ...entry,
        messages: entry.messages.filter(
          (message) => sources.get(message.key) === message.source,
        ),
      }));
  }
  return { ...profile, design };
}
