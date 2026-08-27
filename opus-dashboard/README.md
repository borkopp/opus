# OPUS Dashboard

The dashboard is the business-facing surface for the current beauty appointment product in Macedonia. It covers onboarding, services, staff, availability, customers, the calendar, and appointment lifecycle management.

Read the repository-wide [product scope](../docs/PRODUCT_SCOPE.md) before product work. Hospitality and P2 features remain dormant; the Expo/React Native and SwiftUI applications come last and are outside the current web phase.

## Development

```bash
npm install
npm run dev
```

The combined command starts Next.js on port 3000 and the shared Convex backend on port 3210. Use `npm run dev:frontend` or `npm run dev:backend` to run one side only.

## Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

The shared backend lives in `convex/`. Preserve tenant isolation, soft deletes, audit logging, integer minor-unit money values, and mutation-level booking conflict checks.
