import type { Locale } from "./i18n/locale";

export const WEBSITE_SECTIONS = [
  "hero",
  "services",
  "about",
  "gallery",
  "team",
  "info",
] as const;
export type WebsiteSection = (typeof WEBSITE_SECTIONS)[number];
export type WebsitePanel =
  | "design"
  | "header"
  | WebsiteSection
  | "footer"
  | "languages";
export const WEBSITE_PANELS: WebsitePanel[] = [
  "design",
  "header",
  ...WEBSITE_SECTIONS,
  "footer",
  "languages",
];
export const WEBSITE_CONTENT_KEYS = [
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "heroButton",
  "servicesTitle",
  "servicesDescription",
  "aboutTitle",
  "aboutBody",
  "galleryTitle",
  "galleryDescription",
  "teamTitle",
  "infoTitle",
  "footerText",
] as const;
export type WebsiteContentKey = (typeof WEBSITE_CONTENT_KEYS)[number];
export type WebsiteContent = Record<WebsiteContentKey, string>;
export type WebsiteTranslation = {
  key: string;
  source: string;
  value: string;
  manual: boolean;
};

export interface WebsiteDesign {
  version: 1;
  theme: "linen" | "rose" | "sage" | "ink" | "clay" | "pearl";
  accentColor: string;
  backgroundColor: string;
  font: "modern" | "editorial" | "classic" | "mono";
  radius: "none" | "soft" | "round";
  spacing: "compact" | "comfortable" | "airy";
  width: "contained" | "wide";
  header: {
    variant: "simple" | "centered" | "floating";
    sticky: boolean;
    showLogo: boolean;
  };
  hero: {
    variant: "split" | "background" | "minimal" | "poster";
    imageId: string;
    overlay: number;
    imagePosition: "center" | "top" | "bottom";
    height: "compact" | "standard" | "tall";
    align: "left" | "center";
    showCategory: boolean;
  };
  services: {
    variant: "cards" | "list" | "editorial";
    showPhotos: boolean;
    showDescriptions: boolean;
    columns: 2 | 3;
  };
  about: { variant: "split" | "centered" | "card" };
  gallery: {
    variant: "bento" | "carousel" | "slideshow" | "grid";
    imageIds: string[];
    autoplay: boolean;
    interval: number;
    aspect: "square" | "landscape" | "portrait";
  };
  team: { variant: "cards" | "compact" };
  info: {
    variant: "cards" | "split" | "minimal";
    showMap: boolean;
    showHours: boolean;
  };
  footer: { variant: "simple" | "statement"; showSocial: boolean };
  sections: { id: WebsiteSection; visible: boolean }[];
  content: WebsiteContent;
  serviceCopy: { serviceId: string; name: string; description: string }[];
  primaryLanguage: Locale;
  languages: Locale[];
  autoTranslate: boolean;
  translations: { locale: Locale; messages: WebsiteTranslation[] }[];
}

export type WebsiteSource = { key: string; source: string };
export interface WebsiteSourceSite {
  name: string;
  tagline?: string;
  bio?: string;
  services: {
    _id: string;
    name: string;
    consumerDescription?: string;
    categoryName?: string;
  }[];
  media: { _id: string; caption?: string }[];
  staff: {
    _id: string;
    bio?: string;
    displayName: string;
    specialties: string[];
  }[];
}

export function defaultWebsiteDesign(language: Locale = "mk"): WebsiteDesign {
  return {
    version: 1,
    theme: "linen",
    accentColor: "",
    backgroundColor: "",
    font: "modern",
    radius: "soft",
    spacing: "comfortable",
    width: "contained",
    header: { variant: "simple", sticky: true, showLogo: true },
    hero: {
      variant: "split",
      imageId: "",
      overlay: 45,
      imagePosition: "center",
      height: "standard",
      align: "left",
      showCategory: true,
    },
    services: {
      variant: "cards",
      showPhotos: true,
      showDescriptions: true,
      columns: 2,
    },
    about: { variant: "split" },
    gallery: {
      variant: "bento",
      imageIds: [],
      autoplay: false,
      interval: 5,
      aspect: "landscape",
    },
    team: { variant: "cards" },
    info: { variant: "cards", showMap: true, showHours: true },
    footer: { variant: "simple", showSocial: true },
    sections: WEBSITE_SECTIONS.map((id) => ({ id, visible: id !== "team" })),
    content: Object.fromEntries(
      WEBSITE_CONTENT_KEYS.map((key) => [key, ""]),
    ) as WebsiteContent,
    serviceCopy: [],
    primaryLanguage: language,
    languages: [language],
    autoTranslate: false,
    translations: [],
  };
}

/** Only owner-written text is sent for translation. Business identifiers and facts stay canonical. */
export function websiteSources(
  design: WebsiteDesign,
  site: WebsiteSourceSite,
): WebsiteSource[] {
  const content = {
    ...design.content,
    heroDescription: design.content.heroDescription || site.tagline || "",
    aboutBody: design.content.aboutBody || site.bio || "",
  };
  const sources: WebsiteSource[] = WEBSITE_CONTENT_KEYS.map((key) => ({
    key: `content.${key}`,
    source: content[key],
  }));
  for (const service of site.services) {
    const copy = design.serviceCopy.find(
      (item) => item.serviceId === service._id,
    );
    sources.push(
      {
        key: `service.${service._id}.name`,
        source: copy?.name || service.name,
      },
      {
        key: `service.${service._id}.description`,
        source: copy?.description || service.consumerDescription || "",
      },
      {
        key: `service.${service._id}.category`,
        source: service.categoryName || "",
      },
    );
  }
  for (const item of site.media)
    sources.push({
      key: `media.${item._id}.caption`,
      source: item.caption || "",
    });
  for (const member of site.staff)
    sources.push(
      { key: `staff.${member._id}.bio`, source: member.bio || "" },
      {
        key: `staff.${member._id}.specialties`,
        source: member.specialties.join(" · "),
      },
    );
  return sources.filter((item) => item.source.trim());
}

export function translatedWebsiteText(
  design: WebsiteDesign,
  locale: Locale,
  key: string,
  source: string,
): string {
  if (locale === design.primaryLanguage || !design.languages.includes(locale))
    return source;
  const message = design.translations
    .find((entry) => entry.locale === locale)
    ?.messages.find((entry) => entry.key === key && entry.source === source);
  return message?.value || source;
}

export function mergeWebsiteTranslations(
  design: WebsiteDesign,
  locale: Locale,
  messages: WebsiteTranslation[],
): WebsiteDesign {
  const previous =
    design.translations.find((entry) => entry.locale === locale)?.messages ??
    [];
  const merged = new Map(previous.map((entry) => [entry.key, entry]));
  for (const message of messages) {
    const current = merged.get(message.key);
    if (
      current?.manual &&
      current.value.trim() &&
      current.source === message.source &&
      !message.manual
    )
      continue;
    merged.set(message.key, message);
  }
  return {
    ...design,
    translations: [
      ...design.translations.filter((entry) => entry.locale !== locale),
      { locale, messages: [...merged.values()] },
    ],
  };
}

export function resolveWebsiteLocale(
  design: WebsiteDesign,
  requested?: string | null,
): Locale {
  const language = requested?.toLowerCase().split("-")[0];
  return (
    design.languages.find((locale) => locale === language) ??
    design.primaryLanguage
  );
}
