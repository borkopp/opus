// Fallback: parse a GeoJSON export from overpass-turbo.eu.
//
// When all Overpass API mirrors are down:
//   1. Open https://overpass-turbo.eu
//   2. Paste this query and click Run:
//
//   [out:json][timeout:90];
//   (
//     node["amenity"~"restaurant|bar|cafe|pub|fast_food|food_court|biergarten|nightclub"]["name"](41.93,21.33,42.07,21.57);
//     way["amenity"~"restaurant|bar|cafe|pub|fast_food|food_court|biergarten|nightclub"]["name"](41.93,21.33,42.07,21.57);
//     relation["amenity"~"restaurant|bar|cafe|pub|fast_food|food_court|biergarten|nightclub"]["name"](41.93,21.33,42.07,21.57);
//   );
//   out center tags;
//
//   3. Export → GeoJSON → save as data/overpass-export.geojson
//   4. Run: npm run import:geojson

import "dotenv/config";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";
import type { OsmPlace } from "./scrape-osm.js";
import { mapVenueType } from "./scrape-osm.js";

const INPUT_PATH = path.resolve("data/overpass-export.geojson");
const OUTPUT_PATH = path.resolve("data/osm-places.json");

// ── Opening hours parser (same logic as scrape-osm.ts) ─────────────────────

const DAY_MAP: Record<string, number> = {
  Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6,
};

function expandDayRange(range: string): number[] {
  return range.split(",").flatMap((part) => {
    const dash = part.indexOf("-");
    if (dash === -1) return [DAY_MAP[part.trim()] ?? -1];
    const from = DAY_MAP[part.slice(0, dash).trim()];
    const to = DAY_MAP[part.slice(dash + 1).trim()];
    if (from === undefined || to === undefined) return [];
    const days: number[] = [];
    for (let d = from; d <= to; d++) days.push(d);
    return days;
  }).filter((d) => d >= 0);
}

function parseOpeningHours(raw: string): OsmPlace["openingHours"] {
  if (!raw) return null;
  if (raw.trim() === "24/7") {
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i, open: "00:00", close: "23:59", isClosed: false,
    }));
  }
  const result = new Map<number, { dayOfWeek: number; open: string; close: string; isClosed: boolean }>();
  for (let i = 0; i < 7; i++) result.set(i, { dayOfWeek: i, open: "", close: "", isClosed: true });

  for (const rule of raw.split(";").map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^([A-Za-z,\-]+)\s+(.+)$/);
    if (!m) continue;
    const [, dayPart, timePart] = m;
    const days = expandDayRange(dayPart);
    if (!days.length) continue;
    if (/^(off|closed)$/i.test(timePart.trim())) {
      days.forEach((d) => result.set(d, { dayOfWeek: d, open: "", close: "", isClosed: true }));
      continue;
    }
    const tm = timePart.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!tm) continue;
    days.forEach((d) => result.set(d, { dayOfWeek: d, open: tm[1], close: tm[2], isClosed: false }));
  }
  const parsed = Array.from(result.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return parsed.some((d) => !d.isClosed) ? parsed : null;
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    tags["addr:street"] && tags["addr:housenumber"]
      ? `${tags["addr:street"]} ${tags["addr:housenumber"]}`
      : tags["addr:street"] ?? null,
    tags["addr:city"] ?? null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(INPUT_PATH)) {
    console.error(`${INPUT_PATH} not found.\nExport from overpass-turbo.eu first (see script header).`);
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geojson = JSON.parse(readFileSync(INPUT_PATH, "utf8")) as any;
  const features = geojson.features ?? [];

  console.log(`Parsing ${features.length} GeoJSON features…`);

  const places: OsmPlace[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const feat of features as any[]) {
    const tags: Record<string, string> = feat.properties ?? {};
    const name: string = tags.name ?? tags["name:en"] ?? tags["name:mk"] ?? "";
    if (!name.trim()) continue;

    // Overpass GeoJSON: points have coordinates [lng,lat], polygons use centroid
    const geom = feat.geometry;
    let lat: number | null = null;
    let lng: number | null = null;
    if (geom?.type === "Point" && Array.isArray(geom.coordinates)) {
      [lng, lat] = geom.coordinates;
    } else if (geom?.type === "Polygon" && Array.isArray(geom.coordinates?.[0])) {
      // Use centroid approximation
      const ring = geom.coordinates[0] as [number, number][];
      lng = ring.reduce((s: number, c: [number, number]) => s + c[0], 0) / ring.length;
      lat = ring.reduce((s: number, c: [number, number]) => s + c[1], 0) / ring.length;
    }

    const osmId = tags["@id"] ?? `unknown/${Math.random()}`;
    const amenity: string = tags.amenity ?? "restaurant";
    const cuisineRaw: string = tags.cuisine ?? "";
    const cuisine = cuisineRaw
      ? cuisineRaw.split(";").map((c) => c.trim().replace(/_/g, " ")).filter(Boolean)
      : [];

    const hoursRaw = tags.opening_hours ?? null;

    places.push({
      osmId,
      name,
      amenity,
      address: buildAddress(tags),
      lat,
      lng,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? tags["contact:facebook"] ?? null,
      openingHours: hoursRaw ? parseOpeningHours(hoursRaw) : null,
      cuisine,
      openingHoursRaw: hoursRaw,
    });
  }

  console.log(`Parsed ${places.length} named venues.`);
  console.log(`  with hours:   ${places.filter((p) => p.openingHours).length}`);
  console.log(`  with cuisine: ${places.filter((p) => p.cuisine.length > 0).length}`);
  console.log(`  with phone:   ${places.filter((p) => p.phone).length}`);

  // Merge with any existing osm-places.json checkpoint
  if (existsSync(OUTPUT_PATH)) {
    const existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) as OsmPlace[];
    const existingIds = new Set(existing.map((p) => p.osmId));
    const newOnes = places.filter((p) => !existingIds.has(p.osmId));
    console.log(`\n${newOnes.length} new, ${existing.length} existing — merging.`);
    writeFileSync(OUTPUT_PATH, JSON.stringify([...existing, ...newOnes], null, 2));
  } else {
    writeFileSync(OUTPUT_PATH, JSON.stringify(places, null, 2));
  }

  console.log(`\nWritten to ${OUTPUT_PATH}`);
  console.log(`\nNext: npm run upsert`);
}

// mapVenueType is re-exported from scrape-osm for use here — suppress unused warning
void mapVenueType;

main();
