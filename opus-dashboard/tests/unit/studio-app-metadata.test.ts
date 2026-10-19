import { readFileSync } from "node:fs";
import type { MetadataRoute } from "next";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  studioAppMetadata,
  studioAppViewport,
} from "../../lib/studio-app-metadata";
import { config } from "../../proxy";

const manifest: MetadataRoute.Manifest = JSON.parse(
  readFileSync("public/studio.webmanifest", "utf8"),
);

describe("studio installation metadata", () => {
  it("retains one stable app identity and shortcuts to real studio routes", () => {
    expect(manifest).toMatchObject({
      id: "/beauty",
      start_url: "/beauty",
      scope: "/",
      display: "standalone",
      theme_color: studioAppViewport.themeColor,
    });
    expect(manifest.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      "/beauty/bookings",
      "/notifications",
    ]);
    expect(studioAppMetadata.manifest).toBe("/studio.webmanifest");
    expect(studioAppMetadata.icons).toMatchObject({
      apple: {
        url: "/studio-apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    });
    expect(studioAppViewport.viewportFit).toBe("cover");
    expect(studioAppViewport.userScalable).not.toBe(false);
    expect(studioAppViewport.maximumScale).toBeUndefined();
  });

  it("serves install assets without a session or tenant rewrite", () => {
    const assets = [
      "/studio.webmanifest",
      "/studio-apple-touch-icon.png",
      ...(manifest.icons ?? []).map((icon) => icon.src),
    ];
    for (const host of ["studio.opus.mk", "studio-luna.opus.mk"]) {
      for (const asset of assets) {
        expect(
          unstable_doesMiddlewareMatch({
            config,
            nextConfig: {},
            url: `https://${host}${asset}`,
            headers: { host },
          }),
        ).toBe(false);
      }
    }
  });

  it.each([
    ["studio-icon-192.png", 192],
    ["studio-icon-512.png", 512],
    ["studio-apple-touch-icon.png", 180],
    ["studio-icon-maskable-512.png", 512],
  ])("ships an opaque, correctly sized %s", async (file, size) => {
    const icon = sharp(`public/${file}`);
    expect(await icon.metadata()).toMatchObject({
      format: "png",
      width: size,
      height: size,
      hasAlpha: false,
    });
    const { data, info } = await icon
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(3);
    expect([...data.subarray(0, 3)]).toEqual([255, 255, 255]);
    expect(
      data.some(
        (channel, index) =>
          index % 3 === 0 &&
          channel === 37 &&
          data[index + 1] === 136 &&
          data[index + 2] === 200,
      ),
    ).toBe(true);
  });

  it("keeps the entire maskable logo within the safe circle for launcher crops", async () => {
    expect(manifest.icons).toContainEqual({
      src: "/studio-icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });
    const { data, info } = await sharp("public/studio-icon-maskable-512.png")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const center = info.width / 2;
    let furthestLogoPixel = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const index = (y * info.width + x) * info.channels;
        if (
          data[index] < 250 ||
          data[index + 1] < 250 ||
          data[index + 2] < 250
        ) {
          furthestLogoPixel = Math.max(
            furthestLogoPixel,
            Math.hypot(x + 0.5 - center, y + 0.5 - center),
          );
        }
      }
    }
    expect(furthestLogoPixel).toBeGreaterThan(info.width * 0.25);
    expect(furthestLogoPixel).toBeLessThan(info.width * 0.4);
  });
});
