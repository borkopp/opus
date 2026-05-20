// Matches existing Convex scraped orgs to OSM venues by coordinate proximity,
// then patches openingHours for any org that doesn't have them yet.
//
// Usage:  npm run enrich:hours

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { convex, ADMIN_KEY, api } from "./lib/convex.js";
import type { OsmPlace } from "./scrape-osm.js";

const OSM_PATH = path.resolve("data/osm-places.json");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function main() {
  if (!existsSync(OSM_PATH)) {
    console.error("data/osm-places.json not found.");
    process.exit(1);
  }

  const osmPlaces: OsmPlace[] = JSON.parse(readFileSync(OSM_PATH, "utf8"))
    .filter((p: OsmPlace) => p.openingHours && p.lat !== null && p.lng !== null);

  console.log(`Loaded ${osmPlaces.length} OSM places with opening hours.`);

  console.log("Fetching existing Convex scraped orgs…");
  const orgs = await convex.query(api.marketplace.scraped.listScrapedOrgs, {
    adminKey: ADMIN_KEY,
    missingField: "openingHours",
  });

  const candidates = orgs.filter(
    (o: (typeof orgs)[number]) => o.coordinates?.lat !== undefined && o.coordinates?.lng !== undefined,
  );
  console.log(`${candidates.length} orgs missing hours and have coordinates.\n`);

  let matched = 0;
  let updated = 0;

  for (const org of candidates) {
    const orgCoords = { lat: org.coordinates!.lat, lng: org.coordinates!.lng };

    // Find nearest OSM venue within 80m
    let best: OsmPlace | null = null;
    let bestDist = Infinity;

    for (const osm of osmPlaces) {
      const dist = distanceMetres(orgCoords, { lat: osm.lat!, lng: osm.lng! });
      if (dist < bestDist) {
        bestDist = dist;
        best = osm;
      }
    }

    if (!best || bestDist > 80) continue;
    matched++;

    process.stdout.write(
      `  "${org.name}" ↔ "${best.name}" (${Math.round(bestDist)}m)… `,
    );

    try {
      await convex.mutation(api.marketplace.scraped.updateScrapedOrg, {
        adminKey: ADMIN_KEY,
        id: org._id,
        patch: { openingHours: best.openingHours! },
      });
      updated++;
      console.log("✓");
    } catch (e) {
      console.log(`✗ ${(e as Error).message}`);
    }

    await sleep(50);
  }

  console.log(`\nMatched: ${matched} | Updated: ${updated} | No match: ${candidates.length - matched}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
