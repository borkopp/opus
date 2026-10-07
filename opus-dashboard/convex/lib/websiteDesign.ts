import { ConvexError, v } from "convex/values";
import {
  WEBSITE_CONTENT_KEYS,
  WEBSITE_SECTIONS,
  type WebsiteDesign,
} from "../../../shared/website-design";

export const websiteLocale = v.union(
  v.literal("mk"),
  v.literal("en"),
  v.literal("sq"),
);
export const websiteTranslation = v.object({
  key: v.string(),
  source: v.string(),
  value: v.string(),
  manual: v.boolean(),
});
export const websiteDesignValidator = v.object({
  version: v.literal(1),
  theme: v.union(
    v.literal("linen"),
    v.literal("rose"),
    v.literal("sage"),
    v.literal("ink"),
    v.literal("clay"),
    v.literal("pearl"),
  ),
  accentColor: v.string(),
  backgroundColor: v.string(),
  font: v.union(
    v.literal("modern"),
    v.literal("editorial"),
    v.literal("classic"),
    v.literal("mono"),
  ),
  radius: v.union(v.literal("none"), v.literal("soft"), v.literal("round")),
  spacing: v.union(
    v.literal("compact"),
    v.literal("comfortable"),
    v.literal("airy"),
  ),
  width: v.union(v.literal("contained"), v.literal("wide")),
  header: v.object({
    variant: v.union(
      v.literal("simple"),
      v.literal("centered"),
      v.literal("floating"),
    ),
    sticky: v.boolean(),
    showLogo: v.boolean(),
  }),
  hero: v.object({
    variant: v.union(
      v.literal("split"),
      v.literal("background"),
      v.literal("minimal"),
      v.literal("poster"),
    ),
    imageId: v.string(),
    overlay: v.number(),
    imagePosition: v.union(
      v.literal("center"),
      v.literal("top"),
      v.literal("bottom"),
    ),
    height: v.union(
      v.literal("compact"),
      v.literal("standard"),
      v.literal("tall"),
    ),
    align: v.union(v.literal("left"), v.literal("center")),
    showCategory: v.boolean(),
  }),
  services: v.object({
    variant: v.union(
      v.literal("cards"),
      v.literal("list"),
      v.literal("editorial"),
    ),
    showPhotos: v.boolean(),
    showDescriptions: v.boolean(),
    columns: v.union(v.literal(2), v.literal(3)),
  }),
  about: v.object({
    variant: v.union(
      v.literal("split"),
      v.literal("centered"),
      v.literal("card"),
    ),
  }),
  gallery: v.object({
    variant: v.union(
      v.literal("bento"),
      v.literal("carousel"),
      v.literal("slideshow"),
      v.literal("grid"),
    ),
    imageIds: v.array(v.string()),
    autoplay: v.boolean(),
    interval: v.number(),
    aspect: v.union(
      v.literal("square"),
      v.literal("landscape"),
      v.literal("portrait"),
    ),
  }),
  team: v.object({
    variant: v.union(v.literal("cards"), v.literal("compact")),
  }),
  info: v.object({
    variant: v.union(
      v.literal("cards"),
      v.literal("split"),
      v.literal("minimal"),
    ),
    showMap: v.boolean(),
    showHours: v.boolean(),
  }),
  footer: v.object({
    variant: v.union(v.literal("simple"), v.literal("statement")),
    showSocial: v.boolean(),
  }),
  sections: v.array(
    v.object({
      id: v.union(
        v.literal("hero"),
        v.literal("services"),
        v.literal("about"),
        v.literal("gallery"),
        v.literal("team"),
        v.literal("info"),
      ),
      visible: v.boolean(),
    }),
  ),
  content: v.object({
    heroEyebrow: v.string(),
    heroTitle: v.string(),
    heroDescription: v.string(),
    heroButton: v.string(),
    servicesTitle: v.string(),
    servicesDescription: v.string(),
    aboutTitle: v.string(),
    aboutBody: v.string(),
    galleryTitle: v.string(),
    galleryDescription: v.string(),
    teamTitle: v.string(),
    infoTitle: v.string(),
    footerText: v.string(),
  }),
  serviceCopy: v.array(
    v.object({
      serviceId: v.string(),
      name: v.string(),
      description: v.string(),
    }),
  ),
  primaryLanguage: websiteLocale,
  languages: v.array(websiteLocale),
  autoTranslate: v.boolean(),
  translations: v.array(
    v.object({ locale: websiteLocale, messages: v.array(websiteTranslation) }),
  ),
});

export function validateWebsiteDesign(
  design: WebsiteDesign,
  serviceIds: Set<string>,
): void {
  if (
    design.sections.length !== WEBSITE_SECTIONS.length ||
    new Set(design.sections.map((s) => s.id)).size !==
      WEBSITE_SECTIONS.length ||
    design.sections[0]?.id !== "hero" ||
    design.sections.some(
      (s) => ["hero", "services", "info"].includes(s.id) && !s.visible,
    )
  )
    throw new ConvexError(
      "Keep the hero, services and contact sections visible.",
    );
  if (
    !design.languages.includes(design.primaryLanguage) ||
    new Set(design.languages).size !== design.languages.length
  )
    throw new ConvexError("Choose a primary website language.");
  for (const color of [design.accentColor, design.backgroundColor])
    if (color && !/^#[0-9a-f]{6}$/i.test(color))
      throw new ConvexError("Choose a valid six-digit color.");
  if (
    !Number.isFinite(design.hero.overlay) ||
    design.hero.overlay < 0 ||
    design.hero.overlay > 85 ||
    !Number.isInteger(design.gallery.interval) ||
    design.gallery.interval < 3 ||
    design.gallery.interval > 12
  )
    throw new ConvexError("Check the image and slideshow settings.");
  for (const key of WEBSITE_CONTENT_KEYS)
    if (
      design.content[key].length >
      (key === "aboutBody" ? 4000 : key.includes("Description") ? 1000 : 200)
    )
      throw new ConvexError("Some website text is too long.");
  if (
    design.serviceCopy.length > 200 ||
    new Set(design.serviceCopy.map((s) => s.serviceId)).size !==
      design.serviceCopy.length ||
    design.serviceCopy.some(
      (s) =>
        !serviceIds.has(s.serviceId) ||
        s.name.length > 120 ||
        s.description.length > 1000,
    )
  )
    throw new ConvexError("Check the website service text.");
  if (
    design.translations.length > 3 ||
    new Set(design.translations.map((t) => t.locale)).size !==
      design.translations.length ||
    design.translations.some(
      (t) =>
        t.messages.length > 800 ||
        new Set(t.messages.map((m) => m.key)).size !== t.messages.length ||
        t.messages.some(
          (m) =>
            m.key.length > 160 ||
            m.source.length > 4000 ||
            m.value.length > 6000,
        ),
    ) ||
    JSON.stringify(design).length > 250_000
  )
    throw new ConvexError("Website translations are too large.");
}
