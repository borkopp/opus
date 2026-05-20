// Builders for the strings we send to the embedding model.
// Pure functions — no Convex ctx, no async. Easy to test.
//
// Two principles:
//   1. Keep the chunk text dense with retrieval-relevant signal:
//      name + tagline + bio + tags + category for orgs;
//      name + description + highlights + price label for services.
//   2. Be deterministic — the same input must produce the same string,
//      so sourceHash dedup in embedEntity works.

import { Doc } from "../_generated/dataModel";

const BEAUTY_CATEGORY_LABELS: Record<string, string> = {
  barbershop: "barbershop, men's grooming, fade, beard trim",
  hair_salon: "hair salon, haircut, colour, styling",
  nail_salon: "nail salon, manicure, pedicure, nail art",
  spa: "spa, wellness, relaxation, massage",
  beauty_salon: "beauty salon, facial, waxing, makeup",
  lash_studio: "lash studio, eyelash extensions, lash lift",
  brow_bar: "brow bar, eyebrow shaping, microblading",
  tattoo_studio: "tattoo studio, tattoo artist, body art",
  massage_therapy: "massage therapy, sports massage, deep tissue",
  wellness_center: "wellness centre, holistic, mind and body",
  personal_trainer: "personal trainer, fitness coach, gym",
};

const VENUE_TYPE_LABELS: Record<string, string> = {
  restaurant: "restaurant, dining, food",
  cafe: "cafe, coffee, brunch",
  bar: "bar, cocktails, drinks",
  club: "club, nightlife, dancing",
  hotel: "hotel, accommodation, stay",
};

const PRICE_RANGE_LABELS: Record<string, string> = {
  budget: "budget-friendly, affordable, cheap",
  mid: "mid-range, moderate price",
  premium: "premium, upscale, luxury",
};

function priceLabel(minorUnits: number, currency: string): string {
  const value = (minorUnits / 100).toFixed(0);
  return `${value} ${currency}`;
}

export function buildOrgChunk(org: Doc<"orgs">): string {
  const parts: string[] = [];
  parts.push(`Business: ${org.name}.`);

  if (org.industry === "beauty_wellness") {
    if (org.beautyCategory) {
      const label = BEAUTY_CATEGORY_LABELS[org.beautyCategory];
      parts.push(`Type: ${org.beautyCategory.replace(/_/g, " ")}${label ? ` (${label})` : ""}.`);
    } else {
      parts.push("Type: beauty and wellness.");
    }
  } else if (org.industry === "hospitality") {
    if (org.venueType) {
      const label = VENUE_TYPE_LABELS[org.venueType];
      parts.push(`Type: ${org.venueType}${label ? ` (${label})` : ""}.`);
    }
    if (org.cuisine && org.cuisine.length > 0) {
      parts.push(`Cuisine: ${org.cuisine.join(", ")}.`);
    }
  }

  if (org.tagline) parts.push(`Tagline: ${org.tagline}`);
  if (org.bio) parts.push(`About: ${org.bio}`);

  if (org.city) {
    const loc = [org.neighborhood, org.city].filter(Boolean).join(", ");
    parts.push(`Location: ${loc}.`);
  }

  if (org.priceRange) {
    parts.push(`Price: ${PRICE_RANGE_LABELS[org.priceRange] ?? org.priceRange}.`);
  }

  if (org.tags && org.tags.length > 0) {
    parts.push(`Tags: ${org.tags.join(", ")}.`);
  }

  if (org.menuText) {
    const trimmed = org.menuText.slice(0, 2000);
    parts.push(`Menu:\n${trimmed}`);
  }

  return parts.join("\n");
}

export function buildServiceChunk(
  service: Doc<"services">,
  org: Pick<Doc<"orgs">, "name" | "city" | "neighborhood" | "beautyCategory" | "industry">,
): string {
  const parts: string[] = [];
  parts.push(`Service: ${service.name} at ${org.name}.`);

  if (org.industry === "beauty_wellness" && org.beautyCategory) {
    const label = BEAUTY_CATEGORY_LABELS[org.beautyCategory];
    parts.push(`Category: ${org.beautyCategory.replace(/_/g, " ")}${label ? ` (${label})` : ""}.`);
  }

  parts.push(`Duration: ${service.durationMins} minutes.`);
  parts.push(`Price: ${priceLabel(service.priceMinorUnits, service.currency)}.`);

  if (service.consumerDescription) {
    parts.push(`Description: ${service.consumerDescription}`);
  } else if (service.description) {
    parts.push(`Notes: ${service.description}`);
  }

  if (service.highlights && service.highlights.length > 0) {
    parts.push(`Highlights: ${service.highlights.join(", ")}.`);
  }

  if (org.city) {
    const loc = [org.neighborhood, org.city].filter(Boolean).join(", ");
    parts.push(`Location: ${loc}.`);
  }

  return parts.join("\n");
}

// One reputation chunk per org — synthesised from published reviews.
// Build deterministically from review bodies + ratings so the
// sourceHash only changes when reviews change.
export function buildReputationChunk(
  org: Pick<Doc<"orgs">, "name" | "averageRating" | "reviewCount">,
  reviews: Array<Pick<Doc<"reviews">, "rating" | "body">>,
): string {
  const parts: string[] = [];
  parts.push(
    `Reputation for ${org.name}: ${org.averageRating.toFixed(1)} stars across ${org.reviewCount} reviews.`,
  );

  const withBody = reviews.filter((r) => r.body && r.body.trim().length > 0);
  if (withBody.length > 0) {
    const sample = withBody.slice(0, 8).map((r) => `(${r.rating}★) ${r.body!.trim()}`);
    parts.push(`Sample reviews:`);
    parts.push(sample.join("\n"));
  }

  return parts.join("\n");
}
