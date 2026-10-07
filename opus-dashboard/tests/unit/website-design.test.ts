import { describe, expect, test } from "vitest";
import {
  defaultWebsiteDesign,
  mergeWebsiteTranslations,
  translatedWebsiteText,
  websiteSources,
  resolveWebsiteLocale,
} from "../../../shared/website-design";
import { publicBookingText } from "../../lib/public-booking-i18n";
import {
  formatBookingDate,
  formatBookingTime,
} from "../../lib/public-booking-format";
import { websiteEditorReducer } from "../../lib/website-editor-state";

describe("website language content", () => {
  test("a completing translation job preserves unsaved corrections and the saved baseline", () => {
    let saved = defaultWebsiteDesign("en");
    saved.languages.push("mk");
    saved = mergeWebsiteTranslations(saved, "mk", [
      {
        key: "content.heroTitle",
        source: "Care",
        value: "Стар превод",
        manual: true,
      },
    ]);
    const present = mergeWebsiteTranslations(saved, "mk", [
      {
        key: "content.heroTitle",
        source: "Care",
        value: "Мој нов превод",
        manual: true,
      },
    ]);
    const result = websiteEditorReducer(
      { present, saved, revision: 1, past: [saved], future: [] },
      { type: "translations", design: saved, revision: 1 },
    );
    expect(result.present.translations[0].messages[0].value).toBe(
      "Мој нов превод",
    );
    expect(result.saved.translations[0].messages[0].value).toBe("Стар превод");
  });
  test("uses translations only for their exact source and supported language", () => {
    let design = defaultWebsiteDesign("en");
    design.languages.push("mk");
    design = mergeWebsiteTranslations(design, "mk", [
      {
        key: "content.heroTitle",
        source: "Your moment",
        value: "Вашиот момент",
        manual: false,
      },
    ]);
    expect(
      translatedWebsiteText(design, "mk", "content.heroTitle", "Your moment"),
    ).toBe("Вашиот момент");
    expect(
      translatedWebsiteText(design, "mk", "content.heroTitle", "A new moment"),
    ).toBe("A new moment");
    expect(resolveWebsiteLocale(design, "sq")).toBe("en");
    design.languages = ["en"];
    expect(
      translatedWebsiteText(design, "mk", "content.heroTitle", "Your moment"),
    ).toBe("Your moment");
  });
  test("keeps corrections when generated translations arrive, until their source changes", () => {
    let design = defaultWebsiteDesign("en");
    design.languages.push("mk");
    design = mergeWebsiteTranslations(design, "mk", [
      {
        key: "content.heroTitle",
        source: "Care",
        value: "Грижа",
        manual: true,
      },
    ]);
    design = mergeWebsiteTranslations(design, "mk", [
      {
        key: "content.heroTitle",
        source: "Care",
        value: "Automatic",
        manual: false,
      },
    ]);
    expect(design.translations[0].messages[0].value).toBe("Грижа");
    design = mergeWebsiteTranslations(design, "mk", [
      {
        key: "content.heroTitle",
        source: "New care",
        value: "Нова грижа",
        manual: false,
      },
    ]);
    expect(design.translations[0].messages[0].value).toBe("Нова грижа");
  });
  test("extracts public text without translating studio names, people, contact details or prices", () => {
    const design = defaultWebsiteDesign("en");
    design.content.heroTitle = "Make space for yourself";
    const sources = websiteSources(design, {
      name: "Studio name",
      tagline: "Calm care",
      bio: "Our story",
      services: [
        {
          _id: "service-1",
          name: "Haircut",
          consumerDescription: "Wash and cut",
          categoryName: "Hair",
        },
      ],
      media: [],
      staff: [
        {
          _id: "staff-1",
          displayName: "Ada",
          bio: "Hair specialist",
          specialties: ["Color"],
        },
      ],
    });
    expect(
      sources.some((source) => source.key === "service.service-1.name"),
    ).toBe(true);
    expect(
      sources.every(
        (source) => !/price|phone|address|displayName/.test(source.key),
      ),
    ).toBe(true);
  });
  test("localizes booking labels and dates without changing wall-clock time", () => {
    expect(publicBookingText("Изберете услуга", "en")).toBe("Choose a service");
    expect(publicBookingText("Нов код за {v0}с", "sq", { v0: 30 })).toBe(
      "Kod i ri për 30s",
    );
    const timestamp = Date.UTC(2026, 9, 25, 9, 30);
    expect(formatBookingDate(timestamp, "en")).toContain("25 October 2026");
    expect(formatBookingTime(timestamp)).toBe("09:30");
  });
});
