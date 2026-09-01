export interface MapboxContext {
  id: string;
  text: string;
  short_code?: string | null;
}

export interface MapboxFeature {
  id: string;
  text: string;
  address?: string | null;
  place_name: string;
  center: [number, number];
  place_type?: string[];
  context?: MapboxContext[];
  properties?: {
    address?: string | null;
    short_code?: string | null;
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

const NORTH_MACEDONIA_COUNTRY_CODE = "MK";
const MAX_ADDRESS_LENGTH = 200;
const MAX_CITY_LENGTH = 100;
export const NORTH_MACEDONIA_MAP_BOUNDS = {
  west: 20.3,
  south: 40.7,
  east: 23.2,
  north: 42.5,
} as const;

export function isCoordinateInNorthMacedonia(coordinates: {
  lat: number;
  lng: number;
}): boolean {
  return (
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lat >= NORTH_MACEDONIA_MAP_BOUNDS.south &&
    coordinates.lat <= NORTH_MACEDONIA_MAP_BOUNDS.north &&
    coordinates.lng >= NORTH_MACEDONIA_MAP_BOUNDS.west &&
    coordinates.lng <= NORTH_MACEDONIA_MAP_BOUNDS.east
  );
}

function featureHasType(feature: MapboxFeature, type: string): boolean {
  return (
    feature.place_type?.includes(type) === true ||
    feature.id.startsWith(`${type}.`)
  );
}

function contextValue(
  feature: MapboxFeature,
  prefixes: string[],
): MapboxContext | undefined {
  for (const prefix of prefixes) {
    const match = feature.context?.find((item) =>
      item.id.startsWith(`${prefix}.`),
    );
    if (match) return match;
  }
  return undefined;
}

function normalizedCountryCode(value: string | null | undefined): string {
  const code = value?.trim().split("-")[0]?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : "";
}

function isMapboxContext(value: unknown): value is MapboxContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Record<string, unknown>;
  return (
    typeof context.id === "string" &&
    typeof context.text === "string" &&
    (context.short_code == null || typeof context.short_code === "string")
  );
}

function isMapboxFeature(value: unknown): value is MapboxFeature {
  if (!value || typeof value !== "object") return false;
  const feature = value as Record<string, unknown>;
  const center = feature.center;
  const context = feature.context;
  const placeType = feature.place_type;
  const properties = feature.properties;
  return (
    typeof feature.id === "string" &&
    typeof feature.text === "string" &&
    typeof feature.place_name === "string" &&
    (feature.address == null || typeof feature.address === "string") &&
    Array.isArray(center) &&
    center.length >= 2 &&
    typeof center[0] === "number" &&
    typeof center[1] === "number" &&
    Number.isFinite(center[0]) &&
    Number.isFinite(center[1]) &&
    (placeType === undefined ||
      (Array.isArray(placeType) &&
        placeType.every((item) => typeof item === "string"))) &&
    (context === undefined ||
      (Array.isArray(context) && context.every(isMapboxContext))) &&
    (properties === undefined ||
      (Boolean(properties) &&
        typeof properties === "object" &&
        ((properties as Record<string, unknown>).address == null ||
          typeof (properties as Record<string, unknown>).address ===
            "string") &&
        ((properties as Record<string, unknown>).short_code == null ||
          typeof (properties as Record<string, unknown>).short_code ===
            "string")))
  );
}

function mapboxFeatures(data: unknown): MapboxFeature[] {
  if (!data || typeof data !== "object") return [];
  const features = (data as { features?: unknown }).features;
  return Array.isArray(features) ? features.filter(isMapboxFeature) : [];
}

export function getBusinessLocationError(
  location: BusinessLocation | null,
): string | null {
  if (!location) return "Choose an address from the suggestions.";

  const address = location.address.trim();
  const city = location.city.trim();
  if (!address || !city) {
    return "Choose a result that includes both an address and city.";
  }
  if (address.length > MAX_ADDRESS_LENGTH || city.length > MAX_CITY_LENGTH) {
    return "This address is too long. Choose a more specific result.";
  }
  if (location.country.trim().toUpperCase() !== NORTH_MACEDONIA_COUNTRY_CODE) {
    return "Choose a location in North Macedonia.";
  }
  if (
    !Number.isFinite(location.coordinates.lat) ||
    !Number.isFinite(location.coordinates.lng) ||
    Math.abs(location.coordinates.lat) > 90 ||
    Math.abs(location.coordinates.lng) > 180
  ) {
    return "The selected map pin is invalid. Choose the location again.";
  }
  if (!isCoordinateInNorthMacedonia(location.coordinates)) {
    return "Choose a location in North Macedonia.";
  }
  return null;
}

export function parseMapboxFeature(feature: MapboxFeature): BusinessLocation {
  const [lng, lat] = feature.center;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Mapbox returned invalid coordinates.");
  }

  const featureText = feature.text.trim();
  const place = contextValue(feature, [
    "place",
    "locality",
    "district",
    "region",
  ]);
  const locality = contextValue(feature, ["neighborhood", "locality"]);
  const postcode = contextValue(feature, ["postcode"]);
  const country = contextValue(feature, ["country"]);
  const city =
    featureHasType(feature, "place") || featureHasType(feature, "locality")
      ? featureText
      : (place?.text.trim() ?? "");
  const neighborhood = featureHasType(feature, "neighborhood")
    ? featureText
    : (locality?.text.trim() ?? "");
  const streetAddress = [feature.address?.trim(), featureText]
    .filter(Boolean)
    .join(" ")
    .trim();
  const address =
    feature.properties?.address?.trim() ||
    streetAddress ||
    feature.place_name.split(",")[0]?.trim() ||
    "";

  return {
    address,
    city,
    neighborhood: neighborhood === city ? "" : neighborhood,
    postalCode: postcode?.text ?? "",
    country: normalizedCountryCode(
      country?.short_code ?? feature.properties?.short_code,
    ),
    coordinates: { lat, lng },
    displayName: feature.place_name.trim() || [address, city].join(", "),
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
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) return [];
  if (normalizedQuery.length > 256) {
    throw new Error("Address search is too long.");
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedQuery)}.json`,
  );
  url.searchParams.set("access_token", mapboxToken());
  url.searchParams.set("limit", "5");
  url.searchParams.set("country", "mk");
  url.searchParams.set("language", "mk,en");
  url.searchParams.set("types", "address,place,locality,neighborhood");

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Address search failed.");
  return mapboxFeatures(await response.json());
}

export async function reverseGeocodeMapbox(
  coordinates: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<BusinessLocation | null> {
  if (
    !Number.isFinite(coordinates.lat) ||
    !Number.isFinite(coordinates.lng) ||
    Math.abs(coordinates.lat) > 90 ||
    Math.abs(coordinates.lng) > 180
  ) {
    throw new Error("Map coordinates are invalid.");
  }
  if (!isCoordinateInNorthMacedonia(coordinates)) {
    throw new Error("Map location must be in North Macedonia.");
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json`,
  );
  url.searchParams.set("access_token", mapboxToken());
  url.searchParams.set("limit", "1");
  url.searchParams.set("country", "mk");
  url.searchParams.set("language", "mk,en");

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Map location could not be resolved.");
  const feature = mapboxFeatures(await response.json())[0];
  return feature ? parseMapboxFeature(feature) : null;
}
