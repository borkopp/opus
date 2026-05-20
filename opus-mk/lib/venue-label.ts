import { CATEGORIES } from "./beauty-categories";

export function getVenueLabel(org: {
  industry?: string;
  beautyCategory?: string;
  venueType?: string;
  cuisine?: string[];
}): string {
  if (org.industry === "hospitality") {
    const type = org.venueType
      ? org.venueType.charAt(0).toUpperCase() + org.venueType.slice(1)
      : "Restaurant";
    const primaryCuisine = org.cuisine?.[0];
    return primaryCuisine ? `${type} · ${primaryCuisine}` : type;
  }
  return (
    CATEGORIES.find((c) => c.id === org.beautyCategory)?.label ||
    org.beautyCategory ||
    "Beauty"
  );
}
