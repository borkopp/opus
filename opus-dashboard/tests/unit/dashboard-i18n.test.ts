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
    expect(normalizeDashboardLocale("en-US")).toBe("en-GB");
    expect(normalizeDashboardLocale(undefined)).toBe("en-GB");
  });

  it("selects the requested translation", () => {
    expect(translate("en", "Settings", "Поставки")).toBe("Settings");
    expect(translate("mk", "Settings", "Поставки")).toBe("Поставки");
  });

  it("resolves localized page titles for nested dashboard routes", () => {
    expect(getDashboardPageTitle("/settings", "mk")).toBe("Поставки");
    expect(getDashboardPageTitle("/beauty/bookings", "en")).toBe(
      "Appointments",
    );
    expect(getDashboardPageTitle("/beauty/staff/member-id", "mk")).toBe(
      "Тим",
    );
    expect(getDashboardPageTitle("/unknown", "mk")).toBeNull();
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
  });
});
