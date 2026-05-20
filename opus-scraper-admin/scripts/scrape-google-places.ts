// Scrapes Skopje restaurants/bars/cafes via Google Places API (New).
//
// Usage:
//   npm run scrape:google                   # all tiles, all types
//   npm run scrape:google -- --tile 0       # single tile (for testing)
//
// Output: data/google-places.json
//
// Rate limits: 60 QPS on Places API (New). We add 200ms delay between requests.

import "dotenv/config";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not set in .env");

import { SKOPJE_TILES, SEARCH_RADIUS_METERS } from "./lib/skopje-tiles.js";

const DATA_PATH = path.resolve("data/google-places.json");

const PLACE_TYPES = ["restaurant", "bar", "cafe", "night_club"];

// ── Types ──────────────────────────────────────────────────────────────────

interface GooglePlace {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: number | null; // 0–4
  types: string[];
  openingHours: DayHours[] | null;
  photos: string[]; // up to 5 photo URLs
  editorialSummary: string | null;
  googleMapsUri: string | null;
}

interface DayHours {
  dayOfWeek: number; // 0=Mon … 6=Sun (ISO, matching schema)
  open: string; // "09:00"
  close: string; // "21:00"
  isClosed: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Nearby Search (New API) ─────────────────────────────────────────────────

async function nearbySearch(
  lat: number,
  lng: number,
  type: string,
): Promise<string[]> {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    includedTypes: [type],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: SEARCH_RADIUS_METERS,
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.warn(`nearbySearch failed (${res.status}): ${await res.text()}`);
    return [];
  }

  const data = await res.json() as { places?: Array<{ id: string }> };
  return (data.places ?? []).map((p) => p.id);
}

// ── Place Details (New API) ─────────────────────────────────────────────────

async function getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
  const fields = [
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "nationalPhoneNumber",
    "websiteUri",
    "rating",
    "userRatingCount",
    "priceLevel",
    "types",
    "currentOpeningHours",
    "regularOpeningHours",
    "photos",
    "editorialSummary",
    "googleMapsUri",
  ].join(",");

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": fields,
    },
  });

  if (!res.ok) {
    console.warn(`getPlaceDetails(${placeId}) failed (${res.status})`);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = await res.json() as any;

  // Parse opening hours (regularOpeningHours preferred over currentOpeningHours).
  const hoursSource = p.regularOpeningHours ?? p.currentOpeningHours;
  let openingHours: DayHours[] | null = null;
  if (hoursSource?.periods) {
    openingHours = parseHoursPeriods(hoursSource.periods);
  }

  // Build photo reference URLs (up to 5).
  const photos: string[] = [];
  if (p.photos) {
    for (const photo of (p.photos as Array<{ name: string }>).slice(0, 5)) {
      photos.push(
        `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&key=${API_KEY}`,
      );
    }
  }

  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  return {
    placeId: p.id ?? placeId,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    priceLevel: priceLevelMap[p.priceLevel] ?? null,
    types: p.types ?? [],
    openingHours,
    photos,
    editorialSummary: p.editorialSummary?.text ?? null,
    googleMapsUri: p.googleMapsUri ?? null,
  };
}

// ── Hours parsing ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHoursPeriods(periods: any[]): DayHours[] {
  // Google API: day 0 = Sunday; schema uses ISO (0 = Monday).
  // Convert: ISO = (googleDay + 6) % 7
  const map = new Map<number, DayHours>();

  // Initialise all days as closed.
  for (let i = 0; i < 7; i++) {
    map.set(i, { dayOfWeek: i, open: "", close: "", isClosed: true });
  }

  for (const period of periods) {
    if (!period.open) continue;
    const googleDay: number = period.open.day ?? 0;
    const isoDay = (googleDay + 6) % 7;
    const open = formatTime(period.open.hour, period.open.minute);
    const close = period.close
      ? formatTime(period.close.hour, period.close.minute)
      : "23:59";
    map.set(isoDay, { dayOfWeek: isoDay, open, close, isClosed: false });
  }

  return Array.from(map.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute ?? 0).padStart(2, "0")}`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const tileArg = args.indexOf("--tile");
  const singleTile = tileArg !== -1 ? parseInt(args[tileArg + 1]) : null;

  const tiles = singleTile !== null ? [SKOPJE_TILES[singleTile]] : SKOPJE_TILES;

  // Load existing checkpoint to avoid re-fetching details.
  const existing: Map<string, GooglePlace> = new Map();
  if (existsSync(DATA_PATH)) {
    const saved = JSON.parse(readFileSync(DATA_PATH, "utf8")) as GooglePlace[];
    for (const p of saved) existing.set(p.placeId, p);
    console.log(`Loaded ${existing.size} existing records from checkpoint.`);
  }

  const allPlaceIds = new Set<string>(existing.keys());

  // Step 1: Collect place IDs from nearby search.
  console.log(`\nStep 1: Nearby search across ${tiles.length} tile(s)…`);
  for (const tile of tiles) {
    for (const type of PLACE_TYPES) {
      process.stdout.write(`  ${tile.label} / ${type}… `);
      const ids = await nearbySearch(tile.lat, tile.lng, type);
      let newCount = 0;
      for (const id of ids) {
        if (!allPlaceIds.has(id)) {
          allPlaceIds.add(id);
          newCount++;
        }
      }
      console.log(`${ids.length} results, ${newCount} new`);
      await sleep(200);
    }
  }

  console.log(`\nTotal unique place IDs: ${allPlaceIds.size}`);

  // Step 2: Fetch details for any place not already in checkpoint.
  const idsNeedingDetails = [...allPlaceIds].filter((id) => !existing.has(id));
  console.log(`\nStep 2: Fetching details for ${idsNeedingDetails.length} new places…`);

  let fetched = 0;
  for (const id of idsNeedingDetails) {
    const place = await getPlaceDetails(id);
    if (place) {
      existing.set(id, place);
      fetched++;
      if (fetched % 10 === 0) {
        console.log(`  Fetched ${fetched}/${idsNeedingDetails.length}…`);
        // Checkpoint every 10 records.
        writeFileSync(DATA_PATH, JSON.stringify([...existing.values()], null, 2));
      }
    }
    await sleep(200);
  }

  const places = [...existing.values()];
  writeFileSync(DATA_PATH, JSON.stringify(places, null, 2));
  console.log(`\nDone. ${places.length} places written to ${DATA_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
