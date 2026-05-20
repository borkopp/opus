// Merges OSM + Wolt data and upserts to Convex.
//
// Matching strategy:
//   1. For each OSM venue, look for a Wolt venue within 200m with a similar name.
//   2. Matched: use OSM as canonical (better hours/address), Wolt adds menuText + cover photo.
//   3. Unmatched Wolt venues are upserted on their own.
//
// Usage:  npm run upsert
//
// Idempotent: re-running updates existing records without creating duplicates.

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { convex, ADMIN_KEY, api } from "./lib/convex.js";
import type { OsmPlace } from "./scrape-osm.js";

const OSM_PATH = path.resolve("data/osm-places.json");
const WOLT_PATH = path.resolve("data/wolt-places.json");

// ── Wolt type ────────────────────────────────────────────────────────────────

interface WoltPlace {
  woltSlug: string;
  woltId?: string;
  name: string;
  shortDescription?: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  menuText: string | null;
  tags: string[];
  priceRange: "budget" | "mid" | "premium" | null;
  coverImageUrl: string | null;
  logoUrl?: string | null;
  rating?: number | null;
}

// ── Slug generation ──────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function makeSlug(name: string, osmId: string): string {
  const base = toSlug(name);
  const suffix = osmId.replace(/\D/g, "").slice(-5);
  return `${base}-${suffix}`;
}

// ── Haversine distance ───────────────────────────────────────────────────────

function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normaliseName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ── Venue type from OSM amenity ───────────────────────────────────────────────

function mapVenueType(amenity: string): "restaurant" | "cafe" | "bar" | "club" {
  if (amenity === "cafe" || amenity === "coffee_shop") return "cafe";
  if (amenity === "bar" || amenity === "pub" || amenity === "biergarten") return "bar";
  if (amenity === "nightclub") return "club";
  return "restaurant";
}

// ── Merged type ───────────────────────────────────────────────────────────────

interface MergedPlace {
  osmId: string | null;
  woltSlug: string | null;
  name: string;
  slug: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  venueType: "restaurant" | "cafe" | "bar" | "club" | null;
  openingHours: Array<{ dayOfWeek: number; open: string; close: string; isClosed: boolean }> | null;
  menuText: string | null;
  bio: string | null;
  cuisine: string[];
  priceRange: "budget" | "mid" | "premium" | null;
  photos: Array<{ url: string; type: "cover" | "gallery" | "menu" }>;
}

// ── Merge ────────────────────────────────────────────────────────────────────

function merge(osm: OsmPlace[], wolt: WoltPlace[]): MergedPlace[] {
  const merged: MergedPlace[] = [];
  const usedWoltSlugs = new Set<string>();

  for (const o of osm) {
    let matchedWolt: WoltPlace | null = null;

    if (o.lat !== null && o.lng !== null) {
      const normO = normaliseName(o.name);
      for (const w of wolt) {
        if (usedWoltSlugs.has(w.woltSlug)) continue;
        if (w.lat === null || w.lng === null) continue;
        const dist = distanceMetres(
          { lat: o.lat, lng: o.lng },
          { lat: w.lat, lng: w.lng },
        );
        const nameMatch =
          normaliseName(w.name) === normO ||
          normaliseName(w.name).includes(normO) ||
          normO.includes(normaliseName(w.name));
        if (dist < 200 && nameMatch) {
          matchedWolt = w;
          usedWoltSlugs.add(w.woltSlug);
          break;
        }
      }
    }

    const photos: MergedPlace["photos"] = [];
    if (matchedWolt?.coverImageUrl) {
      photos.push({ url: matchedWolt.coverImageUrl, type: "cover" });
    }

    merged.push({
      osmId: o.osmId,
      woltSlug: matchedWolt?.woltSlug ?? null,
      name: o.name,
      slug: makeSlug(o.name, o.osmId),
      address: o.address,
      lat: o.lat,
      lng: o.lng,
      phone: o.phone ?? matchedWolt?.phone ?? null,
      website: o.website,
      venueType: mapVenueType(o.amenity),
      openingHours: o.openingHours,
      menuText: matchedWolt?.menuText ?? null,
      bio: matchedWolt?.shortDescription ?? null,
      cuisine: o.cuisine.length > 0 ? o.cuisine : matchedWolt?.tags ?? [],
      priceRange: matchedWolt?.priceRange ?? null,
      photos,
    });
  }

  // Wolt-only venues not matched to any OSM entry
  for (const w of wolt) {
    if (usedWoltSlugs.has(w.woltSlug)) continue;
    const photos: MergedPlace["photos"] = w.coverImageUrl
      ? [{ url: w.coverImageUrl, type: "cover" as const }]
      : [];
    merged.push({
      osmId: null,
      woltSlug: w.woltSlug,
      name: w.name,
      slug: makeSlug(w.name, w.woltSlug),
      address: w.address,
      lat: w.lat,
      lng: w.lng,
      phone: w.phone,
      website: null,
      venueType: "restaurant",
      openingHours: null,
      menuText: w.menuText,
      bio: w.shortDescription ?? null,
      cuisine: w.tags,
      priceRange: w.priceRange,
      photos,
    });
  }

  return merged;
}

// ── Upsert to Convex ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function upsertAll(places: MergedPlace[]) {
  console.log(`\nUpserting ${places.length} places to Convex…`);
  let inserted = 0, updated = 0, errors = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    try {
      const result = await convex.mutation(api.marketplace.scraped.upsertScrapedOrg, {
        adminKey: ADMIN_KEY,
        name: p.name,
        slug: p.slug,
        industry: "hospitality" as const,
        venueType: p.venueType ?? undefined,
        address: p.address ?? undefined,
        city: "Skopje",
        country: "MK",
        coordinates:
          p.lat !== null && p.lng !== null
            ? { lat: p.lat, lng: p.lng }
            : undefined,
        phone: p.phone ?? undefined,
        websiteUrl: p.website ?? undefined,
        cuisine: p.cuisine.length > 0 ? p.cuisine.slice(0, 8) : undefined,
        tags: p.cuisine.length > 0 ? p.cuisine : undefined,
        priceRange: p.priceRange ?? undefined,
        openingHours: p.openingHours ?? undefined,
        menuText: p.menuText ?? undefined,
        bio: p.bio ?? undefined,
        woltSlug: p.woltSlug ?? undefined,
        photos: p.photos.length > 0 ? p.photos : undefined,
      });

      if (result.action === "inserted") inserted++;
      else updated++;

      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${places.length} (↑${inserted} new, ↻${updated} updated)`);
      }
    } catch (err) {
      console.error(`  Error upserting "${p.name}":`, err);
      errors++;
    }

    await sleep(50);
  }

  console.log(`\nFinished. ↑${inserted} inserted, ↻${updated} updated, ✗${errors} errors.`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const osm: OsmPlace[] = existsSync(OSM_PATH)
    ? JSON.parse(readFileSync(OSM_PATH, "utf8"))
    : [];
  const wolt: WoltPlace[] = existsSync(WOLT_PATH)
    ? JSON.parse(readFileSync(WOLT_PATH, "utf8"))
    : [];

  if (osm.length === 0 && wolt.length === 0) {
    console.error("No data found. Run scrape:osm and/or scrape:wolt first.");
    process.exit(1);
  }

  console.log(`Loaded ${osm.length} OSM + ${wolt.length} Wolt places.`);

  const merged = merge(osm, wolt);
  console.log(`After merge: ${merged.length} unique venues.`);

  const withMenu = merged.filter((p) => p.menuText).length;
  const withHours = merged.filter((p) => p.openingHours).length;
  const withPhotos = merged.filter((p) => p.photos.length > 0).length;
  console.log(`  with menu:   ${withMenu}`);
  console.log(`  with hours:  ${withHours}`);
  console.log(`  with photos: ${withPhotos}`);

  await upsertAll(merged);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
