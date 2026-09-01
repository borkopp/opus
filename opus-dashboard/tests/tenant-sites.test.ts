import { describe, expect, test } from "vitest";
import {
  slugifyBusinessName,
  tenantSiteUrl,
  tenantSlugFromHost,
} from "../lib/tenant-sites";

describe("tenant site helpers", () => {
  test("slugifies Latin and Macedonian business names", () => {
    expect(slugifyBusinessName("  Café Beauté & Nails  ")).toBe(
      "cafe-beaute-nails",
    );
    expect(slugifyBusinessName("Студио Љубов & Убавина")).toBe(
      "studio-ljubov-ubavina",
    );
    expect(slugifyBusinessName("Ж Ѕ Ѓ Љ Њ Ќ Ч Џ Ш")).toBe(
      "zh-dz-gj-lj-nj-kj-ch-dzh-sh",
    );
    expect(slugifyBusinessName("!!!")).toBe("");
  });

  test("never leaves a trailing hyphen when a long slug is truncated", () => {
    const slug = slugifyBusinessName(`${"a".repeat(59)} b`);

    expect(slug).toBe("a".repeat(59));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug).not.toMatch(/-$/);
  });

  test("extracts only valid, non-reserved tenant labels from supported hosts", () => {
    expect(tenantSlugFromHost("atelier.opus.mk", "opus.mk")).toBe("atelier");
    expect(
      tenantSlugFromHost(
        "ATELIER-NORTH.OPUS.MK:443, proxy",
        "https://opus.mk/",
      ),
    ).toBe("atelier-north");
    expect(tenantSlugFromHost("atelier.localhost:3000", "opus.mk")).toBe(
      "atelier",
    );

    expect(tenantSlugFromHost("opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("www.opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("studio.opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("auth.opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("bookings.opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("nested.atelier.opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("-atelier.opus.mk", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost("atelier.example.com", "opus.mk")).toBeNull();
    expect(tenantSlugFromHost(null, "opus.mk")).toBeNull();
  });

  test("builds secure production URLs and local development URLs", () => {
    expect(tenantSiteUrl("atelier", "opus.mk")).toBe("https://atelier.opus.mk");
    expect(tenantSiteUrl("atelier", "https://opus.mk/")).toBe(
      "https://atelier.opus.mk",
    );
    expect(tenantSiteUrl("atelier", "localhost:3000")).toBe(
      "http://atelier.localhost:3000",
    );
    expect(tenantSiteUrl("atelier", "http://localhost:3000/")).toBe(
      "http://atelier.localhost:3000",
    );
  });
});
