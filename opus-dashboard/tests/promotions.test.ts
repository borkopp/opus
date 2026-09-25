import { describe, expect, test } from "vitest";
import {
  openingBookingUrl,
  promotionTimestamp,
  validPromotionDate,
} from "../lib/promotions";
import { artworkLines, renderPromotionArtwork } from "../lib/promotion-artwork";
import { renderReplyTemplate } from "../convex/lib/promotionTemplates";
import type { PromotionOpening } from "../lib/promotions";
import {
  normalizePromotionPalette,
  PROMOTION_PALETTES,
  promotionContrast,
  readablePromotionColor,
} from "../lib/promotion-palette";

describe("promotion links and export safety", () => {
  test("links preserve studio wall-clock time without accepting arbitrary dates", () => {
    const at = Date.UTC(2026, 8, 26, 14);
    const url = new URL(
      openingBookingUrl("https://luna.opus.mk/book", "service", {
        startAt: at,
        staffId: "staff",
      } as PromotionOpening),
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      service: "service",
      staff: "staff",
      date: "2026-09-26",
      at: String(at),
    });
    expect(promotionTimestamp(String(at))).toBe(at);
    expect(promotionTimestamp("Infinity")).toBeUndefined();
    expect(promotionTimestamp("javascript:1")).toBeUndefined();
    for (const date of ["2026-02-31", "2026-09-24", "2027-01-01", "<script>"])
      expect(validPromotionDate(date, "2026-09-25", "2026-10-01")).toBe(
        "2026-09-25",
      );
    expect(validPromotionDate("2026-09-26", "2026-09-25", "2026-10-01")).toBe(
      "2026-09-26",
    );
  });
  test("artwork escapes studio content, bounds long labels, and exports the requested dimensions", () => {
    const base = {
      language: "mk" as const,
      name: '<script>alert("x")</script>',
      address: "Test & Test",
      bookingUrl: "https://luna.opus.mk/book",
    };
    const story = renderPromotionArtwork({ ...base, kind: "story" });
    expect(story).toContain('width="1080" height="1920"');
    expect(story).not.toContain("<script>");
    expect(story).toContain("&lt;script&gt;");
    expect(story).toContain("Test &amp; Test");
    expect(renderPromotionArtwork({ ...base, kind: "poster" })).toContain(
      'width="1748" height="2480"',
    );
    expect(artworkLines("А".repeat(200), 30, 2)).toHaveLength(2);
    expect(artworkLines("А".repeat(200), 30, 2)[1]).toHaveLength(30);
  });
  test("reply replacement does not reinterpret dollar signs or embedded placeholders in studio data", () => {
    const values = {
      studio_name: "$& {{phone}}",
      booking_link: "https://luna.opus.mk/book",
      address: "",
      phone: "",
      hours: "",
      services: "",
    };
    expect(
      renderReplyTemplate("{{studio_name}} · {{address}}", values),
    ).toEqual({ text: "$& {{phone}} · {{address}}", missing: ["address"] });
  });
  test("stored colors cannot inject SVG and every palette preserves dark QR contrast", () => {
    const palette = normalizePromotionPalette({
      background: '#123456"/><script>alert(1)</script>',
      text: "#FFFFFF",
      accent: "url(https://example.com/image.svg)",
      surface: "#aabbcc",
    });
    const svg = renderPromotionArtwork({
      kind: "qr",
      language: "en",
      name: "Studio",
      address: "",
      bookingUrl: "https://luna.opus.mk/book",
      palette,
    });
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("example.com");
    expect(palette.surface).toBe("#aabbcc");
    for (const colors of [
      ...PROMOTION_PALETTES.map((item) => item.colors),
      palette,
    ]) {
      expect(
        promotionContrast(
          readablePromotionColor(colors.text, "#ffffff", 7),
          "#ffffff",
        ),
      ).toBeGreaterThanOrEqual(7);
    }
  });
});
