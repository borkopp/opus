import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getClientLocale,
  resolveLocale,
  setClientLocale,
} from "../../../shared/i18n/locale";

afterEach(() => vi.unstubAllGlobals());

describe("shared OPUS language preference", () => {
  it.each([
    ["mk-MK,mk;q=0.9,en-US;q=0.8", "mk"],
    ["en-US,en;q=0.9,mk;q=0.8", "en"],
    ["en;q=0.2,mk;q=0.9", "mk"],
    ["mk;q=0,en;q=1", "en"],
    ["de-DE,en-GB;q=0.8", "en"],
    [null, "mk"],
  ])("resolves %s to %s", (header, expected) => {
    expect(resolveLocale(header)).toBe(expected);
  });

  it("honors explicit language before the device language", () => {
    vi.stubGlobal("document", { cookie: "other=value; opus_locale=mk" });
    vi.stubGlobal("navigator", { languages: ["en-US"] });
    expect(getClientLocale()).toBe("mk");
  });

  it("uses the device language without a saved choice", () => {
    vi.stubGlobal("document", { cookie: "other=value" });
    vi.stubGlobal("navigator", { languages: ["en-GB"] });
    expect(getClientLocale()).toBe("en");
  });

  it.each(["opus.mk", "www.opus.mk", "studio.opus.mk"])(
    "shares language from %s and removes legacy host cookies",
    (hostname) => {
      const writes: string[] = [];
      vi.stubGlobal("document", {
        set cookie(value: string) {
          writes.push(value);
        },
      });
      vi.stubGlobal("window", { location: { hostname, protocol: "https:" } });
      setClientLocale("mk");
      expect(writes[0]).toContain("Max-Age=0");
      expect(writes[1]).toContain("opus_locale=mk; Domain=opus.mk;");
      expect(writes[1]).toContain("Secure");
    },
  );

  it.each(["localhost", "127.0.0.1", "preview.vercel.app", "fakeopus.mk"])(
    "keeps %s cookies local",
    (hostname) => {
      const doc = { cookie: "" };
      vi.stubGlobal("document", doc);
      vi.stubGlobal("window", { location: { hostname, protocol: "http:" } });
      setClientLocale("en");
      expect(doc.cookie).toContain("opus_locale=en;");
      expect(doc.cookie).not.toContain("Domain=");
    },
  );
});
