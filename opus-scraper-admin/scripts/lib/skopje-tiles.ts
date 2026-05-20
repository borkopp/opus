// ~16 tile centres covering Greater Skopje at 1.5 km radius.
// Chosen to overlap slightly and ensure no gap in the dense city core.
export const SKOPJE_TILES: Array<{ lat: number; lng: number; label: string }> = [
  // Old Town / Čaršija
  { lat: 41.9981, lng: 21.4335, label: "Stara Čaršija" },
  // City centre
  { lat: 41.9965, lng: 21.4314, label: "Centar" },
  // Karposh 1-2
  { lat: 41.9950, lng: 21.4100, label: "Karpош 1-2" },
  // Karposh 3-4
  { lat: 41.9880, lng: 21.3850, label: "Karpоš 3-4" },
  // Aerodrom
  { lat: 41.9780, lng: 21.4350, label: "Aerodrom" },
  // Gazi Baba / Gjorche Petrov
  { lat: 41.9940, lng: 21.4600, label: "Gazi Baba" },
  // Kisela Voda
  { lat: 41.9730, lng: 21.4150, label: "Kisela Voda" },
  // Chair / Shuto Orizari
  { lat: 42.0100, lng: 21.4450, label: "Chair" },
  // Butel
  { lat: 42.0200, lng: 21.4350, label: "Butel" },
  // Saraj
  { lat: 41.9920, lng: 21.3600, label: "Saraj" },
  // Vizbegovo / Volkovo
  { lat: 42.0050, lng: 21.4000, label: "Vizbegovo" },
  // City Mall / Srebrna Plocha area
  { lat: 41.9860, lng: 21.4250, label: "City Mall area" },
  // Vodno foothills (restaurants with views)
  { lat: 41.9750, lng: 21.4050, label: "Vodno" },
  // Drachevo
  { lat: 41.9600, lng: 21.4400, label: "Drachevo" },
  // Ilinden
  { lat: 41.9980, lng: 21.5000, label: "Ilinden" },
  // Studenichani road
  { lat: 41.9500, lng: 21.3900, label: "Studenichani" },
];

export const SEARCH_RADIUS_METERS = 1500;
