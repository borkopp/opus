/** Tab icons aligned with opus-mk-ios RootView (sparkle + safari). */

export const TabIcons = {
  ask: {
    sf: { default: 'sparkle', selected: 'sparkle' },
    md: { default: 'auto_awesome', selected: 'auto_awesome' },
    symbol: {
      ios: 'sparkle',
      android: 'auto_awesome',
      web: 'auto_awesome',
    },
  },
  discover: {
    sf: { default: 'safari', selected: 'safari.fill' },
    md: { default: 'explore', selected: 'explore' },
    symbol: {
      ios: 'safari',
      android: 'explore',
      web: 'explore',
    },
  },
} as const;
