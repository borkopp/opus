const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const opentype = require("opentype.js");

async function render(
  filename,
  size,
  markSize,
  background,
  monochrome = false,
  monochromeColor = "#000000",
) {
  const source = await fs.readFile(
    path.join(__dirname, "../assets/opus-mark.svg"),
    "utf8",
  );
  const mark = monochrome
    ? source
        .replace('fill="#2588c8"', `fill="${monochromeColor}"`)
        .replace(' opacity=".3"', "")
    : source;
  // Use the existing vector paths. The mark's visible bounds are 40 × 40 at y=4.
  const offset = (size - markSize) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}<g fill="${monochrome ? monochromeColor : "#2588c8"}" transform="translate(${offset},${offset - markSize / 10}) scale(${markSize / 40})">${mark.match(/<path.*<\/svg>/s)[0].replace("</svg>", "")}</g></svg>`;
  let image = sharp(Buffer.from(svg));
  if (background) image = image.removeAlpha();
  await image.png().toFile(path.join(__dirname, "../assets", filename));
}

async function featureGraphic() {
  const source = await fs.readFile(
    path.join(__dirname, "../assets/opus-mark.svg"),
    "utf8",
  );
  async function textPath(fontFile, text, x, baseline, size) {
    const bytes = await fs.readFile(
      path.join(__dirname, "../node_modules/@expo-google-fonts", fontFile),
    );
    const font = opentype.parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    const outline = new opentype.Path();
    const scale = size / font.unitsPerEm;
    let previous;
    for (const character of text) {
      const glyph = font.charToGlyph(character);
      if (previous) x += font.getKerningValue(previous, glyph) * scale;
      outline.extend(glyph.getPath(x, baseline, size));
      x += glyph.advanceWidth * scale;
      previous = glyph;
    }
    return outline.toPathData(3);
  }
  // Outline the same bundled fonts as the app so generation needs no system fonts.
  const heading = await textPath(
    "audiowide/400Regular/Audiowide_400Regular.ttf",
    "OPUS",
    370,
    245,
    76,
  );
  const subtitle = await textPath(
    "dm-sans/400Regular/DMSans_400Regular.ttf",
    "Your studio, in your pocket.",
    370,
    306,
    31,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><rect width="1024" height="500" fill="#f5f6f8"/><g fill="#2588c8" transform="translate(108,124) scale(5.25)">${source.match(/<path.*<\/svg>/s)[0].replace("</svg>", "")}</g><path fill="#071a2c" d="${heading}"/><path fill="#747b85" d="${subtitle}"/></svg>`;
  await sharp(Buffer.from(svg))
    .removeAlpha()
    .png()
    .toFile(path.join(__dirname, "../assets/play-feature-graphic.png"));
}

async function generateAssets() {
  await Promise.all([
    render("icon.png", 1024, 512, "#ffffff"),
    render("adaptive-icon.png", 1024, 432, null),
    render("monochrome-icon.png", 1024, 432, null, true),
    render("notification-icon.png", 96, 64, null, true, "#ffffff"),
    render("splash-icon.png", 1024, 640, null),
    render("favicon.png", 64, 40, "#ffffff"),
    featureGraphic(),
  ]);
  const publicDir = path.join(__dirname, "../../opus-dashboard/public");
  await Promise.all(
    [192, 512].map((size) =>
      sharp(path.join(__dirname, "../assets/icon.png"))
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `studio-icon-${size}.png`)),
    ),
  );
  await fs.copyFile(
    path.join(__dirname, "../assets/notification-icon.png"),
    path.join(publicDir, "push-badge.png"),
  );
}
generateAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
