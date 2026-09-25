import QRCode from "qrcode";
import type { PromotionLanguage } from "@/convex/lib/promotionTemplates";
import {
  normalizePromotionPalette,
  readablePromotionColor,
  type PromotionPalette,
} from "./promotion-palette";

export type PromotionArtwork = {
  kind: "opening" | "story" | "poster" | "qr";
  language: PromotionLanguage;
  name: string;
  address: string;
  bookingUrl: string;
  palette?: PromotionPalette;
  opening?: {
    service: string;
    specialist: string;
    date: string;
    time: string;
    price: string;
    duration: string;
  };
};

export function escapeSvg(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

// Bounded labels keep long studio/service names inside the artwork. Hard wraps
// also handle a long unbroken word; user text is always escaped, never markup.
export function artworkLines(text: string, columns: number, limit: number) {
  const words = text
    .trim()
    .split(/\s+/)
    .flatMap((word) =>
      Array.from({ length: Math.ceil(word.length / columns) }, (_, i) =>
        word.slice(i * columns, (i + 1) * columns),
      ),
    );
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + word.length + 1 <= columns)
      lines[last] += ` ${word}`;
    else lines.push(word);
  }
  if (lines.length > limit)
    lines[limit - 1] = `${lines[limit - 1].slice(0, columns - 1)}…`;
  return lines.slice(0, limit);
}

function textLines(
  text: string,
  x: number,
  y: number,
  size: number,
  columns: number,
  limit: number,
  extra = "",
) {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${artworkLines(
    text,
    columns,
    limit,
  )
    .map(
      (line, i) =>
        `<tspan x="${x}" dy="${i ? size * 1.22 : 0}">${escapeSvg(line)}</tspan>`,
    )
    .join("")}</text>`;
}

function qrGraphic(
  url: string,
  x: number,
  y: number,
  size: number,
  ink: string,
) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4,
    scale = size / (modules.size + quiet * 2);
  let path = "";
  for (let row = 0; row < modules.size; row++)
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col))
        path += `M${col + quiet},${row + quiet}h1v1h-1z`;
    }
  return `<g transform="translate(${x} ${y}) scale(${scale})"><rect width="${modules.size + quiet * 2}" height="${modules.size + quiet * 2}" fill="white"/><path d="${path}" fill="${ink}" shape-rendering="crispEdges"/></g>`;
}

export function renderPromotionArtwork(data: PromotionArtwork) {
  const palette = normalizePromotionPalette(data.palette);
  const ink = readablePromotionColor(palette.text, palette.background);
  const cardInk = readablePromotionColor(palette.text, palette.surface);
  const cardAccent = readablePromotionColor(palette.accent, palette.surface);
  const qrInk = readablePromotionColor(palette.text, "#ffffff", 7);
  const mk = data.language === "mk";
  const poster = data.kind === "poster",
    qr = data.kind === "qr";
  const height = qr ? 1080 : poster ? 1532 : 1920;
  const widthPx = poster ? 1748 : 1080,
    heightPx = poster ? 2480 : height;
  const host = new URL(data.bookingUrl).host;
  const opening = data.kind === "opening" ? data.opening : undefined;
  let content: string;
  if (qr) {
    content = `<rect width="1080" height="1080" fill="${palette.background}"/>${qrGraphic(data.bookingUrl, 70, 70, 940, qrInk)}`;
  } else {
    content = `<rect width="1080" height="${height}" fill="${palette.background}"/>
      <path d="M700 -80C320 300 1280 160 1050 700" fill="none" stroke="${palette.accent}" stroke-opacity="0.16" stroke-width="140"/>
      <path d="M-150 ${height - 360}C180 ${height - 740} 250 ${height + 140} 700 ${height - 70}" fill="none" stroke="${palette.accent}" stroke-opacity="0.11" stroke-width="110"/>
      <g fill="${ink}" font-family="Arial, Helvetica, sans-serif">
      ${textLines(data.name, 84, poster ? 134 : 234, 38, 34, 2, 'font-weight="600"')}
      <path d="M84 ${poster ? 225 : 345}h72" stroke="${palette.accent}" stroke-width="4"/>
      <text x="84" y="${poster ? 298 : 438}" font-size="23" letter-spacing="3">${mk ? "ОНЛАЈН ЗАКАЖУВАЊЕ" : "ONLINE BOOKING"}</text>`;
    if (opening) {
      content += `<text x="80" y="585" font-family="Georgia, serif" font-size="108" letter-spacing="-4"><tspan x="80">${mk ? "Време само" : "A little time,"}</tspan><tspan x="80" dy="120">${mk ? "за вас." : "just for you."}</tspan></text>
        <rect x="64" y="815" width="952" height="574" rx="40" fill="${palette.surface}"/>
        <g fill="${cardInk}">
        <text x="110" y="882" font-size="22" letter-spacing="2" fill="${cardAccent}">${mk ? "СЛОБОДЕН ТЕРМИН" : "AN OPEN APPOINTMENT"}</text>
        ${textLines(opening.service, 110, 958, 45, 30, 2, 'font-weight="600"')}
        ${textLines(opening.specialist, 110, 1073, 27, 45, 1)}
        <path d="M110 1120H970" stroke="${cardInk}" stroke-opacity="0.15" stroke-width="2"/>
        <text x="110" y="1204" font-size="74" font-weight="500">${escapeSvg(opening.time)}</text>
        ${textLines(opening.date, 110, 1254, 28, 46, 1)}
        <text x="110" y="1338" font-size="29">${escapeSvg(opening.price)} · ${escapeSvg(opening.duration)}</text></g>
        <text x="84" y="1510" font-size="36" font-weight="500">${mk ? "Закажете преку линкот." : "Book through the link."}</text>
        ${textLines(host, 84, 1570, 28, 46, 2)}`;
    } else {
      const titleY = poster ? 414 : 600;
      content += `<text x="80" y="${titleY}" font-family="Georgia, serif" font-size="88" letter-spacing="-3"><tspan x="80">${mk ? "Следниот термин?" : "Your next visit?"}</tspan><tspan x="80" dy="105">${mk ? "Закажете тука." : "Book it here."}</tspan></text>
        ${qrGraphic(data.bookingUrl, 300, poster ? 620 : 870, 480, qrInk)}
        <text x="540" y="${poster ? 1190 : 1460}" text-anchor="middle" font-size="31">${mk ? "Скенирајте и изберете термин." : "Scan to find your appointment."}</text>
        ${textLines(host, 540, poster ? 1245 : 1515, 26, 46, 2, 'text-anchor="middle"')}
        ${textLines(data.address, 540, poster ? 1340 : 1610, 23, 50, 2, 'text-anchor="middle"')}`;
    }
    content += `<text x="84" y="${height - (poster ? 70 : 160)}" font-size="20" letter-spacing="1">${mk ? "ЛЕСНО ЗАКАЖУВАЊЕ СО OPUS" : "EASY BOOKING WITH OPUS"}</text></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 1080 ${height}">${content}</svg>`;
}
