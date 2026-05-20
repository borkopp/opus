// Scrapes Skopje restaurants from Wolt's v1 pages API.
//
// All venue data (address, coords, tags, price range, cover image, 5 preview items)
// comes directly from sections[1] of the city page — no separate detail API needed.
// Full menus are attempted via the venue ID; fall back to preview items if unavailable.
//
// Usage:  npm run scrape:wolt
// Output: data/wolt-places.json

import "dotenv/config";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const DATA_PATH = path.resolve("data/wolt-places.json");
const WOLT_CITY_URL =
  "https://restaurant-api.wolt.com/v1/pages/restaurants?city=skopje&lat=41.9973&lon=21.4280";
const HEADERS = {
  "wolt-country-code": "mk",
  "Accept-Language": "en",
  "Accept": "application/json",
};

export interface WoltPlace {
  woltSlug: string;
  woltId: string;
  name: string;
  shortDescription: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  menuText: string | null;
  tags: string[];
  priceRange: "budget" | "mid" | "premium" | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  rating: number | null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Price range ──────────────────────────────────────────────────────────────

function mapPriceRange(level: number): "budget" | "mid" | "premium" | null {
  if (level === 1) return "budget";
  if (level === 2) return "mid";
  if (level >= 3) return "premium";
  return null;
}

// ── Full menu fetch (best-effort, not critical) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFullMenu(venueId: string): Promise<string | null> {
  // Try known menu endpoints with the venue ID
  const candidates = [
    `https://restaurant-api.wolt.com/v3/menus?venueId=${venueId}`,
    `https://restaurant-api.wolt.com/v3/menus/venue/${venueId}`,
    `https://consumer-api.wolt.com/v3/menus/venue/${venueId}`,
    `https://consumer-api.wolt.com/v1/menus?venue=${venueId}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      const categories = data?.categories ?? data?.menu?.categories ?? data?.results?.[0]?.categories ?? [];
      if (categories.length > 0) {
        return buildMenuText(categories);
      }
    } catch {
      // continue
    }
  }
  return null;
}

// ── Build menu markdown from preview items ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMenuText(categories: any[]): string {
  const lines: string[] = [];
  for (const cat of categories) {
    const catName: string = cat.name ?? "";
    const items = cat.items ?? [];
    if (items.length === 0) continue;
    lines.push(`\n## ${catName}`);
    for (const item of items) {
      const name: string = item.name ?? "";
      if (!name) continue;
      const priceMinor: number = item.baseprice ?? item.price ?? 0;
      const priceStr = priceMinor > 0 ? ` (${Math.round(priceMinor / 100)} MKD)` : "";
      const desc: string = item.description ?? "";
      lines.push(`- ${name}${priceStr}${desc ? " — " + desc.slice(0, 120) : ""}`);
    }
  }
  return lines.join("\n").trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMenuTextFromPreviews(items: any[]): string {
  if (!items || items.length === 0) return "";
  const lines = ["## Menu highlights"];
  for (const item of items) {
    const name: string = item.name ?? "";
    if (!name) continue;
    const priceMinor: number = item.price ?? 0;
    const priceStr = priceMinor > 0 ? ` (${Math.round(priceMinor / 100)} MKD)` : "";
    lines.push(`- ${name}${priceStr}`);
  }
  return lines.join("\n");
}

// ── Fetch all venues from city page ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllVenues(): Promise<any[]> {
  const res = await fetch(WOLT_CITY_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`City page fetch failed: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as any;
  const sections = data?.sections ?? [];

  // Find the venue listing section (template = "venue-vertical-list")
  const venueSection = sections.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s?.name === "restaurants-delivering-venues" || s?.template?.includes("venue"),
  );
  if (!venueSection) throw new Error("Could not find venue list section in Wolt response");

  return venueSection.items ?? [];
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const existing = new Map<string, WoltPlace>();
  if (existsSync(DATA_PATH)) {
    const saved = JSON.parse(readFileSync(DATA_PATH, "utf8")) as WoltPlace[];
    for (const p of saved) existing.set(p.woltSlug, p);
    console.log(`Loaded ${existing.size} existing Wolt records.`);
  }

  console.log("Fetching Wolt city page…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = await fetchAllVenues();
  console.log(`Found ${items.length} venues in city page.`);

  // Filter to ones we haven't fetched full menu for yet
  const toProcess = items.filter((item) => {
    const slug: string = item?.venue?.slug ?? item?.track_id?.replace("venue-", "") ?? "";
    const existing_entry = existing.get(slug);
    // Re-process if we have no menuText at all (try full menu endpoint)
    return !existing_entry || !existing_entry.menuText;
  });
  console.log(`${toProcess.length} venues to process (full menu attempt).\n`);

  let count = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of items as any[]) {
    const venue = item?.venue;
    if (!venue?.slug) continue;

    const slug: string = venue.slug;
    const venueId: string = venue.id ?? "";

    // Coordinates: Wolt uses [lng, lat] array
    const loc: number[] = venue.location ?? [];
    const lng = loc[0] ?? null;
    const lat = loc[1] ?? null;

    // Cover image comes from the item-level image, not venue
    const coverImageUrl: string | null =
      item?.image?.url ?? venue?.cover_image?.url ?? null;
    const logoUrl: string | null = venue?.brand_image?.url ?? null;

    // Preview items (5 top dishes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previewItems: any[] = venue?.venue_preview_items ?? [];
    const previewMenuText = buildMenuTextFromPreviews(previewItems);

    // Try to get full menu if this is a new or menuText-less entry
    const needsFullMenu = !existing.get(slug)?.menuText;
    let menuText: string | null = existing.get(slug)?.menuText ?? null;

    if (needsFullMenu && venueId) {
      process.stdout.write(`  ${venue.name} — fetching full menu… `);
      const full = await fetchFullMenu(venueId);
      if (full) {
        menuText = full;
        console.log(`✓ ${full.split("\n").length} lines`);
      } else {
        // Fall back to preview items
        menuText = previewMenuText || null;
        console.log(previewMenuText ? `~ preview only (${previewItems.length} items)` : "✗ none");
      }
      await sleep(150);
    }

    const place: WoltPlace = {
      woltSlug: slug,
      woltId: venueId,
      name: venue.name,
      shortDescription: venue.short_description ?? venue.short_description_v2?.value ?? null,
      address: venue.address ?? null,
      lat,
      lng,
      phone: null, // not available in listing API
      menuText,
      tags: venue.tags ?? [],
      priceRange: mapPriceRange(venue.price_range ?? 0),
      coverImageUrl,
      logoUrl,
      rating: venue.rating?.score ?? null,
    };

    existing.set(slug, place);
    count++;

    if (count % 50 === 0) {
      writeFileSync(DATA_PATH, JSON.stringify([...existing.values()], null, 2));
      console.log(`  Checkpoint: ${count} processed.`);
    }
  }

  writeFileSync(DATA_PATH, JSON.stringify([...existing.values()], null, 2));

  const withCoords = [...existing.values()].filter((p) => p.lat !== null).length;
  const withMenu = [...existing.values()].filter((p) => p.menuText).length;
  const withCover = [...existing.values()].filter((p) => p.coverImageUrl).length;
  console.log(`\nDone. ${existing.size} venues written to ${DATA_PATH}`);
  console.log(`  with coords: ${withCoords} | with menu: ${withMenu} | with cover: ${withCover}`);
  console.log(`\nNext: npm run upsert`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
