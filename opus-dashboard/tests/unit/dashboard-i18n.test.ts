import { describe, expect, it } from "vitest";
import {
  getDashboardPageTitle,
  normalizeDashboardLocale,
  resolveDashboardLanguage,
  translate,
} from "../../lib/i18n/types";
import { getDashboardNotificationCopy } from "../../lib/i18n/dashboard-notifications";

describe("dashboard i18n locale resolution", () => {
  it("resolves Macedonian locale variants", () => {
    expect(resolveDashboardLanguage("mk")).toBe("mk");
    expect(resolveDashboardLanguage("mk-MK")).toBe("mk");
    expect(resolveDashboardLanguage("MK-mk")).toBe("mk");
    expect(resolveDashboardLanguage("mk-Cyrl-MK")).toBe("mk");
    expect(resolveDashboardLanguage("  mk-MK  ")).toBe("mk");
  });

  it("resolves Albanian locale variants", () => {
    expect(resolveDashboardLanguage("sq")).toBe("sq");
    expect(resolveDashboardLanguage("sq-AL")).toBe("sq");
    expect(resolveDashboardLanguage("sq-MK")).toBe("sq");
    expect(resolveDashboardLanguage("SQ-al")).toBe("sq");
    expect(resolveDashboardLanguage("sq-Latn-AL")).toBe("sq");
    expect(resolveDashboardLanguage("  sq-AL  ")).toBe("sq");
  });

  it("falls back to English for other or missing locales", () => {
    expect(resolveDashboardLanguage("en-GB")).toBe("en");
    expect(resolveDashboardLanguage("en-US")).toBe("en");
    expect(resolveDashboardLanguage("de-DE")).toBe("en");
    expect(resolveDashboardLanguage(undefined)).toBe("en");
    expect(resolveDashboardLanguage(null)).toBe("en");
    expect(resolveDashboardLanguage("   ")).toBe("en");
  });

  it("normalizes values to supported dashboard locales", () => {
    expect(normalizeDashboardLocale("mk")).toBe("mk-MK");
    expect(normalizeDashboardLocale("sq")).toBe("sq-AL");
    expect(normalizeDashboardLocale("sq-MK")).toBe("sq-AL");
    expect(normalizeDashboardLocale("en-US")).toBe("en-GB");
    expect(normalizeDashboardLocale(undefined)).toBe("en-GB");
  });

  it("selects the requested translation", () => {
    expect(translate("en", "Settings", "Поставки", "Cilësimet")).toBe("Settings");
    expect(translate("mk", "Settings", "Поставки", "Cilësimet")).toBe("Поставки");
    expect(translate("sq", "Settings", "Поставки", "Cilësimet")).toBe("Cilësimet");
    expect(translate("sq", "Settings", "Поставки")).toBe("Settings");
  });

  it("resolves localized page titles for nested dashboard routes", () => {
    expect(getDashboardPageTitle("/settings", "mk")).toBe("Поставки");
    expect(getDashboardPageTitle("/settings", "sq")).toBe("Cilësimet");
    expect(getDashboardPageTitle("/beauty/bookings", "en")).toBe(
      "Appointments",
    );
    expect(getDashboardPageTitle("/beauty/bookings", "sq")).toBe(
      "Terminet",
    );
    expect(getDashboardPageTitle("/beauty/staff/member-id", "mk")).toBe(
      "Тим",
    );
    expect(getDashboardPageTitle("/beauty/staff/member-id", "sq")).toBe(
      "Ekipi",
    );
    expect(getDashboardPageTitle("/unknown", "mk")).toBeNull();
    expect(getDashboardPageTitle("/unknown", "sq")).toBeNull();
  });
});

describe("dashboard notification localization", () => {
  it("preserves persisted notification copy in English", () => {
    const notification = {
      type: "new_booking",
      title: "New Booking",
      body: "Ana booked Haircut with Elena for Thu 3 Sept at 14:00",
    };

    expect(getDashboardNotificationCopy("en", notification)).toEqual({
      title: notification.title,
      body: notification.body,
    });
  });

  it("localizes known booking notification templates in Macedonian", () => {
    expect(
      getDashboardNotificationCopy("mk", {
        type: "new_booking",
        title: "New Booking",
        body: "Ana booked Haircut with Elena for Thu 3 Sept at 14:00",
      }),
    ).toEqual({
      title: "Нов термин",
      body: "Ana закажа Haircut кај Elena за чет. 3 сеп. во 14:00.",
    });

    expect(
      getDashboardNotificationCopy("mk", {
        type: "booking_cancelled",
        title: "Booking Cancelled",
        body:
          "The Haircut booking for Ana on Thu 3 Sept at 14:00 was cancelled",
      }),
    ).toEqual({
      title: "Откажан термин",
      body:
        "Терминот на Ana за Haircut, закажан за чет. 3 сеп. во 14:00, беше откажан.",
    });

    expect(
      getDashboardNotificationCopy("mk", {
        type: "no_show",
        title: "No-Show",
        body: "Ana didn't show up for Haircut on Thu 3 Sept at 14:00",
      }),
    ).toEqual({
      title: "Непојавување",
      body: "Ana не се појави на терминот за Haircut на чет. 3 сеп. во 14:00.",
    });

    expect(
      getDashboardNotificationCopy("mk", {
        type: "new_booking",
        title: "Booking Rescheduled",
        body: "Ana's Haircut with Elena was rescheduled to Thu 3 Sept at 15:00",
      }),
    ).toEqual({
      title: "Презакажан термин",
      body:
        "Терминот на Ana за Haircut кај Elena е презакажан за чет. 3 сеп. во 15:00.",
    });
  });

  it("localizes known booking notification templates in Albanian", () => {
    expect(
      getDashboardNotificationCopy("sq", {
        type: "new_booking",
        title: "New Booking",
        body: "Ana booked Haircut with Elena for Thu 3 Sept at 14:00",
      }),
    ).toEqual({
      title: "Termin i ri",
      body: "Ana rezervoi Haircut me Elena për enj. 3 sht. në 14:00.",
    });

    expect(
      getDashboardNotificationCopy("sq", {
        type: "booking_cancelled",
        title: "Booking Cancelled",
        body:
          "The Haircut booking for Ana on Thu 3 Sept at 14:00 was cancelled",
      }),
    ).toEqual({
      title: "Termin i anuluar",
      body:
        "Termini i Ana për Haircut, i caktuar për enj. 3 sht. në 14:00, u anulua.",
    });

    expect(
      getDashboardNotificationCopy("sq", {
        type: "no_show",
        title: "No-Show",
        body: "Ana didn't show up for Haircut on Thu 3 Sept at 14:00",
      }),
    ).toEqual({
      title: "Mosparaqitje",
      body: "Ana nuk u paraqit për Haircut më enj. 3 sht. në 14:00.",
    });

    expect(
      getDashboardNotificationCopy("sq", {
        type: "new_booking",
        title: "Booking Rescheduled",
        body: "Ana's Haircut with Elena was rescheduled to Thu 3 Sept at 15:00",
      }),
    ).toEqual({
      title: "Termin i ricaktuar",
      body:
        "Termini i Ana për Haircut me Elena u ricaktua për enj. 3 sht. në 15:00.",
    });

    expect(
      getDashboardNotificationCopy("sq", {
        type: "ai_handoff",
        title: "Human Takeover Needed",
        body: "A conversation needs your attention: Elena",
      }),
    ).toEqual({
      title: "Biseda kërkon vëmendje",
      body:
        "Një klient po pret përgjigje nga ekipi juaj. Hapni bisedën në kutinë e AI.",
    });
  });

  it("falls back to the persisted body when a template is unknown", () => {
    expect(
      getDashboardNotificationCopy("mk", {
        type: "new_booking",
        title: "New Booking",
        body: "Custom notification body",
      }),
    ).toEqual({
      title: "Нов термин",
      body: "Custom notification body",
    });

    expect(
      getDashboardNotificationCopy("sq", {
        type: "new_booking",
        title: "New Booking",
        body: "Custom notification body",
      }),
    ).toEqual({
      title: "Termin i ri",
      body: "Custom notification body",
    });
  });
});

describe("separate translation files (en.ts, mk.ts, al.ts, sq.ts)", () => {
  it("translates using dictionary lookup with a single argument", () => {
    expect(translate("en", "Settings")).toBe("Settings");
    expect(translate("mk", "Settings")).toBe("Поставки");
    expect(translate("sq", "Settings")).toBe("Cilësimet");
    expect(translate("al", "Settings")).toBe("Cilësimet");
  });

  it("exports matching structures across en, mk, and al translation bundles", async () => {
    const { en } = await import("../../lib/i18n/en");
    const { mk } = await import("../../lib/i18n/mk");
    const { al } = await import("../../lib/i18n/al");
    const { default: sq } = await import("../../lib/i18n/sq");

    expect(sq).toBe(al);

    // Page titles
    expect(Object.keys(en.pageTitles).sort()).toEqual(
      Object.keys(mk.pageTitles).sort(),
    );
    expect(Object.keys(en.pageTitles).sort()).toEqual(
      Object.keys(al.pageTitles).sort(),
    );

    // Nav
    expect(Object.keys(en.nav).sort()).toEqual(Object.keys(mk.nav).sort());
    expect(Object.keys(en.nav).sort()).toEqual(Object.keys(al.nav).sort());

    // Analyst metrics
    expect(Object.keys(en.analyst.metrics).sort()).toEqual(
      Object.keys(mk.analyst.metrics).sort(),
    );
    expect(Object.keys(en.analyst.metrics).sort()).toEqual(
      Object.keys(al.analyst.metrics).sort(),
    );

    // Onboarding categories
    expect(Object.keys(en.onboarding.categories).sort()).toEqual(
      Object.keys(mk.onboarding.categories).sort(),
    );
    expect(Object.keys(en.onboarding.categories).sort()).toEqual(
      Object.keys(al.onboarding.categories).sort(),
    );

    // Messages dictionary keys
    const enKeys = Object.keys(en.messages).sort();
    const mkKeys = Object.keys(mk.messages).sort();
    const alKeys = Object.keys(al.messages).sort();
    expect(mkKeys).toEqual(enKeys);
    expect(alKeys).toEqual(enKeys);
  });
});

