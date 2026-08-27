# OPUS Marketplace

`opus-mk` is the active public web surface for discovering beauty and wellness studios in Macedonia, viewing a studio profile, and booking an appointment as a guest.

Read the repository-wide [product scope](../docs/PRODUCT_SCOPE.md) before product work. Hospitality must remain excluded from public discovery, profiles, search, and booking even when legacy records exist in the shared backend. Native Expo/React Native and SwiftUI clients come last and are outside the current web phase.

## Development

Start the Convex backend from `opus-dashboard/`, then run:

```bash
npm install
npm run dev
```

The marketplace runs on port 3001.

## Checks

```bash
npm run lint
npm run build
```

This package uses Next.js 16. Read the relevant bundled guide in `node_modules/next/dist/docs/` before changing framework-specific behavior.
