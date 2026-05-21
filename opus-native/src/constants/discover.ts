/** Discover layout tokens (aligned with opus-mk-ios `OpusTheme`). */
export const DiscoverLayout = {
  coverCardWidth: 220,
  coverCardHeight: 275,
} as const;

export const DiscoverColors = {
  accent: '#E16349',
  accent2: 'rgba(225, 125, 97, 0.9)',
  rating: '#FFD173',
  success: '#3ECF8E',
  cardOverlay: 'rgba(0, 0, 0, 0.45)',
} as const;

/** Default marketplace city until geolocation is wired up (matches iOS app). */
export const DEFAULT_DISCOVER_CITY = 'Skopje';
