import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type ReadCtx = Pick<QueryCtx, "db">;

export async function buildPublicProfile(
  ctx: ReadCtx,
  org: Doc<"orgs">,
) {
  const [media, services, orgSettings] = await Promise.all([
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

  const staffIds = [...new Set(services.flatMap((service) => service.staffIds))];
  const staff = await Promise.all(
    staffIds.slice(0, 20).map((staffId) => ctx.db.get(staffId)),
  );

  return {
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
    services: services
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
        categoryName: service.categoryId
          ? categoryMap.get(service.categoryId)
          : undefined,
      })),
    aiWebchatEnabled: Boolean(
      orgSettings?.aiEnabled && orgSettings.aiWebchatEnabled,
    ),
    aiPersonaName: orgSettings?.aiPersonaName ?? "Aria",
    aiGreetingMessage: orgSettings?.aiGreetingMessage ?? null,
    staff: staff
      .filter(
        (member): member is Doc<"staff_members"> =>
          Boolean(member && member.isActive && !member.isDeleted),
      )
      .map((member) => ({
        _id: member._id,
        displayName: member.displayName,
        bio: member.bio,
        avatarUrl: member.avatarUrl,
        specialties: member.specialties,
      })),
  };
}
