// Centroid coordinates for major Macedonian cities.
// Used to resolve browser lat/lng to a city string for
// Convex vectorIndex filtering.

export type MKCity = {
  name: string;
  lat: number;
  lng: number;
};

export const MK_CITIES: MKCity[] = [
  { name: "Skopje",   lat: 41.9965, lng: 21.4314 },
  { name: "Bitola",   lat: 41.0297, lng: 21.3294 },
  { name: "Ohrid",    lat: 41.1231, lng: 20.8016 },
  { name: "Tetovo",   lat: 41.9998, lng: 20.9716 },
  { name: "Kumanovo", lat: 42.1322, lng: 21.7144 },
  { name: "Veles",    lat: 41.7157, lng: 21.7756 },
  { name: "Štip",     lat: 41.7459, lng: 22.1984 },
  { name: "Strumica", lat: 41.4378, lng: 22.6428 },
  { name: "Prilep",   lat: 41.3450, lng: 21.5522 },
  { name: "Kičevo",   lat: 41.5095, lng: 20.9603 },
];

function haversineKm(a: MKCity, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function resolveCityFromCoords(coords: {
  lat: number;
  lng: number;
}): string | null {
  let best = MK_CITIES[0];
  let bestDist = haversineKm(best, coords);
  for (const city of MK_CITIES.slice(1)) {
    const d = haversineKm(city, coords);
    if (d < bestDist) {
      best = city;
      bestDist = d;
    }
  }
  // If more than 50 km from any known city centroid, user is outside service area
  return bestDist < 50 ? best.name : null;
}
