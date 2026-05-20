// Scrapes Skopje restaurants/bars/cafes from OpenStreetMap via the Overpass API.
// Completely free, no API key required.
//
// Usage:  npm run scrape:osm
// Output: data/osm-places.json
//
// OSM amenity values captured:
//   restaurant, bar, cafe, pub, fast_food, food_court, biergarten, nightclub

import "dotenv/config";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const DATA_PATH = path.resolve("data/osm-places.json");

// Skopje bounding box: south,west,north,east
const BBOX = "41.93,21.33,42.07,21.57";

const AMENITY_TYPES = [
  "restaurant",
  "bar",
  "cafe",
  "pub",
  "fast_food",
  "food_court",
  "biergarten",
  "nightclub",
];

// ── Types ──────────────────────────────────────────────────────────────────

export interface OsmPlace {
  osmId: string;           // "node/12345678" or "way/12345678"
  name: string;
  amenity: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  openingHours: ParsedHours[] | null;
  cuisine: string[];
  openingHoursRaw: string | null; // keep raw string for manual review
}

interface ParsedHours {
  dayOfWeek: number; // 0=Mon … 6=Sun (ISO)
  open: string;      // "09:00"
  close: string;     // "22:00"
  isClosed: boolean;
}

// ── Overpass query ──────────────────────────────────────────────────────────

function buildQuery(): string {
  const amenityFilter = AMENITY_TYPES.join("|");
  return `
[out:json][timeout:90];
(
  node["amenity"~"${amenityFilter}"]["name"](${BBOX});
  way["amenity"~"${amenityFilter}"]["name"](${BBOX});
  relation["amenity"~"${amenityFilter}"]["name"](${BBOX});
);
out center tags;
`.trim();
}

async function runOverpassQuery(query: string): Promise<unknown[]> {
  // Tried in order; GET is preferred (avoids 406 Accept-negotiation issues on some servers).
  const ENDPOINTS = [
    { url: "https://overpass-api.de/api/interpreter",                method: "GET"  },
    { url: "https://lz4.overpass-api.de/api/interpreter",            method: "GET"  },
    { url: "https://overpass.private.coffee/api/interpreter",        method: "GET"  },
    { url: "https://overpass.osm.ch/api/interpreter",                method: "GET"  },
    { url: "https://overpass.kumi.systems/api/interpreter",          method: "POST" },
    { url: "https://overpass.openstreetmap.ru/api/interpreter",      method: "GET"  },
  ];

  const encoded = encodeURIComponent(query);

  for (const { url, method } of ENDPOINTS) {
    try {
      process.stdout.write(`Trying ${url} (${method})… `);

      const fetchUrl = method === "GET" ? `${url}?data=${encoded}` : url;
      const res = await fetch(fetchUrl, {
        method,
        headers: {
          "Accept": "application/json",
          ...(method === "POST"
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
        },
        ...(method === "POST" ? { body: `data=${encoded}` } : {}),
      });

      if (!res.ok) {
        console.log(`failed (${res.status})`);
        // Back off before trying the next mirror.
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      console.log(`ok — ${data.elements?.length ?? 0} elements`);
      return data.elements ?? [];
    } catch (err) {
      console.log(`error: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error(
    "All Overpass endpoints failed.\n\n" +
    "The public mirrors may be temporarily overloaded. Options:\n" +
    "  1. Wait a few minutes and retry.\n" +
    "  2. Run the query manually at https://overpass-turbo.eu — paste\n" +
    "     the query below, click Run, then Export → GeoJSON, save to\n" +
    "     data/overpass-export.geojson and run: npm run upsert:geojson\n\n" +
    "Query to paste into overpass-turbo.eu:\n" +
    "─".repeat(60) + "\n" +
    query,
  );
}

// ── Opening hours parser ────────────────────────────────────────────────────
// Handles the most common OSM opening_hours patterns:
//   "Mo-Fr 09:00-22:00; Sa,Su 10:00-23:00"
//   "Mo-Su 08:00-24:00"
//   "24/7"

const DAY_MAP: Record<string, number> = {
  Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6,
};

function expandDayRange(range: string): number[] {
  const parts = range.split(",").flatMap((part) => {
    const dash = part.indexOf("-");
    if (dash === -1) return [DAY_MAP[part.trim()] ?? -1];
    const from = DAY_MAP[part.slice(0, dash).trim()];
    const to = DAY_MAP[part.slice(dash + 1).trim()];
    if (from === undefined || to === undefined) return [];
    const days: number[] = [];
    for (let d = from; d <= to; d++) days.push(d);
    return days;
  });
  return parts.filter((d) => d >= 0);
}

function parseOpeningHours(raw: string): ParsedHours[] | null {
  if (!raw) return null;

  // 24/7 shorthand
  if (raw.trim() === "24/7") {
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i, open: "00:00", close: "23:59", isClosed: false,
    }));
  }

  const result = new Map<number, ParsedHours>();

  // Initialize all days as closed
  for (let i = 0; i < 7; i++) {
    result.set(i, { dayOfWeek: i, open: "", close: "", isClosed: true });
  }

  // Split on semicolons for separate day-range rules
  const rules = raw.split(";").map((r) => r.trim()).filter(Boolean);
  for (const rule of rules) {
    // Match: "Mo-Fr 09:00-22:00" or "Sa,Su 10:00-23:00" or "Mo-Su off"
    const m = rule.match(/^([A-Za-z,\-]+)\s+(.+)$/);
    if (!m) continue;
    const [, dayPart, timePart] = m;
    const days = expandDayRange(dayPart);
    if (days.length === 0) continue;

    if (timePart.trim().toLowerCase() === "off" || timePart.trim().toLowerCase() === "closed") {
      for (const d of days) result.set(d, { dayOfWeek: d, open: "", close: "", isClosed: true });
      continue;
    }

    const timeMatch = timePart.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!timeMatch) continue;
    const [, open, close] = timeMatch;
    for (const d of days) result.set(d, { dayOfWeek: d, open, close, isClosed: false });
  }

  const parsed = Array.from(result.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  // Return null if we couldn't parse anything meaningful (all still closed and raw wasn't "off")
  const hasOpenDay = parsed.some((d) => !d.isClosed);
  return hasOpenDay ? parsed : null;
}

// ── Address builder ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    tags["addr:street"] && tags["addr:housenumber"]
      ? `${tags["addr:street"]} ${tags["addr:housenumber"]}`
      : tags["addr:street"] ?? null,
    tags["addr:city"] ?? null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Venue type mapping ───────────────────────────────────────────────────────

function mapVenueType(amenity: string): "restaurant" | "cafe" | "bar" | "club" {
  if (amenity === "cafe" || amenity === "coffee_shop") return "cafe";
  if (amenity === "bar" || amenity === "pub" || amenity === "biergarten") return "bar";
  if (amenity === "nightclub") return "club";
  return "restaurant";
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Querying Overpass API for Skopje restaurants/bars/cafes…\n");
  const elements = await runOverpassQuery(buildQuery());

  console.log(`\nParsing ${elements.length} OSM elements…`);

  const places: OsmPlace[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const el of elements as any[]) {
    const tags: Record<string, string> = el.tags ?? {};
    const name: string = tags.name ?? tags["name:en"] ?? tags["name:mk"] ?? "";
    if (!name.trim()) continue;

    // Coordinates: nodes have lat/lng directly; ways/relations use center
    const lat: number | null = el.lat ?? el.center?.lat ?? null;
    const lng: number | null = el.lon ?? el.center?.lon ?? null;

    const osmId = `${el.type}/${el.id}`;
    const amenity: string = tags.amenity ?? "restaurant";
    const cuisineRaw: string = tags.cuisine ?? "";
    const cuisine = cuisineRaw
      ? cuisineRaw.split(";").map((c) => c.trim().replace(/_/g, " ")).filter(Boolean)
      : [];

    const hoursRaw: string | null = tags.opening_hours ?? null;
    const openingHours = hoursRaw ? parseOpeningHours(hoursRaw) : null;

    places.push({
      osmId,
      name,
      amenity,
      address: buildAddress(tags),
      lat,
      lng,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? tags["contact:facebook"] ?? null,
      openingHours,
      cuisine,
      openingHoursRaw: hoursRaw,
    });
  }

  console.log(`\nParsed ${places.length} named venues.`);

  const withHours = places.filter((p) => p.openingHours).length;
  const withCuisine = places.filter((p) => p.cuisine.length > 0).length;
  const withPhone = places.filter((p) => p.phone).length;
  console.log(`  with hours:   ${withHours}`);
  console.log(`  with cuisine: ${withCuisine}`);
  console.log(`  with phone:   ${withPhone}`);

  // Preserve any existing data (e.g. from a previous run)
  if (existsSync(DATA_PATH)) {
    const existing = JSON.parse(readFileSync(DATA_PATH, "utf8")) as OsmPlace[];
    const existingIds = new Set(existing.map((p) => p.osmId));
    const newOnes = places.filter((p) => !existingIds.has(p.osmId));
    console.log(`\n${newOnes.length} new venues vs ${existing.length} existing — merging.`);
    writeFileSync(DATA_PATH, JSON.stringify([...existing, ...newOnes], null, 2));
  } else {
    writeFileSync(DATA_PATH, JSON.stringify(places, null, 2));
  }

  console.log(`\nDone. Written to ${DATA_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export { mapVenueType };
