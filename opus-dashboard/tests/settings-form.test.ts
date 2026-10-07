import { describe, expect, test } from "vitest";
import {
  changedSettings,
  refreshSettingsDraft,
  trimSettingsText,
} from "../lib/settings-form";
import { resolveSettingsNavigation } from "../lib/settings-navigation";

describe("settings drafts", () => {
  test("normalized text saves become clean without changing untouched fields", () => {
    const saved = { name: "Studio", phone: "Original phone", hours: [48, 3] };
    const edited = { ...saved, name: " Updated studio " };
    const submitted = trimSettingsText(changedSettings(edited, saved));
    const nextDraft = { ...edited, ...submitted };
    const incoming = { ...saved, name: "Updated studio" };
    expect(submitted).toEqual({ name: "Updated studio" });
    expect(
      changedSettings(
        refreshSettingsDraft(nextDraft, saved, incoming),
        incoming,
      ),
    ).toEqual({});
  });
  test("sends only edited fields, preserving custom and hidden values", () => {
    const saved = {
      currency: "EUR",
      timezone: "Europe/Belgrade",
      hours: [48, 3],
      enabled: false,
    };
    expect(changedSettings({ ...saved, currency: "MKD" }, saved)).toEqual({
      currency: "MKD",
    });
    expect(changedSettings({ ...saved, enabled: true }, saved)).toEqual({
      enabled: true,
    });
    expect(changedSettings({ ...saved, hours: [] }, saved)).toEqual({
      hours: [],
    });
    expect(
      changedSettings({ ...saved, hours: [...saved.hours] }, saved),
    ).toEqual({});
  });
  test("refreshes untouched fields from live updates while retaining unsaved edits", () => {
    const saved = { name: "Studio", phone: "old", hours: [48, 3] };
    const draft = { ...saved, name: "Updated studio" };
    const incoming = { ...saved, phone: "new", hours: [72, 2] };
    const refreshed = refreshSettingsDraft(draft, saved, incoming);
    expect(refreshed).toEqual({ ...incoming, name: "Updated studio" });
    expect(changedSettings(refreshed, incoming)).toEqual({
      name: "Updated studio",
    });
    expect(
      changedSettings(refreshSettingsDraft(draft, saved, draft), draft),
    ).toEqual({});
  });
});

describe("settings link compatibility", () => {
  test.each([
    null,
    "general",
    "branding",
    "location",
    "surge",
    "unknown",
    "studio",
  ])("keeps %s links usable", (tab) => {
    expect(resolveSettingsNavigation(tab, true)).toEqual({
      section: "studio",
      redirect: null,
    });
  });
  test.each(["booking", "notifications", "ai", "billing"])(
    "retains the %s section",
    (tab) => {
      expect(resolveSettingsNavigation(tab, true)).toEqual({
        section: tab,
        redirect: null,
      });
    },
  );
  test("routes relocated controls to their new pages", () => {
    expect(resolveSettingsNavigation("themes", true).redirect).toBe(
      "/notifications/preferences",
    );
    expect(resolveSettingsNavigation("gaps", true).redirect).toBe(
      "/gap-optimizer?settings=open",
    );
  });
  test.each([null, "booking", "ai", "billing", "gaps"])(
    "takes non-owner %s visits to personal preferences",
    (tab) => {
      expect(resolveSettingsNavigation(tab, false).redirect).toBe(
        "/notifications/preferences",
      );
    },
  );
});
