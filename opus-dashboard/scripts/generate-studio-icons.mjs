// Run from opus-dashboard: node scripts/generate-studio-icons.mjs
// Sharp is included by Next.js. Always render the original mark, preserving its paths.
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const publicDirectory = new URL("../public/", import.meta.url);
const mark = await readFile(new URL("opus-mark.svg", publicDirectory));
const icons = [
  { name: "studio-icon-192.png", size: 192, markScale: 0.8 },
  { name: "studio-icon-512.png", size: 512, markScale: 0.8 },
  { name: "studio-apple-touch-icon.png", size: 180, markScale: 0.8 },
  // The complete mark fits inside the central 80%-diameter maskable safe circle.
  { name: "studio-icon-maskable-512.png", size: 512, markScale: 0.64 },
];

for (const { name, size, markScale } of icons) {
  const markSize = Math.round(size * markScale);
  const renderedMark = await sharp(mark)
    .resize(markSize, markSize)
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([{ input: renderedMark, gravity: "centre" }])
    .removeAlpha()
    .png()
    .toFile(new URL(name, publicDirectory).pathname);
}
