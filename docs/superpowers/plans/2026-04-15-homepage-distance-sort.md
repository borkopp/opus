# Homepage Distance Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort opus-mk homepage business listings by distance from the user's location and show a distance badge on each card.

**Architecture:** Browser geolocation is requested once on mount via a shared hook. When coordinates resolve, the listings grid briefly fades out, items are re-sorted client-side by haversine distance, and the grid fades back in with distance badges visible. Businesses without stored coordinates fall to the end. Applies to both category listings and search results.

**Tech Stack:** Next.js 16 App Router, Convex, React hooks, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `opus-mk/lib/format.ts` | Modify | Add `calcDistanceMeters` and `formatDistance` |
| `opus-mk/hooks/use-user-location.ts` | Create | One-shot browser geolocation hook |
| `opus-dashboard/convex/public.ts` | Modify | Add `coordinates` to `listPublished` and `searchPublished` return shapes |
| `opus-mk/app/page.tsx` | Modify | Location hook, distance sort, fade transition, distance badge |
| `opus-mk/components/BusinessMap.tsx` | Modify | Replace local `fmt_distance` with shared `formatDistance` |

---

### Task 1: Add distance utilities to `lib/format.ts`

**Files:**
- Modify: `opus-mk/lib/format.ts`

- [ ] **Step 1: Add `calcDistanceMeters` and `formatDistance` to the end of the file**

```ts
/** Haversine distance between two lat/lng points, in metres */
export function calcDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format metres to a human-readable string: "450 m" or "1.4 km" */
export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}
```

- [ ] **Step 2: Commit**

```bash
cd opus-mk && git add lib/format.ts && git commit -m "feat: add calcDistanceMeters and formatDistance utilities"
```

---

### Task 2: Create `hooks/use-user-location.ts`

**Files:**
- Create: `opus-mk/hooks/use-user-location.ts`

- [ ] **Step 1: Create the file**

```ts
"use client";

import { useState, useEffect } from "react";

export type LocationState = "idle" | "loading" | "granted" | "denied";

export interface UserLocation {
  coords: { lat: number; lng: number } | null;
  state: LocationState;
}

/**
 * Requests the browser's geolocation once on mount.
 * Returns coords + a state flag. No retry support — callers
 * should handle the "denied" state gracefully (e.g. skip sort).
 */
export function useUserLocation(): UserLocation {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<LocationState>("idle");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setState("granted");
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  return { coords, state };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-user-location.ts && git commit -m "feat: add useUserLocation hook"
```

---

### Task 3: Add `coordinates` to Convex public queries

**Files:**
- Modify: `opus-dashboard/convex/public.ts`

`listPublished` maps org fields at line ~103. `searchPublished` maps at line ~302. Add `coordinates: o.coordinates` to both.

- [ ] **Step 1: In `listPublished`, add `coordinates` to the returned item map**

Find this block (around line 103–124):
```ts
        return {
            items: page.map((o) => ({
                _id: o._id,
                name: o.name,
                slug: o.slug,
                industry: o.industry,
                logoUrl: o.logoUrl,
                tagline: o.tagline,
                city: o.city,
                neighborhood: o.neighborhood,
                tags: o.tags,
                priceRange: o.priceRange,
                averageRating: o.averageRating,
                reviewCount: o.reviewCount,
                isFeatured: !!(o.featuredUntil && o.featuredUntil > now),
                beautyCategory: o.beautyCategory,
                cuisine: o.cuisine,
                venueType: o.venueType,
            })),
```

Add `coordinates: o.coordinates,` after `venueType: o.venueType,`:
```ts
        return {
            items: page.map((o) => ({
                _id: o._id,
                name: o.name,
                slug: o.slug,
                industry: o.industry,
                logoUrl: o.logoUrl,
                tagline: o.tagline,
                city: o.city,
                neighborhood: o.neighborhood,
                tags: o.tags,
                priceRange: o.priceRange,
                averageRating: o.averageRating,
                reviewCount: o.reviewCount,
                isFeatured: !!(o.featuredUntil && o.featuredUntil > now),
                beautyCategory: o.beautyCategory,
                cuisine: o.cuisine,
                venueType: o.venueType,
                coordinates: o.coordinates,
            })),
```

- [ ] **Step 2: In `searchPublished`, add `coordinates` to the returned map**

Find this block (around line 302–314):
```ts
        return filtered.map((o) => ({
            _id: o._id,
            name: o.name,
            slug: o.slug,
            industry: o.industry,
            logoUrl: o.logoUrl,
            tagline: o.tagline,
            city: o.city,
            averageRating: o.averageRating,
            reviewCount: o.reviewCount,
            priceRange: o.priceRange,
            beautyCategory: o.beautyCategory,
        }));
```

Replace with:
```ts
        return filtered.map((o) => ({
            _id: o._id,
            name: o.name,
            slug: o.slug,
            industry: o.industry,
            logoUrl: o.logoUrl,
            tagline: o.tagline,
            city: o.city,
            averageRating: o.averageRating,
            reviewCount: o.reviewCount,
            priceRange: o.priceRange,
            beautyCategory: o.beautyCategory,
            coordinates: o.coordinates,
        }));
```

- [ ] **Step 3: Commit**

```bash
cd ../opus-dashboard && git add convex/public.ts && git commit -m "feat: expose coordinates in listPublished and searchPublished"
```

---

### Task 4: Update `BusinessMap` to use shared `formatDistance`

**Files:**
- Modify: `opus-mk/components/BusinessMap.tsx`

- [ ] **Step 1: Add the import for `formatDistance`**

At the top of `BusinessMap.tsx`, add to the existing lib import or add a new one:
```ts
import { formatDistance } from "@/lib/format";
```

- [ ] **Step 2: Remove the local `fmt_distance` function**

Delete these lines (around line 59–62):
```ts
function fmt_distance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
```

- [ ] **Step 3: Replace the one call site of `fmt_distance` with `formatDistance`**

Find (around line 264):
```ts
              {fmt_distance(route.distance)}
```

Replace with:
```ts
              {formatDistance(route.distance)}
```

- [ ] **Step 4: Verify the map still renders correctly**

Run `cd opus-mk && npm run dev` and open a business profile page. The map should load, request location, and show the distance pill (e.g. "3 min · 450 m") as before.

- [ ] **Step 5: Commit**

```bash
cd opus-mk && git add components/BusinessMap.tsx && git commit -m "refactor: use shared formatDistance in BusinessMap"
```

---

### Task 5: Integrate distance sort, fade, and badge into homepage

**Files:**
- Modify: `opus-mk/app/page.tsx`

- [ ] **Step 1: Add imports at the top of `page.tsx`**

Add after the existing imports:
```ts
import { useUserLocation } from "@/hooks/use-user-location";
import { calcDistanceMeters, formatDistance } from "@/lib/format";
```

Also add `useMemo, useEffect, useRef` to the React import if not already present:
```ts
import { useState, useMemo, useEffect, useRef } from "react";
```

- [ ] **Step 2: Add the location hook and fade state inside `DiscoverPage`**

After the existing `useState` declarations, add:
```ts
  const { coords } = useUserLocation();
  const [gridVisible, setGridVisible] = useState(true);
  const prevCoordsRef = useRef<typeof coords>(null);
```

- [ ] **Step 3: Add the fade effect — triggers once when coords first resolves**

After the existing `useQuery` calls, add:
```ts
  useEffect(() => {
    if (coords && !prevCoordsRef.current) {
      setGridVisible(false);
      const t = setTimeout(() => setGridVisible(true), 180);
      prevCoordsRef.current = coords;
      return () => clearTimeout(t);
    }
    prevCoordsRef.current = coords;
  }, [coords]);
```

- [ ] **Step 4: Add the sorted items derivation**

Replace the existing line:
```ts
  const displayItems = searchQuery.length >= 2 ? searchResults : listings?.items;
```

With:
```ts
  const rawItems = searchQuery.length >= 2 ? searchResults : listings?.items;

  const displayItems = useMemo(() => {
    if (!rawItems || !coords) return rawItems;
    return [...rawItems].sort((a, b) => {
      const da = a.coordinates
        ? calcDistanceMeters(coords.lat, coords.lng, a.coordinates.lat, a.coordinates.lng)
        : Infinity;
      const db = b.coordinates
        ? calcDistanceMeters(coords.lat, coords.lng, b.coordinates.lat, b.coordinates.lng)
        : Infinity;
      return da - db;
    });
  }, [rawItems, coords]);
```

- [ ] **Step 5: Add `transition-opacity` and `gridVisible` to the results grid**

Find the results grid div (around line 193):
```tsx
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

Replace with:
```tsx
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-150"
            style={{ opacity: gridVisible ? 1 : 0 }}
          >
```

Also apply the same to the loading skeletons grid (around line 186) so the skeleton doesn't flash on re-sort:
```tsx
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```
Leave the skeleton grid unchanged — it only shows during initial load, before coords could arrive.

- [ ] **Step 6: Add the distance badge to each card**

Find the location chip block inside the card (around line 235–240):
```tsx
                      {org.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconMapPin size={12} aria-hidden="true" />
                          <span>{org.city}</span>
                        </div>
                      )}
```

Replace with:
```tsx
                      {org.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconMapPin size={12} aria-hidden="true" />
                          <span>{org.city}</span>
                        </div>
                      )}
                      {coords && org.coordinates && (
                        <div className="text-xs text-muted-foreground">
                          {formatDistance(
                            calcDistanceMeters(
                              coords.lat,
                              coords.lng,
                              org.coordinates.lat,
                              org.coordinates.lng,
                            ),
                          )}{" "}
                          away
                        </div>
                      )}
```

- [ ] **Step 7: Verify end-to-end in the browser**

Run `npm run dev` from `opus-mk/`. Open `http://localhost:3001`.

Expected behaviour:
1. Page loads — businesses appear in default order (featured → rating), no distance labels
2. Browser prompts for location permission — grant it
3. Grid briefly fades (~180ms) and re-sorts closest-first
4. Each card with coordinates shows e.g. "450 m away" or "1.4 km away" next to the city chip
5. Cards for businesses without coordinates move to the end, no distance label shown
6. Search: type 2+ chars → results appear → if location already granted, results are sorted by distance

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx && git commit -m "feat: sort homepage listings by distance and show distance badge"
```
