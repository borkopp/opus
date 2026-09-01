export interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

export interface MapboxFeature {
  id: string;
  text: string;
  address?: string;
  place_name: string;
  center: [number, number];
  context?: MapboxContext[];
  properties?: {
    short_code?: string;
  };
}

export interface BusinessLocation {
  address: string;
  city: string;
  neighborhood: string;
  postalCode: string;
  country: string;
  coordinates: { lat: number; lng: number };
  displayName: string;
}

export type MapboxTravelMode = "driving" | "walking";

export interface MapboxRoute {
  durationSeconds: number;
  distanceMeters: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

function contextValue(
  feature: MapboxFeature,
  prefixes: string[],
): MapboxContext | undefined {
  return feature.context?.find((item) =>
    prefixes.some((prefix) => item.id.startsWith(prefix)),
  );
}

export function parseMapboxFeature(feature: MapboxFeature): BusinessLocation {
  const [lng, lat] = feature.center;
  const place = contextValue(feature, ["place"]);
  const locality = contextValue(feature, [
    "locality",
    "district",
    "neighborhood",
  ]);
  const postcode = contextValue(feature, ["postcode"]);
  const country = contextValue(feature, ["country"]);

  return {
    address:
      [feature.address, feature.text].filter(Boolean).join(" ").trim() ||
      feature.place_name.split(",")[0]?.trim() ||
      "",
    city: place?.text ?? "",
    neighborhood: locality?.text ?? "",
    postalCode: postcode?.text ?? "",
    country:
      country?.short_code?.toUpperCase() ??
      feature.properties?.short_code?.toUpperCase() ??
      "MK",
    coordinates: { lat, lng },
    displayName: feature.place_name,
  };
}

function mapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Mapbox is not configured.");
  return token;
}

export async function getMapboxDirections({
  origin,
  destination,
  mode,
  signal,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: MapboxTravelMode;
  signal?: AbortSignal;
}): Promise<MapboxRoute> {
  const profile =
    mode === "driving" ? "mapbox/driving-traffic" : "mapbox/walking";
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/${profile}/${coordinates}`,
  );
  url.searchParams.set("access_token", mapboxToken());
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Directions request failed.");

  const data = (await response.json()) as {
    routes?: Array<{
      duration?: number;
      distance?: number;
      geometry?: {
        type?: string;
        coordinates?: number[][];
      };
    }>;
  };
  const route = data.routes?.[0];
  const routeCoordinates = route?.geometry?.coordinates;

  if (
    route?.duration === undefined ||
    route.distance === undefined ||
    route.geometry?.type !== "LineString" ||
    !routeCoordinates ||
    routeCoordinates.length < 2 ||
    routeCoordinates.some(
      (coordinate) =>
        coordinate.length < 2 ||
        !Number.isFinite(coordinate[0]) ||
        !Number.isFinite(coordinate[1]),
    )
  ) {
    throw new Error("No usable route was returned.");
  }

  return {
    durationSeconds: route.duration,
    distanceMeters: route.distance,
    geometry: {
      type: "LineString",
      coordinates: routeCoordinates.map(([lng, lat]) => [lng, lat]),
    },
  };
}

export function formatMapboxDuration(durationSeconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} мин`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

export function formatMapboxDistance(distanceMeters: number): string {
  if (distanceMeters < 1000)
    return `${Math.max(1, Math.round(distanceMeters))} м`;

  return `${new Intl.NumberFormat("mk-MK", {
    maximumFractionDigits: 1,
  }).format(distanceMeters / 1000)} км`;
}

export async function searchMapbox(
  query: string,
  signal?: AbortSignal,
): Promise<MapboxFeature[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("access_token", mapboxToken());
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "address,poi,place,locality,neighborhood");

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Address search failed.");
  const data = (await response.json()) as { features?: MapboxFeature[] };
  return data.features ?? [];
}

export async function reverseGeocodeMapbox(
  coordinates: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<BusinessLocation | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json`,
  );
  url.searchParams.set("access_token", mapboxToken());
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Map location could not be resolved.");
  const data = (await response.json()) as { features?: MapboxFeature[] };
  const feature = data.features?.[0];
  return feature ? parseMapboxFeature(feature) : null;
}
