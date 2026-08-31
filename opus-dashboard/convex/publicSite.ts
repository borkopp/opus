import { v } from "convex/values";
import { query } from "./_generated/server";
import { getBeautyActivationState } from "./lib/activation";
import { buildPublicProfile } from "./lib/publicProfile";
import { isWebsitePublished } from "./lib/publication";
import { isActiveIndustry } from "./lib/productScope";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = args.slug.trim().toLowerCase();
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (
      !org ||
      org.isDeleted ||
      !isActiveIndustry(org.industry) ||
      !isWebsitePublished(org)
    ) {
      return null;
    }

    // Treat stale publication state defensively: never render an unusable site.
    const readiness = await getBeautyActivationState(ctx, org._id);
    if (!readiness?.allRequiredComplete) return null;

    const profile = await buildPublicProfile(ctx, org);
    return {
      _id: profile._id,
      name: profile.name,
      slug: profile.slug,
      logoUrl: profile.logoUrl,
      tagline: profile.tagline,
      bio: profile.bio,
      address: profile.address,
      city: profile.city,
      neighborhood: profile.neighborhood,
      coordinates: profile.coordinates,
      phone: profile.phone,
      instagramHandle: profile.instagramHandle,
      openingHours: profile.openingHours,
      beautyCategory: profile.beautyCategory,
      media: profile.media,
      services: profile.services,
      staff: profile.staff,
      bookingSettings: profile.bookingSettings,
    };
  },
});
