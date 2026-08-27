import { CATEGORIES } from "./beauty-categories";

export function getVenueLabel(org: {
  beautyCategory?: string;
}): string {
  return (
    CATEGORIES.find((c) => c.id === org.beautyCategory)?.label ||
    org.beautyCategory ||
    "Beauty"
  );
}
